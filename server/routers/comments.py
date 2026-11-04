"""社区路由：题解、讨论、点赞。

内容审核只做基础的正则过滤（外链、联系方式、敏感词），
真正的审核要靠后台人工。个人项目这么做够用了。
"""

from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..deps import CurrentUser, DbSession, OptionalUser, PageQuery
from ..models import Comment, CommentLike, Problem, Submission, User
from ..schemas import CommentIn, CommentOut, Msg, Page, UserBrief

router = APIRouter(prefix="/api/comments", tags=["题解讨论"])

# 简单的内容过滤：联系方式、拉群、付费推广
_BANNED_PATTERNS = [
    r"加\s*(微信|weixin|vx|v信)",
    r"(qq|扣扣)\s*[:：]?\s*\d{6,}",
    r"(代写|代做|接单)",
    r"(付费|收费).{0,6}(题解|答案)",
    r"https?://[^\s]{4,}",
]


def _check_content(text: str) -> str:
    text = (text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="内容不能为空")
    if len(text) > 8000:
        raise HTTPException(status_code=400, detail="内容太长，请控制在 8000 字以内")
    for pat in _BANNED_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            raise HTTPException(status_code=400, detail="内容包含不允许的信息（外链 / 联系方式 / 广告）")
    return text


def _to_out(db: Session, c: Comment, viewer: User | None, depth: int = 0) -> CommentOut:
    liked = False
    if viewer:
        liked = db.scalar(
            select(func.count(CommentLike.id)).where(
                CommentLike.comment_id == c.id, CommentLike.user_id == viewer.id
            )
        ) or False
    item = CommentOut(
        id=c.id,
        problem_id=c.problem_id,
        parent_id=c.parent_id,
        content=c.content,
        kind=c.kind,
        likes=c.likes,
        is_pinned=c.is_pinned,
        created_at=c.created_at,
        user=UserBrief.model_validate(c.user),
        liked=bool(liked),
        replies=[],
    )
    # 只展开两层，防止极端嵌套拖慢响应
    if depth < 1:
        children = db.scalars(
            select(Comment)
            .where(Comment.parent_id == c.id, Comment.is_deleted.is_(False))
            .order_by(Comment.created_at)
            .limit(50)
        ).all()
        item.replies = [_to_out(db, ch, viewer, depth + 1) for ch in children]
    return item


@router.get("", response_model=Page[CommentOut], summary="某题的讨论列表")
def list_comments(
    db: DbSession,
    user: OptionalUser,
    pg: PageQuery,
    problem_id: int = Query(..., description="题目 ID"),
    kind: str | None = Query(default=None, description="solution / discuss"),
) -> Page[CommentOut]:
    stmt = select(Comment).where(
        Comment.problem_id == problem_id,
        Comment.parent_id.is_(None),
        Comment.is_deleted.is_(False),
    )
    if kind:
        stmt = stmt.where(Comment.kind == kind)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(Comment.is_pinned.desc(), Comment.created_at.desc())
        .offset(pg.offset)
        .limit(pg.limit)
    ).all()

    return Page(items=[_to_out(db, c, user) for c in rows], total=total, page=pg.page, size=pg.size)


@router.post("", response_model=CommentOut, summary="发表讨论或题解")
def create_comment(payload: CommentIn, db: DbSession, user: CurrentUser) -> CommentOut:
    problem = db.get(Problem, payload.problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="题目不存在")

    content = _check_content(payload.content)

    if payload.parent_id:
        parent = db.get(Comment, payload.parent_id)
        if not parent or parent.problem_id != payload.problem_id:
            raise HTTPException(status_code=400, detail="回复的评论不存在")

    # 发题解要求先通过这道题，避免没做出来就发"题解"
    if payload.kind == "solution":
        passed = db.scalar(
            select(func.count(Submission.id)).where(
                Submission.user_id == user.id,
                Submission.problem_id == payload.problem_id,
                Submission.status == "accepted",
            )
        )
        if not passed:
            raise HTTPException(status_code=403, detail="通过这道题之后才能发布题解")

    c = Comment(
        problem_id=payload.problem_id,
        user_id=user.id,
        parent_id=payload.parent_id,
        content=content,
        kind=payload.kind,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _to_out(db, c, user)


@router.post("/{comment_id}/like", response_model=Msg, summary="点赞 / 取消点赞")
def toggle_like(comment_id: int, db: DbSession, user: CurrentUser) -> Msg:
    c = db.get(Comment, comment_id)
    if not c or c.is_deleted:
        raise HTTPException(status_code=404, detail="评论不存在")

    existing = db.scalar(
        select(CommentLike).where(CommentLike.comment_id == comment_id, CommentLike.user_id == user.id)
    )
    if existing:
        db.delete(existing)
        c.likes = max(0, (c.likes or 0) - 1)
        db.commit()
        return Msg(message="已取消点赞")

    db.add(CommentLike(comment_id=comment_id, user_id=user.id))
    c.likes = (c.likes or 0) + 1
    db.commit()
    return Msg(message="已点赞")


@router.delete("/{comment_id}", response_model=Msg, summary="删除评论")
def delete_comment(comment_id: int, db: DbSession, user: CurrentUser) -> Msg:
    c = db.get(Comment, comment_id)
    if not c:
        raise HTTPException(status_code=404, detail="评论不存在")
    if c.user_id != user.id and not user.is_staff:
        raise HTTPException(status_code=403, detail="只能删除自己的评论")
    c.is_deleted = True
    db.commit()
    return Msg(message="已删除")


@router.get("/mine", response_model=list[CommentOut], summary="我发表的讨论")
def my_comments(
    db: DbSession,
    user: CurrentUser,
    limit: int = Query(default=20, ge=1, le=100),
) -> list[CommentOut]:
    rows = db.scalars(
        select(Comment)
        .where(Comment.user_id == user.id, Comment.is_deleted.is_(False))
        .order_by(Comment.created_at.desc())
        .limit(limit)
    ).all()
    return [_to_out(db, c, user) for c in rows]
