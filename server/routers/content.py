"""知识内容路由：阶段、章节、题目。

列表接口都支持匿名访问（未登录时进度字段为空），
这样分享链接给别人也能直接看，符合开源仓库的使用场景。
"""

from __future__ import annotations

import random

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, or_, select

from ..deps import DbSession, OptionalUser, PageQuery
from ..models import Bookmark, Chapter, Problem, Progress, Stage, Submission, TestCase, User
from ..schemas import (
    ChapterBrief,
    ChapterOut,
    Msg,
    Page,
    ProblemBrief,
    ProblemOut,
    StageOut,
    TestCaseOut,
)

router = APIRouter(prefix="/api", tags=["知识内容"])


# ---------------------------------------------------------------------
# 阶段
# ---------------------------------------------------------------------


@router.get("/stages", response_model=list[StageOut], summary="全部学习阶段")
def list_stages(db: DbSession, user: OptionalUser) -> list[StageOut]:
    stages = db.scalars(select(Stage).order_by(Stage.order_no)).all()

    # 一次性统计每个阶段的章节数
    totals = dict(
        db.execute(
            select(Chapter.stage_code, func.count(Chapter.id))
            .where(Chapter.is_published.is_(True))
            .group_by(Chapter.stage_code)
        ).all()
    )

    done_map: dict[str, int] = {}
    if user:
        done_map = dict(
            db.execute(
                select(Chapter.stage_code, func.count(Progress.id))
                .join(Progress, Progress.chapter_id == Chapter.id)
                .where(Progress.user_id == user.id, Progress.status == "done")
                .group_by(Chapter.stage_code)
            ).all()
        )

    out = []
    for s in stages:
        item = StageOut.model_validate(s)
        item.chapter_count = totals.get(s.code, 0)
        item.done_count = done_map.get(s.code, 0)
        out.append(item)
    return out


# ---------------------------------------------------------------------
# 章节
# ---------------------------------------------------------------------


@router.get("/chapters", response_model=list[ChapterBrief], summary="章节目录")
def list_chapters(
    db: DbSession,
    user: OptionalUser,
    stage: str | None = Query(default=None, description="按阶段代码过滤，如 03"),
    q: str | None = Query(default=None, description="标题模糊搜索"),
) -> list[ChapterBrief]:
    stmt = select(Chapter).where(Chapter.is_published.is_(True))
    if stage:
        stmt = stmt.where(Chapter.stage_code == stage)
    if q:
        kw = "%%%s%%" % q.strip()
        stmt = stmt.where(or_(Chapter.title.like(kw), Chapter.subtitle.like(kw)))
    chapters = db.scalars(stmt.order_by(Chapter.stage_code, Chapter.order_no)).all()

    out = []
    for c in chapters:
        item = ChapterBrief.model_validate(c)
        item.quiz_count = c.quiz_count
        item.code_count = c.code_count
        out.append(item)
    return out


@router.get("/chapters/{chapter_id}", response_model=ChapterOut, summary="章节详情")
def get_chapter(chapter_id: int, db: DbSession) -> ChapterOut:
    chapter = db.get(Chapter, chapter_id)
    if not chapter or not chapter.is_published:
        raise HTTPException(status_code=404, detail="章节不存在")
    item = ChapterOut.model_validate(chapter)
    item.quiz_count = chapter.quiz_count
    item.code_count = chapter.code_count
    return item


@router.get("/chapters/{chapter_id}/neighbors", summary="上下章节")
def chapter_neighbors(chapter_id: int, db: DbSession) -> dict:
    """给章节页底部的「上一节 / 下一节」用。"""
    cur = db.get(Chapter, chapter_id)
    if not cur:
        raise HTTPException(status_code=404, detail="章节不存在")

    all_ch = db.scalars(
        select(Chapter).where(Chapter.is_published.is_(True)).order_by(Chapter.stage_code, Chapter.order_no)
    ).all()
    ids = [c.id for c in all_ch]
    try:
        idx = ids.index(chapter_id)
    except ValueError:
        return {"prev": None, "next": None}

    def brief(c: Chapter | None) -> dict | None:
        if not c:
            return None
        return {"id": c.id, "title": c.title, "stage_code": c.stage_code}

    return {
        "prev": brief(all_ch[idx - 1] if idx > 0 else None),
        "next": brief(all_ch[idx + 1] if idx + 1 < len(all_ch) else None),
    }


# ---------------------------------------------------------------------
# 题目
# ---------------------------------------------------------------------


@router.get("/problems/groups", summary="题组概览")
def problem_groups(db: DbSession, user: OptionalUser) -> list[dict]:
    rows = db.execute(
        select(Problem.group_name, func.count(Problem.id))
        .where(Problem.is_published.is_(True))
        .group_by(Problem.group_name)
    ).all()

    solved: dict[str, int] = {}
    if user:
        solved = dict(
            db.execute(
                select(Problem.group_name, func.count(func.distinct(Submission.problem_id)))
                .join(Submission, Submission.problem_id == Problem.id)
                .where(Submission.user_id == user.id, Submission.status == "accepted")
                .group_by(Problem.group_name)
            ).all()
        )

    out = [
        {
            "group_name": g,
            "total": n,
            "solved": solved.get(g, 0),
            "percent": round(solved.get(g, 0) * 100.0 / n, 1) if n else 0.0,
        }
        for g, n in rows
    ]
    out.sort(key=lambda x: x["group_name"])
    return out


