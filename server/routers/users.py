"""用户公开资料路由。

只暴露展示需要的字段，邮箱做打码处理。
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

from ..deps import CurrentUser, DbSession, OptionalUser
from ..models import Progress, Submission, User
from ..schemas import StageSkillOut, UserBrief, UserOut
from ..services import analytics

router = APIRouter(prefix="/api/users", tags=["用户"])


@router.get("/{user_id}", response_model=dict, summary="用户公开主页")
def user_profile(user_id: int, db: DbSession, viewer: OptionalUser) -> dict:
    u = db.get(User, user_id)
    if not u or not u.is_active:
        raise HTTPException(status_code=404, detail="用户不存在")

    solved = db.scalar(
        select(func.count(func.distinct(Submission.problem_id))).where(
            Submission.user_id == u.id, Submission.status == "accepted"
        )
    ) or 0
    subs = db.scalar(select(func.count(Submission.id)).where(Submission.user_id == u.id)) or 0
    chapters_done = db.scalar(
        select(func.count(Progress.id)).where(Progress.user_id == u.id, Progress.status == "done")
    ) or 0

    is_self = bool(viewer and viewer.id == u.id)

    return {
        "user": UserBrief(
            id=u.id,
            username=u.username,
            display_name=u.display_name,
            avatar=u.avatar,
            role=u.role,
        ).model_dump(),
        "bio": u.bio,
        "school": u.school,
        "created_at": u.created_at.isoformat(),
        "stats": {
            "solved": solved,
            "submissions": subs,
            "chapters_done": chapters_done,
            "accept_rate": round(solved * 100.0 / subs, 1) if subs else 0.0,
        },
        "is_self": is_self,
    }


@router.get("/{user_id}/skills", response_model=list[StageSkillOut], summary="他人知识点掌握度")
def user_skills(user_id: int, db: DbSession) -> list[StageSkillOut]:
    """雷达图对他人可见，用来比较差距。"""
    u = db.get(User, user_id)
    if not u or not u.is_active:
        raise HTTPException(status_code=404, detail="用户不存在")
    return analytics.compute_skills(db, u)


@router.get("/search/name", response_model=list[UserBrief], summary="按用户名搜索")
def search_users(
    db: DbSession,
    q: str = Query(min_length=1, max_length=32),
    limit: int = Query(default=10, ge=1, le=30),
) -> list[UserBrief]:
    rows = db.scalars(
        select(User)
        .where(User.is_active.is_(True), User.username.like("%%%s%%" % q))
        .order_by(User.username)
        .limit(limit)
    ).all()
    return [UserBrief.model_validate(u) for u in rows]


@router.get("/me/profile", response_model=UserOut, summary="我的完整资料")
def my_profile(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
