"""种子数据导入。

数据源是 server/content.json —— 由 tools/export_content.js 从 data/*.js 导出。
这样运行时不依赖 Node.js，只需要一个 JSON 文件。

导入策略是幂等的：已存在的阶段/章节/题目按主键更新，不会重复插入，
所以每次启动都可以安全地跑一遍（内容更新后重启即可生效）。
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from sqlalchemy import func, select

from .config import BASE_DIR, settings
from .database import session_scope
from .models import (
    Announcement,
    Chapter,
    Problem,
    Stage,
    SystemConfig,
    TestCase,
    User,
    UserRole,
)
from .security import hash_password

logger = logging.getLogger("algo.seed")

CONTENT_FILE = Path(__file__).resolve().parent / "content.json"


def _load_content() -> dict | None:
    if not CONTENT_FILE.is_file():
        logger.warning("没有找到 %s，跳过种子数据导入", CONTENT_FILE)
        return None
    try:
        return json.loads(CONTENT_FILE.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        logger.error("content.json 解析失败：%s", exc)
        return None


def ensure_seed_data(force: bool = False) -> None:
    data = _load_content()
    if not data:
        return

    with session_scope() as db:
        _seed_stages(db, data.get("stages", []))
        _seed_chapters(db, data.get("chapters", []))
        _seed_problems(db, data.get("problems", []), force=force)
        _seed_admin(db)
        _seed_meta(db)

    logger.info("种子数据就绪")


# ---------------------------------------------------------------------
# 阶段
# ---------------------------------------------------------------------


def _seed_stages(db, stages: list[dict]) -> None:
    if not stages:
        return
    existing = {s.code: s for s in db.scalars(select(Stage)).all()}
    for item in stages:
        code = item.get("code")
        if not code:
            continue
        row = existing.get(code)
        if row:
            row.title = item.get("title", row.title)
            row.subtitle = item.get("subtitle", row.subtitle)
            row.icon = item.get("icon", row.icon)
            row.order_no = item.get("order_no", row.order_no)
        else:
            db.add(
                Stage(
                    code=code,
                    title=item.get("title", code),
                    subtitle=item.get("subtitle", ""),
                    icon=item.get("icon", ""),
                    order_no=item.get("order_no", 0),
                )
            )
    db.flush()


# ---------------------------------------------------------------------
# 章节
# ---------------------------------------------------------------------


def _seed_chapters(db, chapters: list[dict]) -> None:
    if not chapters:
        return
    existing = {c.id: c for c in db.scalars(select(Chapter)).all()}
    created = 0

    valid_stages = {s for (s,) in db.execute(select(Stage.code)).all()}

    for item in chapters:
        cid = item.get("id")
        if not cid:
            continue
        stage_code = item.get("stage_code", "01")
        if stage_code not in valid_stages:
            stage_code = "01"

        row = existing.get(cid)
        if row:
            row.stage_code = stage_code
            row.title = item.get("title", row.title)
            row.subtitle = item.get("subtitle", row.subtitle)
            row.goals = item.get("goals", row.goals)
            row.body = item.get("body", row.body)
            row.key_points = item.get("key_points", row.key_points)
            row.est_minutes = item.get("min", row.est_minutes)
            row.difficulty = item.get("difficulty", row.difficulty)
        else:
            db.add(
                Chapter(
                    id=cid,
                    stage_code=stage_code,
                    order_no=item.get("order_no", cid),
                    title=item.get("title", "未命名"),
                    subtitle=item.get("subtitle", ""),
                    goals=item.get("goals", []),
                    body=item.get("body", []),
                    key_points=item.get("key_points", []),
                    est_minutes=item.get("min", 30),
                    difficulty=item.get("difficulty", 2),
                )
            )
            created += 1

    db.flush()
    if created:
        logger.info("导入 %d 个章节", created)


# ---------------------------------------------------------------------
# 题目
# ---------------------------------------------------------------------


def _seed_problems(db, problems: list[dict], force: bool = False) -> None:
    if not problems:
        return

    valid_chapters = {c for (c,) in db.execute(select(Chapter.id)).all()}
    existing = {p.id: p for p in db.scalars(select(Problem)).all()}
    created = 0

    for item in problems:
        pid = item.get("id")
        if not pid:
            continue

        ref = item.get("ref_chapter")
        if ref is not None and ref not in valid_chapters:
            ref = None

        samples = item.get("samples") or []
        samples = [s for s in samples if isinstance(s, (list, tuple)) and len(s) >= 2]

        payload = dict(
            group_name=item.get("group_name", "未分组"),
            title=item.get("title", "未命名题目"),
            difficulty=item.get("difficulty", "easy"),
            difficulty_name=item.get("difficulty_name", "简单"),
            difficulty_score=item.get("difficulty_score", 1),
            description=item.get("description", ""),
            input_format=item.get("input_format", ""),
            output_format=item.get("output_format", ""),
            constraints=item.get("constraints", ""),
            hint=item.get("hint", ""),
            reference_code=item.get("reference_code", ""),
            pitfall=item.get("pitfall", ""),
            note_text=item.get("note_text", ""),
            samples=samples,
            tags=item.get("tags", []),
            ref_chapter=ref,
            time_limit=item.get("time_limit", 2000),
            source=item.get("source", ""),
        )

        row = existing.get(pid)
        if row:
            for k, v in payload.items():
                setattr(row, k, v)
            problem_row = row
        else:
            problem_row = Problem(id=pid, **payload)
            db.add(problem_row)
            created += 1

        db.flush()

        # 样例转测试点：已有隐藏测试点的不覆盖
        has_hidden = db.scalar(
            select(func.count(TestCase.id)).where(
                TestCase.problem_id == pid, TestCase.is_sample.is_(False)
            )
        ) or 0
        if has_hidden and not force:
            continue

        existing_cases = db.scalar(select(func.count(TestCase.id)).where(TestCase.problem_id == pid)) or 0
        if existing_cases and not force:
            continue

        if samples:
            per = max(1, 100 // len(samples))
            for idx, pair in enumerate(samples, start=1):
                db.add(
                    TestCase(
                        problem_id=pid,
                        order_no=idx,
                        input_data=str(pair[0]),
                        expected_output=str(pair[1]),
                        score=per,
                        is_sample=True,
                        explanation="样例测试点",
                    )
                )

    db.flush()
    if created:
        logger.info("导入 %d 道题目", created)


# ---------------------------------------------------------------------
# 默认管理员
# ---------------------------------------------------------------------


def _seed_admin(db) -> None:
    count = db.scalar(select(func.count(User.id))) or 0
    if count:
        return

    admin = User(
        username="admin",
        email="admin@example.com",
        password_hash=hash_password("admin123"),
        display_name="管理员",
        role=UserRole.ADMIN.value,
        bio="系统默认管理员，请登录后立即修改密码。",
        target_contest="蓝桥杯 C++ A 组",
    )
    db.add(admin)

    demo = User(
        username="demo",
        email="demo@example.com",
        password_hash=hash_password("demo123"),
        display_name="演示账号",
        role=UserRole.STUDENT.value,
        bio="用来演示学习进度和统计图表的账号。",
    )
    db.add(demo)
    db.flush()
    logger.info("创建默认账号：admin / admin123，demo / demo123（请尽快修改密码）")


# ---------------------------------------------------------------------
# 公告与配置
# ---------------------------------------------------------------------


def _seed_meta(db) -> None:
    if not db.scalar(select(func.count(SystemConfig.id))):
        db.add_all([
            SystemConfig(key="site_name", value=settings.app_name, description="站点名称"),
            SystemConfig(key="judge_enabled", value="true", description="是否开放在线评测"),
            SystemConfig(key="register_enabled", value="true", description="是否开放注册"),
            SystemConfig(key="contest_date", value="", description="目标比赛日期，用于倒计时"),
        ])

    if not db.scalar(select(func.count(Announcement.id))):
        db.add(
            Announcement(
                title="欢迎使用",
                content="按左侧目录顺序学习，每节结束的自测题答对再标记完成。做题前先看「思路提示」，卡住超过 20 分钟再看参考代码。",
                level="info",
            )
        )