def _user_problem_flags(db, user: User | None, problem_ids: list[int]) -> dict[int, tuple[bool, bool]]:
    """返回 {problem_id: (已通过, 提交过)}，一次查询搞定，避免 N+1。"""
    if not user or not problem_ids:
        return {}
    rows = db.execute(
        select(Submission.problem_id, func.count(Submission.id))
        .where(Submission.user_id == user.id, Submission.problem_id.in_(problem_ids))
        .group_by(Submission.problem_id)
    ).all()
    attempted = {pid: True for pid, _ in rows}

    accepted_ids = set(
        db.scalars(
            select(Submission.problem_id).where(
                Submission.user_id == user.id,
                Submission.problem_id.in_(problem_ids),
                Submission.status == "accepted",
            )
        ).all()
    )
    return {pid: (pid in accepted_ids, attempted.get(pid, False)) for pid in problem_ids}


@router.get("/problems", response_model=Page[ProblemBrief], summary="题目列表")
def list_problems(
    db: DbSession,
    user: OptionalUser,
    pg: PageQuery,
    group: str | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    chapter: int | None = Query(default=None, description="只看某章节关联的题"),
    q: str | None = Query(default=None, description="标题模糊搜索"),
    only: str | None = Query(default=None, description="solved / unsolved / wrong"),
) -> Page[ProblemBrief]:
    stmt = select(Problem).where(Problem.is_published.is_(True))
    if group:
        stmt = stmt.where(Problem.group_name == group)
    if difficulty:
        stmt = stmt.where(Problem.difficulty == difficulty)
    if chapter:
        stmt = stmt.where(Problem.ref_chapter == chapter)
    if q:
        kw = "%%%s%%" % q.strip()
        stmt = stmt.where(or_(Problem.title.like(kw), Problem.description.like(kw)))

    # 按用户状态过滤需要子查询
    if only and user:
        accepted = select(Submission.problem_id).where(
            Submission.user_id == user.id, Submission.status == "accepted"
        )
        attempted = select(Submission.problem_id).where(Submission.user_id == user.id)
        if only == "solved":
            stmt = stmt.where(Problem.id.in_(accepted))
        elif only == "unsolved":
            stmt = stmt.where(Problem.id.notin_(accepted))
        elif only == "wrong":
            stmt = stmt.where(Problem.id.in_(attempted), Problem.id.notin_(accepted))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Problem.id).offset(pg.offset).limit(pg.limit)).all()

    flags = _user_problem_flags(db, user, [p.id for p in rows])
    items = []
    for p in rows:
        item = ProblemBrief.model_validate(p)
        accepted, attempted = flags.get(p.id, (False, False))
        item.accepted = accepted
        item.attempted = attempted
        items.append(item)

    # tag 过滤放在内存里做：标签是 JSON 数组，SQL 里过滤各数据库语法不统一
    if tag:
        items = [i for i in items if tag in (i.tags or [])]
        total = len(items)

    return Page(items=items, total=total, page=pg.page, size=pg.size)


@router.get("/problems/random", response_model=list[ProblemBrief], summary="随机组卷")
def random_problems(
    db: DbSession,
    count: int = Query(default=5, ge=1, le=20),
    group: str | None = None,
    difficulty: str | None = None,
) -> list[ProblemBrief]:
    stmt = select(Problem.id).where(Problem.is_published.is_(True))
    if group:
        stmt = stmt.where(Problem.group_name == group)
    if difficulty:
        stmt = stmt.where(Problem.difficulty == difficulty)
    ids = list(db.scalars(stmt).all())
    if not ids:
        return []
    picked = random.sample(ids, min(count, len(ids)))
    problems = db.scalars(select(Problem).where(Problem.id.in_(picked)).order_by(Problem.id)).all()
    return [ProblemBrief.model_validate(p) for p in problems]


@router.get("/problems/{problem_id}", response_model=ProblemOut, summary="题目详情")
def get_problem(problem_id: int, db: DbSession, user: OptionalUser) -> ProblemOut:
    p = db.get(Problem, problem_id)
    if not p or (not p.is_published and not (user and user.is_staff)):
        raise HTTPException(status_code=404, detail="题目不存在")

    item = ProblemOut.model_validate(p)
    item.accept_rate = p.accept_rate

    # 只返回样例测试点，隐藏测试点的输入输出绝不出库
    samples = db.scalars(
        select(TestCase).where(TestCase.problem_id == p.id, TestCase.is_sample.is_(True)).order_by(TestCase.order_no)
    ).all()
    if samples:
        item.samples_detail = [TestCaseOut.model_validate(t) for t in samples]

    flags = _user_problem_flags(db, user, [p.id])
    accepted, attempted = flags.get(p.id, (False, False))
    item.accepted = accepted
    item.attempted = attempted
    return item


@router.post("/problems/{problem_id}/bookmark", response_model=Msg, summary="收藏/取消收藏")
def toggle_bookmark(problem_id: int, db: DbSession, user: OptionalUser) -> Msg:
    if not user:
        raise HTTPException(status_code=401, detail="登录后才能收藏")
    if not db.get(Problem, problem_id):
        raise HTTPException(status_code=404, detail="题目不存在")

    bm = db.scalar(select(Bookmark).where(Bookmark.user_id == user.id, Bookmark.problem_id == problem_id))
    if bm:
        db.delete(bm)
        db.commit()
        return Msg(message="已取消收藏")
    db.add(Bookmark(user_id=user.id, problem_id=problem_id))
    db.commit()
    return Msg(message="已收藏")


@router.get("/bookmarks", response_model=list[ProblemBrief], summary="我的收藏")
def my_bookmarks(db: DbSession, user: OptionalUser) -> list[ProblemBrief]:
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")
    problems = db.scalars(
        select(Problem)
        .join(Bookmark, Bookmark.problem_id == Problem.id)
        .where(Bookmark.user_id == user.id)
        .order_by(Bookmark.created_at.desc())
    ).all()
    return [ProblemBrief.model_validate(p) for p in problems]
