"""学习进度路由。

前端每 30 秒上报一次停留时长，切换章节时再报一次。
用增量上报（seconds_delta）而不是绝对值，避免多标签页互相覆盖。
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from ..deps import CurrentUser, DbSession
from ..models import Chapter, DailyStat, Progress, QuizAttempt
from ..schemas import Msg, ProgressIn, ProgressOut, QuizAnswerIn, QuizResultOut

router = APIRouter(prefix="/api/progress", tags=["学习进度"])


def _to_out(p: Progress) -> ProgressOut:
    out = ProgressOut.model_validate(p)
    out.quiz_accuracy = p.quiz_accuracy
    return out


@router.get("", response_model=list[ProgressOut], summary="我的全部进度")
def list_progress(db: DbSession, user: CurrentUser) -> list[ProgressOut]:
    rows = db.scalars(select(Progress).where(Progress.user_id == user.id)).all()
    return [_to_out(p) for p in rows]


@router.get("/{chapter_id}", response_model=ProgressOut | None, summary="单章进度")
def get_progress(chapter_id: int, db: DbSession, user: CurrentUser) -> ProgressOut | None:
    p = db.scalar(select(Progress).where(Progress.user_id == user.id, Progress.chapter_id == chapter_id))
    return _to_out(p) if p else None


@router.post("", response_model=ProgressOut, summary="上报学习进度")
def upsert_progress(payload: ProgressIn, db: DbSession, user: CurrentUser) -> ProgressOut:
    chapter = db.get(Chapter, payload.chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="章节不存在")

    p = db.scalar(select(Progress).where(Progress.user_id == user.id, Progress.chapter_id == payload.chapter_id))
    if not p:
        p = Progress(user_id=user.id, chapter_id=payload.chapter_id, status="learning")
        db.add(p)
        db.flush()

    if payload.seconds_delta:
        p.seconds_spent = (p.seconds_spent or 0) + payload.seconds_delta
        # 同步到每日统计，学习曲线要用
        today = datetime.now(timezone.utc).date()
        ds = db.scalar(select(DailyStat).where(DailyStat.user_id == user.id, DailyStat.stat_date == today))
        if not ds:
            ds = DailyStat(user_id=user.id, stat_date=today)
            db.add(ds)
        ds.minutes_spent = (ds.minutes_spent or 0) + max(1, payload.seconds_delta // 60)

    if payload.scroll_percent:
        p.scroll_percent = max(p.scroll_percent or 0, payload.scroll_percent)

    if payload.status:
        if payload.status == "done" and p.status != "done":
            p.finished_at = datetime.now(timezone.utc)
            today = datetime.now(timezone.utc).date()
            ds = db.scalar(select(DailyStat).where(DailyStat.user_id == user.id, DailyStat.stat_date == today))
            if not ds:
                ds = DailyStat(user_id=user.id, stat_date=today)
                db.add(ds)
            ds.chapters_done = (ds.chapters_done or 0) + 1
        p.status = payload.status

    db.commit()
    db.refresh(p)
    return _to_out(p)


@router.post("/quiz", response_model=QuizResultOut, summary="提交自测答案")
def answer_quiz(payload: QuizAnswerIn, db: DbSession, user: CurrentUser) -> QuizResultOut:
    chapter = db.get(Chapter, payload.chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="章节不存在")

    body = chapter.body or []
    if payload.section_index < 0 or payload.section_index >= len(body):
        raise HTTPException(status_code=400, detail="题号越界")

    section = body[payload.section_index]
    if section.get("t") != "quiz":
        raise HTTPException(status_code=400, detail="这个位置不是自测题")

    # 标准答案以服务端数据为准，前端传上来的 answer 只用于兜底校验
    correct_index = int(section.get("a", payload.answer))
    is_correct = payload.chosen == correct_index

    db.add(
        QuizAttempt(
            user_id=user.id,
            chapter_id=chapter.id,
            section_index=payload.section_index,
            question=str(section.get("q", ""))[:2000],
            chosen=payload.chosen,
            answer=correct_index,
            is_correct=is_correct,
        )
    )

    p = db.scalar(select(Progress).where(Progress.user_id == user.id, Progress.chapter_id == chapter.id))
    if not p:
        p = Progress(user_id=user.id, chapter_id=chapter.id, status="learning")
        db.add(p)
        db.flush()

    # 同一道题重复作答只记第一次的对错，避免刷正确率
    already = db.scalar(
        select(func.count(QuizAttempt.id)).where(
            QuizAttempt.user_id == user.id,
            QuizAttempt.chapter_id == chapter.id,
            QuizAttempt.section_index == payload.section_index,
            QuizAttempt.id != 0,
        )
    )
    if (already or 0) <= 1:
        p.quiz_total = (p.quiz_total or 0) + 1
        if is_correct:
            p.quiz_correct = (p.quiz_correct or 0) + 1

    db.commit()

    return QuizResultOut(
        correct=is_correct,
        answer=correct_index,
        explanation=str(section.get("e", ""))[:2000],
    )


@router.delete("/{chapter_id}", response_model=Msg, summary="重置某章进度")
def reset_progress(chapter_id: int, db: DbSession, user: CurrentUser) -> Msg:
    p = db.scalar(select(Progress).where(Progress.user_id == user.id, Progress.chapter_id == chapter_id))
    if p:
        db.delete(p)
        db.commit()
    return Msg(message="进度已重置")
