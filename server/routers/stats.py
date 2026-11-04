"""统计分析路由。"""

from __future__ import annotations

from fastapi import APIRouter, Query, status

from ..deps import CurrentUser, DbSession
from ..schemas import (
    DailyPointOut,
    HeatmapCellOut,
    OverallStatsOut,
    RankingItemOut,
    StageSkillOut,
    WrongQuestionOut,
)
from ..services import analytics

router = APIRouter(prefix="/api/stats", tags=["统计分析"])


@router.get("/overview", response_model=OverallStatsOut, summary="学习总览")
def overview(db: DbSession, user: CurrentUser) -> OverallStatsOut:
    return analytics.compute_overview(db, user)


@router.get("/skills", response_model=list[StageSkillOut], summary="知识点掌握度（雷达图）")
def skills(db: DbSession, user: CurrentUser) -> list[StageSkillOut]:
    return analytics.compute_skills(db, user)


@router.get("/daily", response_model=list[DailyPointOut], summary="学习曲线")
def daily(
    db: DbSession,
    user: CurrentUser,
    days: int = Query(default=30, ge=7, le=365),
) -> list[DailyPointOut]:
    return analytics.compute_daily(db, user, days)


@router.get("/heatmap", response_model=list[HeatmapCellOut], summary="学习热力图")
def heatmap(
    db: DbSession,
    user: CurrentUser,
    weeks: int = Query(default=26, ge=4, le=53),
) -> list[HeatmapCellOut]:
    return analytics.compute_heatmap(db, user, weeks)


@router.get("/ranking", response_model=list[RankingItemOut], summary="排行榜")
def ranking(db: DbSession, limit: int = Query(default=20, ge=1, le=100)) -> list[RankingItemOut]:
    return analytics.compute_ranking(db, limit)


@router.get("/wrong", response_model=list[WrongQuestionOut], summary="错题本")
def wrong(db: DbSession, user: CurrentUser, limit: int = Query(default=50, ge=1, le=200)) -> list[WrongQuestionOut]:
    return analytics.compute_wrong_questions(db, user, limit)


@router.get("/tips", summary="今日建议")
def tips(db: DbSession, user: CurrentUser) -> list[dict]:
    overview_data = analytics.compute_overview(db, user)
    skills_data = analytics.compute_skills(db, user)
    return analytics.diagnose(skills_data, overview_data)


@router.get("/dashboard", summary="个人中心聚合数据")
def dashboard(db: DbSession, user: CurrentUser) -> dict:
    """一次请求拿齐个人中心需要的所有数据，减少前端串行等待。"""
    ov = analytics.compute_overview(db, user)
    return {
        "overview": ov.model_dump(),
        "skills": [s.model_dump() for s in analytics.compute_skills(db, user)],
        "daily": [d.model_dump() for d in analytics.compute_daily(db, user, 30)],
        "tips": analytics.diagnose(analytics.compute_skills(db, user), ov),
    }
