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
from datetime import datetime, timezone

from sqlalchemy import func, insert, select, update
from sqlalchemy.exc import IntegrityError

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
    """完整评测一个提交，返回最终状态。

    第一件事是用一条条件 UPDATE 把 Submission 从 pending 改成 compiling。
    只有实际改了 1 行的那个 worker 才继续往下跑；两个 worker 同时拿到
    同一条队列任务时，第二个的 rowcount 是 0，直接退出。重复判分会让
    同一个提交产生两套 TestResult，还会让两个线程互删临时目录，
    所以这道锁必须放在最前面，不能只靠队列表的状态位。
    """
    started = time.perf_counter()

    with session_scope() as db:
        claimed = db.execute(
            update(Submission)
            .where(Submission.id == submission_id, Submission.status == "pending")
            .values(
                status="compiling",
                compiler="%s %s"
                % (engine.compiler_version() or "g++", engine.settings.judge_cpp_standard),
            )
            .execution_options(synchronize_session=False)
        )
        if claimed.rowcount != 1:
            current = db.scalar(select(Submission.status).where(Submission.id == submission_id))
            if current is None:
                logger.warning("提交 %s 不存在", submission_id)
                return "system_error"
            logger.info("提交 %s 已被其他 worker 接手（当前状态 %s），本 worker 跳过", submission_id, current)
            return current

    with session_scope() as db:
        sub = db.get(Submission, submission_id)
        if not sub:
            logger.warning("提交 %s 不存在", submission_id)
            return "system_error"

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
            worst_mem_kb = 0
            statuses: list[str] = []
            first_fail_hint = ""

            for idx, case in enumerate(cases, start=1):
                result = engine.run_executable(
                    exe,
                    case.input_data,
                    problem.time_limit or engine.settings.judge_default_time_limit,
                    workdir,
                    memory_limit_mb=problem.memory_limit or engine.settings.judge_default_memory_limit,
                )

                st = result["status"]
                if st == "accepted":
                    if not engine.compare_output(result["stdout"], case.expected_output):
                        st = "wrong_answer"

                statuses.append(st)
                worst_ms = max(worst_ms, result["time_ms"])
                worst_mem_kb = max(worst_mem_kb, result.get("memory_kb", 0))

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
            sub.memory_kb = worst_mem_kb
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
            # 先回滚。异常可能发生在 flush 途中，此时会话处于必须回滚的状态，
            # 直接 commit 会再抛 PendingRollbackError，提交就永久卡在「评测中」。
            db.rollback()
            try:
                db.execute(
                    update(Submission)
                    .where(Submission.id == submission_id)
                    .values(
                        status="system_error",
                        judge_message="评测机内部错误：%s" % exc,
                        judged_at=engine.now_utc(),
                    )
                    .execution_options(synchronize_session=False)
                )
                db.commit()
            except Exception:  # noqa: BLE001
                db.rollback()
                logger.error("提交 #%s 写回异常状态也失败了\n%s", submission_id, traceback.format_exc())
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
    """题目提交/通过计数 +1。

    用 SQL 自增而不是 `problem.submit_count += 1`：后者是「读出来、加一、
    写回去」，两个 worker 并发时会读到同一个旧值，各写各的，丢一次计数。
    """
    stmt = update(Problem).where(Problem.id == problem.id)
    db.execute(
        stmt.values(submit_count=func.coalesce(Problem.submit_count, 0) + 1)
        .execution_options(synchronize_session=False)
    )
    if accepted:
        db.execute(
            stmt.values(accept_count=func.coalesce(Problem.accept_count, 0) + 1)
            .execution_options(synchronize_session=False)
        )


def _bump_daily(db, user_id: int, accepted: bool, solved_new: bool = False) -> None:
    """当天统计 +1。

    日期统一用 UTC，和统计接口的取数口径保持一致；用本地 date.today()
    的话，UTC+8 的凌晨 0 点到 8 点之间提交，会被记到前一天，用户会发现
    「昨晚做的题早上看不算今天」，连续天数也会断。

    并发写同一天时，UPDATE 可能一行都没匹配上（当天还没记录），这时才插入；
    插入撞上唯一约束说明别的线程刚插进去了，退回来再 UPDATE 一次即可。
    """
    today = engine.now_utc().date()

    def _values() -> dict:
        vals = {"submissions": func.coalesce(DailyStat.submissions, 0) + 1}
        if accepted:
            vals["accepted"] = func.coalesce(DailyStat.accepted, 0) + 1
        if solved_new:
            vals["problems_solved"] = func.coalesce(DailyStat.problems_solved, 0) + 1
        return vals

    where = (DailyStat.user_id == user_id, DailyStat.stat_date == today)

    bumped = db.execute(
        update(DailyStat)
        .where(*where)
        .values(**_values())
        .execution_options(synchronize_session=False)
    )
    if bumped.rowcount:
        return

    try:
        # savepoint：插入失败只回滚这一小段，外层事务还能继续用
        with db.begin_nested():
            db.execute(
                insert(DailyStat).values(
                    user_id=user_id,
                    stat_date=today,
                    submissions=1,
                    accepted=1 if accepted else 0,
                    problems_solved=1 if solved_new else 0,
                    chapters_done=0,
                    minutes_spent=0,
                )
            )
        return
    except IntegrityError:
        logger.debug("daily_stats 唯一约束冲突，改走自增路径：user=%s date=%s", user_id, today)

    db.execute(
        update(DailyStat)
        .where(*where)
        .values(**_values())
        .execution_options(synchronize_session=False)
    )


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
        task_id: int | None = None
        sub_id: int | None = None
        try:
            with session_scope() as db:
                cand = db.execute(
                    select(JudgeQueue.id, JudgeQueue.submission_id)
                    .where(JudgeQueue.status == "waiting")
                    .order_by(JudgeQueue.priority, JudgeQueue.id)
                    .limit(1)
                ).first()
                if cand:
                    # 认领必须带 status='waiting' 条件：两个 worker 可能同时
                    # 选中同一条，只有一个能把 rowcount 刷成 1。
                    claimed = db.execute(
                        update(JudgeQueue)
                        .where(JudgeQueue.id == cand.id, JudgeQueue.status == "waiting")
                        .values(
                            status="running",
                            worker_id=worker_id,
                            started_at=engine.now_utc(),
                        )
                        .execution_options(synchronize_session=False)
                    )
                    if claimed.rowcount == 1:
                        task_id = cand.id
                        sub_id = cand.submission_id

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
