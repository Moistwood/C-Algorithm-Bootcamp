"""评测路由。

提交接口是同步判分的简化版：入队后立刻返回提交 ID，
前端用轮询 /api/judge/submissions/{id} 拿结果。
这样前端不用维护 WebSocket，部署也简单。
"""

from __future__ import annotations

import threading
import time

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import func, select

from ..config import settings
from ..deps import CurrentUser, DbSession, OptionalUser, PageQuery, client_ip, write_audit
from ..models import JudgeQueue, Problem, Submission, TestResult, User
from ..schemas import (
    JudgeInfoOut,
    Page,
    RunIn,
    RunOut,
    SubmissionListItem,
    SubmissionOut,
    SubmitIn,
    TestResultOut,
)
from ..services import judge as engine
from ..services import runner

router = APIRouter(prefix="/api/judge", tags=["在线评测"])


# ---------------------------------------------------------------------
# 提交频率限制
#
# 判题要编译、要起进程，是全站最贵的接口。不限流的话，一个人按住回车
# 就能把 worker 队列塞满，其他人全部排队。这里用进程内计数，够单机用；
# 多实例部署要换成 Redis 计数。
# ---------------------------------------------------------------------

_rate_lock = threading.Lock()
_rate_history: dict[int, list[float]] = {}


def _check_submit_rate(user_id: int, interval: float | None = None, limit: int | None = None) -> None:
    """同一用户：两次调用间隔不少于 N 秒，每分钟不超过 M 次。"""
    now = time.time()
    interval = max(0.0, settings.judge_submit_interval if interval is None else interval)
    limit = max(1, settings.judge_submit_per_minute if limit is None else limit)

    with _rate_lock:
        hist = [t for t in _rate_history.get(user_id, []) if now - t < 60]
        if hist and interval and now - hist[-1] < interval:
            wait = int(interval - (now - hist[-1])) + 1
            raise HTTPException(
                status_code=429,
                detail="提交太快了，请 %d 秒后再试" % wait,
                headers={"Retry-After": str(wait)},
            )
        if len(hist) >= limit:
            raise HTTPException(
                status_code=429,
                detail="一分钟内提交了 %d 次，先歇一会儿" % limit,
                headers={"Retry-After": "60"},
            )
        hist.append(now)
        _rate_history[user_id] = hist

        # 顺手清理长期不活跃的用户，避免字典无限膨胀
        if len(_rate_history) > 5000:
            for uid in [k for k, v in _rate_history.items() if not v or now - v[-1] > 300]:
                _rate_history.pop(uid, None)


@router.get("/info", response_model=JudgeInfoOut, summary="评测机状态")
def judge_info(db: DbSession) -> JudgeInfoOut:
    info = engine.compiler_info()
    waiting = db.scalar(select(func.count(JudgeQueue.id)).where(JudgeQueue.status.in_(["waiting", "running"]))) or 0
    return JudgeInfoOut(
        enabled=settings.judge_enabled and info["available"],
        compiler=info["version"] or "未检测到编译器",
        compiler_path=info["path"],
        standard=settings.judge_cpp_standard,
        optimize=settings.judge_optimize,
        time_limit=settings.judge_default_time_limit,
        max_output_kb=settings.judge_max_output // 1024,
        concurrent=settings.judge_max_concurrent,
        queue_length=waiting,
    )


@router.post("/run", response_model=RunOut, summary="自由运行代码")
def run_code(payload: RunIn, user: CurrentUser) -> RunOut:
    """不判分，只跑一遍看输出。用于「代码运行器」页面和题目页的动手写代码区。"""
    if not settings.judge_enabled:
        raise HTTPException(status_code=503, detail="评测功能已关闭")

    # 自由运行不落库，但同样吃 CPU，限流放得宽松一些
    _check_submit_rate(user.id, interval=1.0, limit=30)

    limit = max(200, min(payload.time_limit, 10_000))
    result = engine.run_once(payload.code, payload.stdin, limit)
    return RunOut(**result)


