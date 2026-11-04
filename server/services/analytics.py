"""统计分析服务。

掌握度算法（雷达图的数据源）：

    章节完成度  = 已完成章节数 / 该阶段章节总数
    自测正确率  = 答对题目数 / 作答总数
    刷题通过率  = 已通过的关联题目数 / 该阶段关联题目总数

    score = 章节完成度 × 40 + 自测正确率 × 40 + 刷题通过率 × 20

权重这么设的理由：看视频/看文章不等于会了，所以完成度只占 40；
自测题能验证是否真的理解概念，权重相等；题目通过率最难掺水，但
样本量小的时候波动大，所以权重最低。
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import Integer, cast, func, select
from sqlalchemy.orm import Session

from ..models import (
    Chapter,
    DailyStat,
    Problem,
    Progress,
    QuizAttempt,
    Stage,
    Submission,
    User,
)
from ..schemas import (
    DailyPointOut,
    HeatmapCellOut,
    OverallStatsOut,
    RankingItemOut,
    StageSkillOut,
    WrongQuestionOut,
)


# ---------------------------------------------------------------------
# 总览
# ---------------------------------------------------------------------


def compute_overview(db: Session, user: User) -> OverallStatsOut:
    chapters_total = db.scalar(
        select(func.count(Chapter.id)).where(Chapter.is_published.is_(True))
    ) or 0

    chapters_done = db.scalar(
        select(func.count(Progress.id)).where(Progress.user_id == user.id, Progress.status == "done")
    ) or 0

    problems_total = db.scalar(
        select(func.count(Problem.id)).where(Problem.is_published.is_(True))
    ) or 0

    solved = db.scalar(
        select(func.count(func.distinct(Submission.problem_id))).where(
            Submission.user_id == user.id, Submission.status == "accepted"
        )
    ) or 0

    subs_total = db.scalar(
        select(func.count(Submission.id)).where(Submission.user_id == user.id)
    ) or 0

    accepted_total = db.scalar(
        select(func.count(Submission.id)).where(
            Submission.user_id == user.id, Submission.status == "accepted"
        )
    ) or 0

    minutes_total = db.scalar(
        select(func.coalesce(func.sum(DailyStat.minutes_spent), 0)).where(DailyStat.user_id == user.id)
    ) or 0

    today = datetime.now(timezone.utc).date()
    today_minutes = db.scalar(
        select(func.coalesce(func.sum(DailyStat.minutes_spent), 0)).where(
            DailyStat.user_id == user.id, DailyStat.stat_date == today
        )
    ) or 0

    total_users = db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    rank = _user_rank(db, user.id)

    return OverallStatsOut(
        chapters_total=chapters_total,
        chapters_done=chapters_done,
        chapter_percent=_pct(chapters_done, chapters_total),
        problems_total=problems_total,
        problems_solved=solved,
        problem_percent=_pct(solved, problems_total),
        submissions_total=subs_total,
        accepted_total=accepted_total,
        accept_rate=_pct(accepted_total, subs_total),
        minutes_total=int(minutes_total),
        streak_days=compute_streak(db, user.id),
        today_minutes=int(today_minutes),
        weekly_goal_minutes=user.weekly_goal_minutes or 300,
        rank=rank,
        total_users=total_users,
    )


def _pct(a: int, b: int) -> float:
    if not b:
        return 0.0
    return round(a * 100.0 / b, 1)


def _user_rank(db: Session, user_id: int) -> int:
    """按「通过题目数」排名，同分看提交次数少的优先。"""
    solved_sub = (
        select(
            Submission.user_id.label("uid"),
            func.count(func.distinct(Submission.problem_id)).label("solved"),
        )
        .where(Submission.status == "accepted")
        .group_by(Submission.user_id)
        .subquery()
    )
    my_solved = db.scalar(select(solved_sub.c.solved).where(solved_sub.c.uid == user_id)) or 0
    better = db.scalar(
        select(func.count()).select_from(solved_sub).where(solved_sub.c.solved > my_solved)
    ) or 0
    return better + 1


def compute_streak(db: Session, user_id: int) -> int:
    """连续学习天数。今天没学但昨天学了，仍然算连续（防止早上打开掉段）。"""
    rows = db.scalars(
        select(DailyStat.stat_date)
        .where(
            DailyStat.user_id == user_id,
            (DailyStat.submissions > 0) | (DailyStat.minutes_spent > 0) | (DailyStat.chapters_done > 0),
        )
        .order_by(DailyStat.stat_date.desc())
        .limit(400)
    ).all()

    if not rows:
        return 0

    today = datetime.now(timezone.utc).date()
    days = set(rows)
    streak = 0
    cursor = today
    if cursor not in days:
        cursor = cursor - timedelta(days=1)
        if cursor not in days:
            return 0
    while cursor in days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


# ---------------------------------------------------------------------
# 知识点掌握度（雷达图）
# ---------------------------------------------------------------------


def compute_skills(db: Session, user: User) -> list[StageSkillOut]:
    """各阶段掌握度。

    早期实现是「每个阶段循环查 5 次」，7 个阶段就是 35 条 SQL。
    掌握度又是 /api/stats/tips 和 /dashboard 每次都要算的，属于热点
    路径。现在改为每个维度一条 GROUP BY，固定 6 条 SQL 拿齐全部数据。
    """
    stages = db.scalars(select(Stage).order_by(Stage.order_no)).all()
    if not stages:
        return []

    chapter_total = dict(db.execute(
        select(Chapter.stage_code, func.count(Chapter.id))
        .where(Chapter.is_published.is_(True))
        .group_by(Chapter.stage_code)
    ).all())

    chapters_done = dict(db.execute(
        select(Chapter.stage_code, func.count(Progress.id))
        .join(Progress, Progress.chapter_id == Chapter.id)
        .where(Progress.user_id == user.id, Progress.status == "done")
        .group_by(Chapter.stage_code)
    ).all())

    quiz_total = dict(db.execute(
        select(Chapter.stage_code, func.count(QuizAttempt.id))
        .join(Chapter, QuizAttempt.chapter_id == Chapter.id)
        .where(Chapter.is_published.is_(True), QuizAttempt.user_id == user.id)
        .group_by(Chapter.stage_code)
    ).all())

    quiz_correct = dict(db.execute(
        select(Chapter.stage_code, func.count(QuizAttempt.id))
        .join(Chapter, QuizAttempt.chapter_id == Chapter.id)
        .where(
            Chapter.is_published.is_(True),
            QuizAttempt.user_id == user.id,
            QuizAttempt.is_correct.is_(True),
        )
        .group_by(Chapter.stage_code)
    ).all())

    prob_total = dict(db.execute(
        select(Chapter.stage_code, func.count(Problem.id))
        .join(Problem, Problem.ref_chapter == Chapter.id)
        .where(Chapter.is_published.is_(True), Problem.is_published.is_(True))
        .group_by(Chapter.stage_code)
    ).all())

    prob_solved = dict(db.execute(
        select(Chapter.stage_code, func.count(func.distinct(Submission.problem_id)))
        .join(Problem, Submission.problem_id == Problem.id)
        .join(Chapter, Problem.ref_chapter == Chapter.id)
        .where(
            Chapter.is_published.is_(True),
            Problem.is_published.is_(True),
            Submission.user_id == user.id,
            Submission.status == "accepted",
        )
        .group_by(Chapter.stage_code)
    ).all())

    out: list[StageSkillOut] = []
    for st in stages:
        total = chapter_total.get(st.code, 0)
        if not total:
            continue

        done = chapters_done.get(st.code, 0)
        q_total = quiz_total.get(st.code, 0)
        q_correct = quiz_correct.get(st.code, 0)
        p_total = prob_total.get(st.code, 0)
        p_solved = prob_solved.get(st.code, 0)

        chapter_rate = done / total if total else 0.0
        quiz_rate = q_correct / q_total if q_total else 0.0
        prob_rate = p_solved / p_total if p_total else 0.0

        score = chapter_rate * 40 + quiz_rate * 40 + prob_rate * 20

        out.append(
            StageSkillOut(
                stage_code=st.code,
                stage_title=st.title,
                chapters_total=total,
                chapters_done=done,
                quiz_accuracy=round(quiz_rate * 100, 1),
                problem_pass_rate=round(prob_rate * 100, 1),
                score=round(score, 1),
            )
        )
    return out


# ---------------------------------------------------------------------
# 学习曲线与热力图
# ---------------------------------------------------------------------


def compute_daily(db: Session, user: User, days: int = 30) -> list[DailyPointOut]:
    since = datetime.now(timezone.utc).date() - timedelta(days=days - 1)
    rows = db.scalars(
        select(DailyStat)
        .where(DailyStat.user_id == user.id, DailyStat.stat_date >= since)
        .order_by(DailyStat.stat_date)
    ).all()

    # 「当天解决了多少题」按提交记录重新算，不用 daily_stats.problems_solved。
    # 后者是判题时累加的，两条提交同时通过同一道题时，都会认为自己才是
    # 首次通过，于是各加一次，数字会虚高。这里取每题最早一次 AC 的日期，
    # 天生幂等，重复点几次也不会变。
    first_pass: dict[int, date] = {}
    for problem_id, judged_at in db.execute(
        select(Submission.problem_id, Submission.judged_at).where(
            Submission.user_id == user.id,
            Submission.status == "accepted",
            Submission.judged_at.is_not(None),
        )
    ):
        day = judged_at.date()
        if problem_id not in first_pass or day < first_pass[problem_id]:
            first_pass[problem_id] = day

    solved_by_day: dict[date, int] = {}
    for day in first_pass.values():
        solved_by_day[day] = solved_by_day.get(day, 0) + 1

    by_date = {r.stat_date: r for r in rows}
    out: list[DailyPointOut] = []
    cursor = since
    today = datetime.now(timezone.utc).date()
    while cursor <= today:
        r = by_date.get(cursor)
        out.append(
            DailyPointOut(
                stat_date=cursor,
                submissions=r.submissions if r else 0,
                accepted=r.accepted if r else 0,
                minutes=r.minutes_spent if r else 0,
                problems_solved=solved_by_day.get(cursor, 0),
            )
        )
        cursor += timedelta(days=1)
    return out


def compute_heatmap(db: Session, user: User, weeks: int = 26) -> list[HeatmapCellOut]:
    """GitHub 风格的提交热力图。返回按周排列的格子。"""
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=(weeks * 7) - 1)
    rows = db.scalars(
        select(DailyStat).where(DailyStat.user_id == user.id, DailyStat.stat_date >= start)
    ).all()
    by_date = {r.stat_date: r for r in rows}

    values: list[tuple[date, int]] = []
    cursor = start
    while cursor <= today:
        r = by_date.get(cursor)
        v = 0
        if r:
            v = (r.submissions or 0) + (r.chapters_done or 0) * 2 + (r.minutes_spent or 0) // 20
        values.append((cursor, v))
        cursor += timedelta(days=1)

    peak = max((v for _, v in values), default=0) or 1

    def level(v: int) -> int:
        if v <= 0:
            return 0
        ratio = v / peak
        if ratio <= 0.25:
            return 1
        if ratio <= 0.5:
            return 2
        if ratio <= 0.75:
            return 3
        return 4

    return [HeatmapCellOut(day=d, value=v, level=level(v)) for d, v in values]


# ---------------------------------------------------------------------
# 排行榜
# ---------------------------------------------------------------------


def compute_ranking(db: Session, limit: int = 20) -> list[RankingItemOut]:
    solved_sub = (
        select(
            Submission.user_id.label("uid"),
            func.count(func.distinct(Submission.problem_id)).label("solved"),
            func.count(Submission.id).label("subs"),
            func.sum(func.cast(Submission.status == "accepted", Integer)).label("acc"),
        )
        .group_by(Submission.user_id)
        .subquery()
    )

    rows = db.execute(
        select(User, solved_sub.c.solved, solved_sub.c.subs, solved_sub.c.acc)
        .join(solved_sub, solved_sub.c.uid == User.id)
        .where(User.is_active.is_(True))
        .order_by(solved_sub.c.solved.desc(), solved_sub.c.subs.asc())
        .limit(limit)
    ).all()

    out: list[RankingItemOut] = []
    for idx, (u, solved, subs, acc) in enumerate(rows, start=1):
        rate = round((acc or 0) * 100.0 / subs, 1) if subs else 0.0
        out.append(
            RankingItemOut(
                rank=idx,
                user_id=u.id,
                username=u.username,
                display_name=u.display_name or u.username,
                avatar=u.avatar or "",
                solved=solved or 0,
                submissions=subs or 0,
                accept_rate=rate,
                score=round((solved or 0) * 10 + rate * 0.5, 1),
            )
        )
    return out


# ---------------------------------------------------------------------
# 错题本
# ---------------------------------------------------------------------


def compute_wrong_questions(db: Session, user: User, limit: int = 50) -> list[WrongQuestionOut]:
    """有提交但从未通过的题目，按最近提交时间倒序。

    早期实现每道题再查一次「最近一次提交」，错题一多就是 N+1。
    现在把 max(id) 并进主查询，再按 id 批量取，固定两条 SQL。
    """
    accepted_ids = select(Submission.problem_id).where(
        Submission.user_id == user.id, Submission.status == "accepted"
    )

    rows = db.execute(
        select(
            Submission.problem_id,
            func.count(Submission.id).label("attempts"),
            func.max(Submission.created_at).label("last_at"),
            func.max(Submission.id).label("last_id"),
        )
        .where(Submission.user_id == user.id, Submission.problem_id.notin_(accepted_ids))
        .group_by(Submission.problem_id)
        .order_by(func.max(Submission.created_at).desc())
        .limit(limit)
    ).all()

    if not rows:
        return []

    pids = [r[0] for r in rows]
    problems = {p.id: p for p in db.scalars(select(Problem).where(Problem.id.in_(pids))).all()}
    last_subs = {
        s.problem_id: s
        for s in db.scalars(
            select(Submission).where(Submission.id.in_([r[3] for r in rows]))
        ).all()
    }

    out: list[WrongQuestionOut] = []
    for pid, attempts, last_at, _last_id in rows:
        p = problems.get(pid)
        if not p:
            continue
        last_sub = last_subs.get(pid)
        out.append(
            WrongQuestionOut(
                problem_id=pid,
                title=p.title,
                group_name=p.group_name,
                attempts=attempts,
                last_status=last_sub.status if last_sub else "wrong_answer",
                last_at=last_at,
            )
        )
    return out


# ---------------------------------------------------------------------
# 阶段性诊断建议
# ---------------------------------------------------------------------


def diagnose(skills: list[StageSkillOut], overview: OverallStatsOut) -> list[dict]:
    """根据掌握度给出下一步建议。前端首页的「今日建议」用这个。"""
    tips: list[dict] = []

    weak = [s for s in skills if s.score < 40 and s.chapters_done < s.chapters_total]
    if weak:
        s = weak[0]
        tips.append({
            "level": "warn",
            "title": "补基础：%s" % s.stage_title,
            "detail": "这个阶段完成度 %d/%d，掌握度 %.0f 分。先把它做完再往后走，后面的内容会用到。"
                      % (s.chapters_done, s.chapters_total, s.score),
            "action": "#/learn/stage/%s" % s.stage_code,
        })

    low_quiz = [s for s in skills if 0 < s.quiz_accuracy < 60]
    if low_quiz:
        s = low_quiz[0]
        tips.append({
            "level": "warn",
            "title": "自测正确率偏低：%s" % s.stage_title,
            "detail": "正确率 %.0f%%，说明概念还没吃透，别急着刷题。" % s.quiz_accuracy,
            "action": "#/learn/stage/%s" % s.stage_code,
        })

    if overview.accept_rate and overview.accept_rate < 30 and overview.submissions_total >= 10:
        tips.append({
            "level": "info",
            "title": "提交通过率只有 %.0f%%" % overview.accept_rate,
            "detail": "多半是边界条件或数据范围没看清。交之前先自己构造 3 组极端数据跑一遍。",
            "action": "#/stats/wrong",
        })

    if overview.streak_days >= 3:
        tips.append({
            "level": "ok",
            "title": "已连续学习 %d 天" % overview.streak_days,
            "detail": "保持住。省赛考的是手速和熟练度，断一天手感就掉。",
            "action": "#/stats",
        })
    elif overview.streak_days == 0:
        tips.append({
            "level": "info",
            "title": "今天还没开始",
            "detail": "哪怕只做一道题，也比计划明天补三题强。",
            "action": "#/practice",
        })

    if not tips:
        tips.append({
            "level": "ok",
            "title": "进度正常",
            "detail": "按当前的节奏走下去就行。",
            "action": "#/practice",
        })
    return tips[:3]
