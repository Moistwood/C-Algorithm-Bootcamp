"""评测执行器：把 judge 引擎和数据库串起来。

一个提交的完整生命周期：
    用户点击提交
      → 建 Submission（pending）+ 入 JudgeQueue
      → 后台 worker 取出任务
      → 编译（compiling）
      → 逐测试点运行（running）
      → 写 TestResult，汇总总分与状态
      → 更新题目通过数、用户每日统计
      → 标记 Submission 完成（judged_at）
"""

from __future__ import annotations

import logging
import shutil
import threading
import time
import traceback
from datetime import date, datetime, timezone

from sqlalchemy import func, select

from ..database import session_scope
from ..models import (
    DailyStat,
    JudgeQueue,
    Problem,
    Submission,
    TestCase,
    TestResult,
    User,
)
from . import judge as engine

logger = logging.getLogger("algo.judge")

_stop_flag = threading.Event()
_worker_threads: list[threading.Thread] = []


# ---------------------------------------------------------------------
# 单次评测
# ---------------------------------------------------------------------


def judge_submission(submission_id: int) -> str:
    """完整评测一个提交，返回最终状态。"""
    started = time.perf_counter()

    with session_scope() as db:
        sub = db.get(Submission, submission_id)
        if not sub:
            logger.warning("提交 %s 不存在", submission_id)
            return "system_error"
        if sub.status not in ("pending", "compiling", "running"):
            return sub.status

        problem = db.get(Problem, sub.problem_id)
        if not problem:
            sub.status = "system_error"
            sub.judge_message = "题目已被删除"
            sub.judged_at = engine.now_utc()
            return sub.status

        cases = list(
            db.scalars(
                select(TestCase)
                .where(TestCase.problem_id == problem.id)
                .order_by(TestCase.order_no, TestCase.id)
            ).all()
        )

        # 题目没配隐藏测试点时，退回用样例判分，保证能给出反馈
        if not cases:
            cases = [
                TestCase(problem_id=problem.id, order_no=i + 1, input_data=inp,
                         expected_output=out, score=max(1, 100 // max(1, len(problem.samples or []))),
                         is_sample=True)
                for i, (inp, out) in enumerate(problem.samples or [])
                if isinstance(inp, str) and isinstance(out, str)
            ]
            if not cases:
                sub.status = "system_error"
                sub.judge_message = "这道题还没有配置测试数据，请联系管理员。"
                sub.judged_at = engine.now_utc()
                return sub.status

        sub.status = "compiling"
        sub.compiler = "%s %s" % (engine.compiler_version() or "g++", engine.settings.judge_cpp_standard)
        db.commit()

        workdir = engine.judge_dir(sub.id)
        try:
            ok, exe, message, compile_ms = engine.compile_cpp(sub.code, workdir)

            if not ok or exe is None:
                sub.status = "compile_error"
                sub.compile_message = message
                sub.judge_message = "编译失败，没有进入测试环节。"
                sub.score = 0
                sub.time_ms = 0
                sub.judge_time_ms = int((time.perf_counter() - started) * 1000)
                sub.judged_at = engine.now_utc()
                _bump_problem_stats(db, problem, accepted=False)
                _bump_daily(db, sub.user_id, accepted=False)
                db.commit()
                return sub.status

            sub.compile_message = ""
            sub.status = "running"
            db.commit()

            max_score = sum(c.score for c in cases) or 100
            sub.max_score = max_score

            total_score = 0
            worst_ms = 0
            statuses: list[str] = []
            first_fail_hint = ""

            for idx, case in enumerate(cases, start=1):
                result = engine.run_executable(
                    exe,
                    case.input_data,
                    problem.time_limit or engine.settings.judge_default_time_limit,
                    workdir,
                )

                st = result["status"]
                if st == "accepted":
                    if not engine.compare_output(result["stdout"], case.expected_output):
                        st = "wrong_answer"

                statuses.append(st)
                worst_ms = max(worst_ms, result["time_ms"])

                got = case.score if st == "accepted" else 0
                total_score += got

                if st != "accepted" and not first_fail_hint:
                    first_fail_hint = "第 %d 个测试点%s" % (idx, engine.STATUS_NAMES.get(st, st))

                db.add(
                    TestResult(
                        submission_id=sub.id,
                        case_id=case.id if case.id else None,
                        order_no=idx,
                        status=st,
                        time_ms=result["time_ms"],
                        memory_kb=result.get("memory_kb", 0),
                        score=got,
                        is_sample=case.is_sample,
                        stdin_excerpt=engine.excerpt(case.input_data if case.is_sample else ""),
                        expected_excerpt=engine.excerpt(case.expected_output if case.is_sample else ""),
                        actual_excerpt=engine.excerpt(result["stdout"] if case.is_sample else ""),
                        message=result.get("message", "") or result.get("stderr", "")[:300],
                    )
                )

            final_status = engine.worst_status(statuses)
            if total_score >= max_score and final_status == "accepted":
                final_status = "accepted"

            sub.status = final_status
            sub.score = total_score
            sub.time_ms = worst_ms
            sub.judged_at = engine.now_utc()
            sub.judge_time_ms = int((time.perf_counter() - started) * 1000)
            sub.judge_message = (
                "全部 %d 个测试点通过" % len(cases)
                if final_status == "accepted"
                else (first_fail_hint + "未通过")
            )

            _bump_problem_stats(db, problem, accepted=(final_status == "accepted"))
            _bump_daily(db, sub.user_id, accepted=(final_status == "accepted"),
                        solved_new=_is_first_accept(db, sub.user_id, problem.id, sub.id))
            db.commit()

            logger.info(
                "提交 #%s 评测完成：%s，得分 %d/%d，耗时 %dms",
                sub.id, final_status, total_score, max_score, sub.judge_time_ms,
            )
            return final_status

        except Exception as exc:  # noqa: BLE001
            logger.error("评测 #%s 异常：%s\n%s", submission_id, exc, traceback.format_exc())
            sub.status = "system_error"
            sub.judge_message = "评测机内部错误：%s" % exc
            sub.judged_at = engine.now_utc()
            db.commit()
            return "system_error"
        finally:
            shutil.rmtree(workdir, ignore_errors=True)


def _is_first_accept(db, user_id: int, problem_id: int, current_sub_id: int) -> bool:
    """这次提交是不是该用户第一次通过这道题。"""
    prev = db.scalar(
        select(func.count(Submission.id)).where(
            Submission.user_id == user_id,
            Submission.problem_id == problem_id,
            Submission.status == "accepted",
            Submission.id < current_sub_id,
        )
    )
    return (prev or 0) == 0


def _bump_problem_stats(db, problem: Problem, accepted: bool) -> None:
    problem.submit_count = (problem.submit_count or 0) + 1
    if accepted:
        problem.accept_count = (problem.accept_count or 0) + 1


def _bump_daily(db, user_id: int, accepted: bool, solved_new: bool = False) -> None:
    today = date.today()
    ds = db.scalar(select(DailyStat).where(DailyStat.user_id == user_id, DailyStat.stat_date == today))
    if not ds:
        ds = DailyStat(user_id=user_id, stat_date=today)
        db.add(ds)
    ds.submissions = (ds.submissions or 0) + 1
    if accepted:
        ds.accepted = (ds.accepted or 0) + 1
    if solved_new:
        ds.problems_solved = (ds.problems_solved or 0) + 1


# ---------------------------------------------------------------------
# 后台 worker
# ---------------------------------------------------------------------


def _worker_loop(worker_id: str) -> None:
    """轮询评测队列。

    没有用 Celery / Redis，是为了让朋友 clone 下来只装一个 Python 依赖
    就能跑全流程。生产环境要上规模，把这里换成 Celery 即可，
    入队逻辑不用改。
    """
    logger.info("评测 worker %s 启动", worker_id)

    while not _stop_flag.is_set():
        task: JudgeQueue | None = None
        try:
            with session_scope() as db:
                candidate = db.scalar(
                    select(JudgeQueue)
                    .where(JudgeQueue.status == "waiting")
                    .order_by(JudgeQueue.priority, JudgeQueue.id)
                    .limit(1)
                )
                if candidate:
                    candidate.status = "running"
                    candidate.worker_id = worker_id
                    candidate.started_at = engine.now_utc()
                    task_id = candidate.id
                    sub_id = candidate.submission_id
                    db.commit()
                else:
                    task_id = None
                    sub_id = None

            if task_id and sub_id:
                try:
                    judge_submission(sub_id)
                finally:
                    with session_scope() as db:
                        q = db.get(JudgeQueue, task_id)
                        if q:
                            q.status = "done"
                            q.finished_at = engine.now_utc()
        except Exception:  # noqa: BLE001
            logger.error("worker %s 循环异常\n%s", worker_id, traceback.format_exc())

        _stop_flag.wait(0.8)

    logger.info("评测 worker %s 退出", worker_id)


def start_workers(count: int | None = None) -> None:
    global _worker_threads
    if _worker_threads:
        return
    if not engine.find_compiler():
        logger.warning("没有找到 g++ 编译器，评测功能不可用。请运行 python setup-toolchain.py")

    n = count or max(1, engine.settings.judge_max_concurrent)
    _stop_flag.clear()
    for i in range(n):
        t = threading.Thread(target=_worker_loop, args=("w%d" % i,), daemon=True, name="judge-worker-%d" % i)
        t.start()
        _worker_threads.append(t)


def stop_workers() -> None:
    global _worker_threads
    _stop_flag.set()
    for t in _worker_threads:
        t.join(timeout=3)
    _worker_threads = []


def queue_length() -> int:
    with session_scope() as db:
        return db.scalar(select(func.count(JudgeQueue.id)).where(JudgeQueue.status.in_(["waiting", "running"]))) or 0


def recover_stuck_tasks() -> int:
    """服务重启后，把上次没跑完的任务重新标成等待。"""
    with session_scope() as db:
        stuck = db.scalars(select(JudgeQueue).where(JudgeQueue.status == "running")).all()
        for q in stuck:
            q.status = "waiting"
            q.worker_id = ""
            q.started_at = None
            sub = db.get(Submission, q.submission_id)
            if sub and sub.status in ("compiling", "running", "pending"):
                sub.status = "pending"
        return len(stuck)