@router.post("/submit", response_model=SubmissionOut, summary="提交代码判分")
def submit(payload: SubmitIn, request: Request, db: DbSession, user: CurrentUser) -> SubmissionOut:
    if not settings.judge_enabled:
        raise HTTPException(status_code=503, detail="评测功能已关闭")

    _check_submit_rate(user.id)

    problem = db.get(Problem, payload.problem_id)
    if not problem or not problem.is_published:
        raise HTTPException(status_code=404, detail="题目不存在")

    if not engine.find_compiler():
        raise HTTPException(
            status_code=503,
            detail="服务器还没有安装 C++ 编译器，请管理员执行 python setup-toolchain.py",
        )

    sub = Submission(
        user_id=user.id,
        problem_id=problem.id,
        language=payload.language,
        code=payload.code,
        code_length=len(payload.code),
        status="pending",
        max_score=100,
    )
    db.add(sub)
    db.flush()

    db.add(JudgeQueue(submission_id=sub.id, status="waiting", priority=5))
    write_audit(db, user, "judge.submit", "problem", problem.id, "提交 #%d" % sub.id, client_ip(request))
    db.commit()
    db.refresh(sub)

    return _to_out(db, sub)


@router.get("/submissions", response_model=Page[SubmissionListItem], summary="我的提交记录")
def my_submissions(
    db: DbSession,
    user: CurrentUser,
    pg: PageQuery,
    problem_id: int | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
) -> Page[SubmissionListItem]:
    stmt = select(Submission).where(Submission.user_id == user.id)
    if problem_id:
        stmt = stmt.where(Submission.problem_id == problem_id)
    if status_filter:
        stmt = stmt.where(Submission.status == status_filter)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Submission.id.desc()).offset(pg.offset).limit(pg.limit)).all()

    titles = _problem_titles(db, [r.problem_id for r in rows])
    items = [
        SubmissionListItem(
            id=r.id,
            problem_id=r.problem_id,
            problem_title=titles.get(r.problem_id, ""),
            user_id=r.user_id,
            username=user.username,
            status=r.status,
            status_name=engine.STATUS_NAMES.get(r.status, r.status),
            score=r.score,
            time_ms=r.time_ms,
            memory_kb=r.memory_kb,
            language=r.language,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return Page(items=items, total=total, page=pg.page, size=pg.size)


@router.get("/submissions/{submission_id}", response_model=SubmissionOut, summary="提交详情")
def submission_detail(submission_id: int, db: DbSession, user: OptionalUser) -> SubmissionOut:
    sub = db.get(Submission, submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="提交记录不存在")
    # 别人的代码只有管理员和教师能看，普通用户只能看自己的
    if sub.user_id != (user.id if user else -1) and not (user and user.is_admin):
        raise HTTPException(status_code=403, detail="无权查看他人的提交代码")
    return _to_out(db, sub)


@router.get("/recent", response_model=list[SubmissionListItem], summary="最近的提交（公开）")
def recent_submissions(
    db: DbSession,
    limit: int = Query(default=15, ge=1, le=50),
    problem_id: int | None = None,
) -> list[SubmissionListItem]:
    stmt = select(Submission)
    if problem_id:
        stmt = stmt.where(Submission.problem_id == problem_id)
    rows = db.scalars(stmt.order_by(Submission.id.desc()).limit(limit)).all()

    titles = _problem_titles(db, [r.problem_id for r in rows])
    users = {
        u.id: u
        for u in db.scalars(select(User).where(User.id.in_([r.user_id for r in rows]))).all()
    }
    return [
        SubmissionListItem(
            id=r.id,
            problem_id=r.problem_id,
            problem_title=titles.get(r.problem_id, ""),
            user_id=r.user_id,
            username=users[r.user_id].username if r.user_id in users else "已注销",
            status=r.status,
            status_name=engine.STATUS_NAMES.get(r.status, r.status),
            score=r.score,
            time_ms=r.time_ms,
            memory_kb=r.memory_kb,
            language=r.language,
            created_at=r.created_at,
        )
        for r in rows
    ]


# ---------------------------------------------------------------------
# 内部工具
# ---------------------------------------------------------------------


def _problem_titles(db, ids: list[int]) -> dict[int, str]:
    if not ids:
        return {}
    rows = db.execute(select(Problem.id, Problem.title).where(Problem.id.in_(set(ids)))).all()
    return {pid: title for pid, title in rows}


def _to_out(db, sub: Submission) -> SubmissionOut:
    out = SubmissionOut.model_validate(sub)
    out.status_name = engine.STATUS_NAMES.get(sub.status, sub.status)
    problem = db.get(Problem, sub.problem_id)
    out.problem_title = problem.title if problem else ""
    results = db.scalars(
        select(TestResult).where(TestResult.submission_id == sub.id).order_by(TestResult.order_no)
    ).all()
    out.results = [TestResultOut.model_validate(r) for r in results]
    return out
