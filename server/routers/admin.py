"""管理后台路由。

所有写操作都会写审计日志；删除采用软删除或级联限制，
避免误删导致历史统计断裂。
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, or_, select

from ..config import settings
from ..deps import AdminUser, DbSession, PageQuery, client_ip, write_audit
from ..models import (
    Announcement,
    AuditLog,
    Chapter,
    Comment,
    JudgeQueue,
    Problem,
    Progress,
    Stage,
    Submission,
    SystemConfig,
    TestCase,
    User,
)
from ..schemas import (
    AnnouncementIn,
    AnnouncementOut,
    AuditLogOut,
    ChapterIn,
    ChapterOut,
    ConfigIn,
    ConfigOut,
    Msg,
    Page,
    ProblemIn,
    ProblemOut,
    SystemOverviewOut,
    TestCaseIn,
    TestCaseOut,
    UserOut,
)

router = APIRouter(prefix="/api/admin", tags=["管理后台"])

_START_TIME = datetime.now(timezone.utc)


# ---------------------------------------------------------------------
# 系统概览
# ---------------------------------------------------------------------


@router.get("/overview", response_model=SystemOverviewOut, summary="系统概览")
def overview(db: DbSession, admin: AdminUser) -> SystemOverviewOut:
    today = datetime.now(timezone.utc).date()
    today_start = datetime.combine(today, datetime.min.time())

    users_total = db.scalar(select(func.count(User.id))) or 0
    active_today = db.scalar(
        select(func.count(User.id)).where(User.last_login_at >= today_start)
    ) or 0
    subs_total = db.scalar(select(func.count(Submission.id))) or 0
    subs_today = db.scalar(
        select(func.count(Submission.id)).where(Submission.created_at >= today_start)
    ) or 0
    acc = db.scalar(
        select(func.count(Submission.id)).where(Submission.status == "accepted")
    ) or 0

    db_size = 0
    if settings.is_sqlite:
        path = settings.database_url.replace("sqlite:///", "")
        if os.path.exists(path):
            db_size = os.path.getsize(path) // 1024

    return SystemOverviewOut(
        users_total=users_total,
        users_active_today=active_today,
        chapters_total=db.scalar(select(func.count(Chapter.id))) or 0,
        problems_total=db.scalar(select(func.count(Problem.id))) or 0,
        submissions_total=subs_total,
        submissions_today=subs_today,
        accept_rate=round(acc * 100.0 / subs_total, 1) if subs_total else 0.0,
        judge_queue=db.scalar(
            select(func.count(JudgeQueue.id)).where(JudgeQueue.status.in_(["waiting", "running"]))
        ) or 0,
        db_size_kb=db_size,
        uptime_seconds=int((datetime.now(timezone.utc) - _START_TIME).total_seconds()),
    )


# ---------------------------------------------------------------------
# 用户管理
# ---------------------------------------------------------------------


@router.get("/users", response_model=Page[UserOut], summary="用户列表")
def list_users(
    db: DbSession,
    admin: AdminUser,
    pg: PageQuery,
    q: str | None = Query(default=None, description="用户名/邮箱模糊搜索"),
    role: str | None = Query(default=None),
) -> Page[UserOut]:
    stmt = select(User)
    if q:
        kw = "%%%s%%" % q.strip()
        stmt = stmt.where(or_(User.username.like(kw), User.email.like(kw), User.display_name.like(kw)))
    if role:
        stmt = stmt.where(User.role == role)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(User.id.desc()).offset(pg.offset).limit(pg.limit)).all()
    return Page(items=[UserOut.model_validate(u) for u in rows], total=total, page=pg.page, size=pg.size)


@router.patch("/users/{user_id}", response_model=UserOut, summary="修改用户角色或状态")
def update_user(
    user_id: int,
    payload: dict,
    request: Request,
    db: DbSession,
    admin: AdminUser,
) -> UserOut:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    if "role" in payload:
        role = payload["role"]
        if role not in ("student", "admin"):
            raise HTTPException(status_code=400, detail="角色取值只能是 student / admin")
        if user.id == admin.id and role != "admin":
            raise HTTPException(status_code=400, detail="不能取消自己的管理员权限")
        user.role = role

    if "is_active" in payload:
        if user.id == admin.id and not payload["is_active"]:
            raise HTTPException(status_code=400, detail="不能停用自己的账号")
        user.is_active = bool(payload["is_active"])

    if "display_name" in payload:
        user.display_name = str(payload["display_name"])[:64]

    write_audit(db, admin, "user.update", "user", user.id, str(payload), client_ip(request))
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/users/{user_id}/reset-progress", response_model=Msg, summary="清空某用户进度")
def reset_user_progress(user_id: int, request: Request, db: DbSession, admin: AdminUser) -> Msg:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    deleted = db.query(Progress).filter(Progress.user_id == user_id).delete()
    write_audit(db, admin, "user.reset_progress", "user", user_id, "删除 %d 条进度" % deleted, client_ip(request))
    db.commit()
    return Msg(message="已清空 %d 条学习进度" % deleted)


# ---------------------------------------------------------------------
# 章节管理
# ---------------------------------------------------------------------


@router.get("/chapters", response_model=list[ChapterOut], summary="全部章节（含未发布）")
def admin_chapters(db: DbSession, staff: AdminUser) -> list[ChapterOut]:
    rows = db.scalars(select(Chapter).order_by(Chapter.stage_code, Chapter.order_no)).all()
    out = []
    for c in rows:
        item = ChapterOut.model_validate(c)
        item.quiz_count = c.quiz_count
        item.code_count = c.code_count
        out.append(item)
    return out


@router.post("/chapters", response_model=ChapterOut, summary="新建章节")
def create_chapter(payload: ChapterIn, request: Request, db: DbSession, staff: AdminUser) -> ChapterOut:
    stage = db.scalar(select(Stage).where(Stage.code == payload.stage_code))
    if not stage:
        raise HTTPException(status_code=400, detail="阶段不存在，请先建阶段")

    c = Chapter(**payload.model_dump())
    db.add(c)
    db.flush()
    write_audit(db, staff, "chapter.create", "chapter", c.id, c.title, client_ip(request))
    db.commit()
    db.refresh(c)
    return ChapterOut.model_validate(c)


@router.put("/chapters/{chapter_id}", response_model=ChapterOut, summary="编辑章节")
def update_chapter(
    chapter_id: int, payload: ChapterIn, request: Request, db: DbSession, staff: AdminUser
) -> ChapterOut:
    c = db.get(Chapter, chapter_id)
    if not c:
        raise HTTPException(status_code=404, detail="章节不存在")
    for k, v in payload.model_dump().items():
        setattr(c, k, v)
    write_audit(db, staff, "chapter.update", "chapter", c.id, c.title, client_ip(request))
    db.commit()
    db.refresh(c)
    return ChapterOut.model_validate(c)


@router.delete("/chapters/{chapter_id}", response_model=Msg, summary="删除章节")
def delete_chapter(chapter_id: int, request: Request, db: DbSession, admin: AdminUser) -> Msg:
    c = db.get(Chapter, chapter_id)
    if not c:
        raise HTTPException(status_code=404, detail="章节不存在")
    title = c.title
    db.delete(c)
    write_audit(db, admin, "chapter.delete", "chapter", chapter_id, title, client_ip(request))
    db.commit()
    return Msg(message="已删除《%s》" % title)


# ---------------------------------------------------------------------
# 题目管理
# ---------------------------------------------------------------------


@router.post("/problems", response_model=ProblemOut, summary="新建题目")
def create_problem(payload: ProblemIn, request: Request, db: DbSession, staff: AdminUser) -> ProblemOut:
    p = Problem(**payload.model_dump())
    db.add(p)
    db.flush()
    write_audit(db, staff, "problem.create", "problem", p.id, p.title, client_ip(request))
    db.commit()
    db.refresh(p)
    return ProblemOut.model_validate(p)


@router.put("/problems/{problem_id}", response_model=ProblemOut, summary="编辑题目")
def update_problem(
    problem_id: int, payload: ProblemIn, request: Request, db: DbSession, staff: AdminUser
) -> ProblemOut:
    p = db.get(Problem, problem_id)
    if not p:
        raise HTTPException(status_code=404, detail="题目不存在")
    for k, v in payload.model_dump().items():
        setattr(p, k, v)
    write_audit(db, staff, "problem.update", "problem", p.id, p.title, client_ip(request))
    db.commit()
    db.refresh(p)
    return ProblemOut.model_validate(p)


@router.delete("/problems/{problem_id}", response_model=Msg, summary="删除题目")
def delete_problem(problem_id: int, request: Request, db: DbSession, admin: AdminUser) -> Msg:
    p = db.get(Problem, problem_id)
    if not p:
        raise HTTPException(status_code=404, detail="题目不存在")
    title = p.title
    db.delete(p)
    write_audit(db, admin, "problem.delete", "problem", problem_id, title, client_ip(request))
    db.commit()
    return Msg(message="已删除《%s》" % title)


# ---------------------------------------------------------------------
# 测试点管理
# ---------------------------------------------------------------------


@router.get("/problems/{problem_id}/testcases", response_model=list[TestCaseOut], summary="题目测试点")
def list_testcases(problem_id: int, db: DbSession, staff: AdminUser) -> list[TestCaseOut]:
    rows = db.scalars(
        select(TestCase).where(TestCase.problem_id == problem_id).order_by(TestCase.order_no)
    ).all()
    return [TestCaseOut.model_validate(t) for t in rows]


@router.post("/problems/{problem_id}/testcases", response_model=list[TestCaseOut], summary="批量保存测试点")
def save_testcases(
    problem_id: int,
    items: list[TestCaseIn],
    request: Request,
    db: DbSession,
    staff: AdminUser,
) -> list[TestCaseOut]:
    problem = db.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="题目不存在")
    if len(items) > 200:
        raise HTTPException(status_code=400, detail="单题测试点不能超过 200 个")

    # 全量覆盖：先删后建，保证顺序与前端一致
    db.query(TestCase).filter(TestCase.problem_id == problem_id).delete()
    created = []
    for idx, item in enumerate(items, start=1):
        t = TestCase(
            problem_id=problem_id,
            order_no=idx,
            input_data=item.input_data,
            expected_output=item.expected_output,
            score=item.score,
            is_sample=item.is_sample,
            explanation=item.explanation,
        )
        db.add(t)
        created.append(t)

    write_audit(db, staff, "testcase.save", "problem", problem_id, "%d 个测试点" % len(created), client_ip(request))
    db.commit()
    for t in created:
        db.refresh(t)
    return [TestCaseOut.model_validate(t) for t in created]


# ---------------------------------------------------------------------
# 公告与配置
# ---------------------------------------------------------------------


@router.get("/announcements", response_model=list[AnnouncementOut], summary="公告列表")
def list_announcements(db: DbSession, staff: AdminUser) -> list[AnnouncementOut]:
    rows = db.scalars(select(Announcement).order_by(Announcement.id.desc())).all()
    return [AnnouncementOut.model_validate(a) for a in rows]


@router.post("/announcements", response_model=AnnouncementOut, summary="发布公告")
def create_announcement(payload: AnnouncementIn, db: DbSession, staff: AdminUser) -> AnnouncementOut:
    a = Announcement(**payload.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return AnnouncementOut.model_validate(a)


@router.delete("/announcements/{aid}", response_model=Msg, summary="删除公告")
def delete_announcement(aid: int, db: DbSession, admin: AdminUser) -> Msg:
    a = db.get(Announcement, aid)
    if not a:
        raise HTTPException(status_code=404, detail="公告不存在")
    db.delete(a)
    db.commit()
    return Msg(message="已删除")


@router.get("/configs", response_model=list[ConfigOut], summary="系统配置")
def list_configs(db: DbSession, admin: AdminUser) -> list[ConfigOut]:
    rows = db.scalars(select(SystemConfig).order_by(SystemConfig.key)).all()
    return [ConfigOut.model_validate(c) for c in rows]


@router.post("/configs", response_model=ConfigOut, summary="写入配置")
def upsert_config(payload: ConfigIn, db: DbSession, admin: AdminUser) -> ConfigOut:
    c = db.scalar(select(SystemConfig).where(SystemConfig.key == payload.key))
    if c:
        c.value = payload.value
        if payload.description:
            c.description = payload.description
    else:
        c = SystemConfig(**payload.model_dump())
        db.add(c)
    db.commit()
    db.refresh(c)
    return ConfigOut.model_validate(c)


# ---------------------------------------------------------------------
# 审计日志
# ---------------------------------------------------------------------


@router.get("/audit-logs", response_model=Page[AuditLogOut], summary="操作日志")
def audit_logs(
    db: DbSession,
    admin: AdminUser,
    pg: PageQuery,
    action: str | None = None,
    username: str | None = None,
) -> Page[AuditLogOut]:
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action.like("%%%s%%" % action))
    if username:
        stmt = stmt.where(AuditLog.username.like("%%%s%%" % username))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(AuditLog.id.desc()).offset(pg.offset).limit(pg.limit)).all()
    return Page(items=[AuditLogOut.model_validate(a) for a in rows], total=total, page=pg.page, size=pg.size)


# ---------------------------------------------------------------------
# 评论管理
# ---------------------------------------------------------------------


@router.get("/comments", response_model=Page[dict], summary="全部评论")
def all_comments(db: DbSession, staff: AdminUser, pg: PageQuery) -> Page[dict]:
    stmt = select(Comment).where(Comment.is_deleted.is_(False))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Comment.id.desc()).offset(pg.offset).limit(pg.limit)).all()

    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_([r.user_id for r in rows]))).all()}
    items = [
        {
            "id": c.id,
            "problem_id": c.problem_id,
            "username": users[c.user_id].username if c.user_id in users else "已注销",
            "content": c.content[:200],
            "kind": c.kind,
            "likes": c.likes,
            "created_at": c.created_at.isoformat(),
        }
        for c in rows
    ]
    return Page(items=items, total=total, page=pg.page, size=pg.size)


@router.delete("/comments/{comment_id}", response_model=Msg, summary="管理员删除评论")
def admin_delete_comment(comment_id: int, request: Request, db: DbSession, staff: AdminUser) -> Msg:
    c = db.get(Comment, comment_id)
    if not c:
        raise HTTPException(status_code=404, detail="评论不存在")
    c.is_deleted = True
    write_audit(db, staff, "comment.delete", "comment", comment_id, c.content[:100], client_ip(request))
    db.commit()
    return Msg(message="已删除")


@router.post("/comments/{comment_id}/pin", response_model=Msg, summary="置顶评论")
def pin_comment(comment_id: int, db: DbSession, staff: AdminUser) -> Msg:
    c = db.get(Comment, comment_id)
    if not c:
        raise HTTPException(status_code=404, detail="评论不存在")
    c.is_pinned = not c.is_pinned
    db.commit()
    return Msg(message="已置顶" if c.is_pinned else "已取消置顶")
