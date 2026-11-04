"""ORM 数据模型。

共 18 张表，覆盖：用户与权限、知识内容、题库与测试点、
学习过程、评测记录、互动社区、系统运维。

所有时间字段统一存 UTC 时区的 datetime，前端负责本地化展示。
"""

from __future__ import annotations

import enum
from datetime import date, datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# =====================================================================
# 枚举
# =====================================================================


class UserRole(str, enum.Enum):
    """角色。只有两级：站长与访客。

    不再设 teacher 之类的中间角色 —— 多一级就要多一套对应的功能与界面，
    没有真实使用方就不要留空壳。
    """

    STUDENT = "student"   # 普通学员：学习、做题、讨论
    ADMIN = "admin"       # 管理员：维护题库与用户


class ProgressStatus(str, enum.Enum):
    """章节学习状态。"""

    NOT_STARTED = "not_started"
    LEARNING = "learning"
    DONE = "done"


class JudgeStatus(str, enum.Enum):
    """评测状态。与主流 OJ 的判定口径保持一致。"""

    PENDING = "pending"            # 排队中
    COMPILING = "compiling"        # 编译中
    RUNNING = "running"            # 运行中
    ACCEPTED = "accepted"          # 通过
    WRONG_ANSWER = "wrong_answer"  # 答案错误
    TIME_LIMIT = "time_limit"      # 超时
    MEMORY_LIMIT = "memory_limit"  # 超内存
    RUNTIME_ERROR = "runtime_error"        # 运行错误
    COMPILE_ERROR = "compile_error"        # 编译错误
    SYSTEM_ERROR = "system_error"          # 系统错误（评测机异常）
    OUTPUT_LIMIT = "output_limit"          # 输出超限


# =====================================================================
# 一、用户与权限
# =====================================================================


class User(Base):
    """用户表。

    密码只存 bcrypt 哈希，永不落明文。软删除用 is_active 标记，
    避免删除用户导致提交记录外键断裂。
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)

    display_name: Mapped[str] = mapped_column(String(64), default="")
    avatar: Mapped[str] = mapped_column(String(256), default="")
    school: Mapped[str] = mapped_column(String(128), default="")
    bio: Mapped[str] = mapped_column(String(256), default="")

    role: Mapped[str] = mapped_column(String(16), default=UserRole.STUDENT.value, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    last_login_ip: Mapped[str] = mapped_column(String(64), default="")

    # 学习目标：目标赛事、每周计划时长（分钟）
    target_contest: Mapped[str] = mapped_column(String(64), default="")
    weekly_goal_minutes: Mapped[int] = mapped_column(Integer, default=300)

    submissions: Mapped[list["Submission"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    progresses: Mapped[list["Progress"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN.value


class AuditLog(Base):
    """操作审计日志。后台的每一次写操作都留痕，方便追责。"""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), default=None, index=True)
    username: Mapped[str] = mapped_column(String(32), default="")

    action: Mapped[str] = mapped_column(String(64), index=True)        # 如 problem.create
    target_type: Mapped[str] = mapped_column(String(32), default="")   # 如 problem
    target_id: Mapped[str] = mapped_column(String(32), default="")
    detail: Mapped[str] = mapped_column(Text, default="")
    ip: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


# =====================================================================
# 二、知识内容
# =====================================================================


class Stage(Base):
    """学习阶段。共 7 个阶段，从 C++ 基础到实战冲刺。"""

    __tablename__ = "stages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(8), unique=True)          # 01 ~ 07
    title: Mapped[str] = mapped_column(String(64))
    subtitle: Mapped[str] = mapped_column(String(256), default="")
    icon: Mapped[str] = mapped_column(String(32), default="")
    order_no: Mapped[int] = mapped_column(Integer, default=0, index=True)

    chapters: Mapped[list["Chapter"]] = relationship(back_populates="stage", cascade="all, delete-orphan")


class Chapter(Base):
    """知识专题。正文以结构化 JSON 存储，前端按区块渲染。

    body 的每个元素形如 {"t": "md", "c": "..."} 或 {"t": "code", ...}，
    这样同一份数据既能渲染网页，也能导出成 PDF 手册。
    """

    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stage_code: Mapped[str] = mapped_column(String(8), ForeignKey("stages.code", ondelete="CASCADE"), index=True)
    order_no: Mapped[int] = mapped_column(Integer, default=0, index=True)

    title: Mapped[str] = mapped_column(String(128))
    subtitle: Mapped[str] = mapped_column(String(256), default="")
    goals: Mapped[list] = mapped_column(JSON, default=list)       # 学习目标列表
    body: Mapped[list] = mapped_column(JSON, default=list)        # 正文区块
    key_points: Mapped[list] = mapped_column(JSON, default=list)  # 考点提炼

    est_minutes: Mapped[int] = mapped_column(Integer, default=30)
    difficulty: Mapped[int] = mapped_column(Integer, default=2)   # 1~5
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    stage: Mapped["Stage"] = relationship(back_populates="chapters")
    problems: Mapped[list["Problem"]] = relationship(back_populates="chapter")

    @property
    def quiz_count(self) -> int:
        return sum(1 for s in (self.body or []) if s.get("t") == "quiz")

    @property
    def code_count(self) -> int:
        return sum(1 for s in (self.body or []) if s.get("t") == "code")


# =====================================================================
# 三、题库与测试点
# =====================================================================


class Problem(Base):
    """题目表。

    ref_chapter 指向推荐先修的章节；前端在题目页顶部会提示
    "这题考的是第 N 节"，做不出来能一键跳回去重看。
    """

    __tablename__ = "problems"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_name: Mapped[str] = mapped_column(String(32), index=True)
    title: Mapped[str] = mapped_column(String(128), index=True)
    difficulty: Mapped[str] = mapped_column(String(16), default="easy", index=True)
    difficulty_name: Mapped[str] = mapped_column(String(16), default="简单")
    difficulty_score: Mapped[int] = mapped_column(Integer, default=1)   # 1~5，用于组卷权重

    description: Mapped[str] = mapped_column(Text, default="")
    input_format: Mapped[str] = mapped_column(Text, default="")
    output_format: Mapped[str] = mapped_column(Text, default="")
    constraints: Mapped[str] = mapped_column(Text, default="")
    hint: Mapped[str] = mapped_column(Text, default="")
    reference_code: Mapped[str] = mapped_column(Text, default="")
    pitfall: Mapped[str] = mapped_column(Text, default="")
    note_text: Mapped[str] = mapped_column(Text, default="")

    samples: Mapped[list] = mapped_column(JSON, default=list)   # [[输入, 输出], ...]
    tags: Mapped[list] = mapped_column(JSON, default=list)

    ref_chapter: Mapped[int | None] = mapped_column(ForeignKey("chapters.id", ondelete="SET NULL"), default=None)
    time_limit: Mapped[int] = mapped_column(Integer, default=2000)      # 毫秒
    memory_limit: Mapped[int] = mapped_column(Integer, default=256)     # MB

    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(128), default="")

    submit_count: Mapped[int] = mapped_column(Integer, default=0)
    accept_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    chapter: Mapped["Chapter | None"] = relationship(back_populates="problems")
    test_cases: Mapped[list["TestCase"]] = relationship(back_populates="problem", cascade="all, delete-orphan")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="problem", cascade="all, delete-orphan")
    comments: Mapped[list["Comment"]] = relationship(back_populates="problem", cascade="all, delete-orphan")

    @property
    def accept_rate(self) -> float:
        if not self.submit_count:
            return 0.0
        return round(self.accept_count * 100.0 / self.submit_count, 1)


class TestCase(Base):
    """测试点。

    样例（is_sample=True）对用户可见，用于自测；
    隐藏测试点用于正式评测打分，用户看不到输入输出。
    """

    __tablename__ = "test_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    problem_id: Mapped[int] = mapped_column(ForeignKey("problems.id", ondelete="CASCADE"), index=True)
    order_no: Mapped[int] = mapped_column(Integer, default=0)

    input_data: Mapped[str] = mapped_column(Text, default="")
    expected_output: Mapped[str] = mapped_column(Text, default="")
    score: Mapped[int] = mapped_column(Integer, default=10)
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)
    explanation: Mapped[str] = mapped_column(String(256), default="")

    problem: Mapped["Problem"] = relationship(back_populates="test_cases")


# =====================================================================
# 四、学习过程
# =====================================================================


class Progress(Base):
    """章节学习进度。一个用户对一个章节只有一条记录。"""

    __tablename__ = "progresses"
    __table_args__ = (UniqueConstraint("user_id", "chapter_id", name="uq_progress_user_chapter"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id", ondelete="CASCADE"), index=True)

    status: Mapped[str] = mapped_column(String(16), default=ProgressStatus.NOT_STARTED.value)
    seconds_spent: Mapped[int] = mapped_column(Integer, default=0)
    scroll_percent: Mapped[int] = mapped_column(Integer, default=0)
    quiz_total: Mapped[int] = mapped_column(Integer, default=0)
    quiz_correct: Mapped[int] = mapped_column(Integer, default=0)

    first_open_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    user: Mapped["User"] = relationship(back_populates="progresses")
    chapter: Mapped["Chapter"] = relationship()

    @property
    def quiz_accuracy(self) -> float:
        if not self.quiz_total:
            return 0.0
        return round(self.quiz_correct * 100.0 / self.quiz_total, 1)


class QuizAttempt(Base):
    """单次自测题作答。用于分析"哪类概念反复答错"。"""

    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id", ondelete="CASCADE"), index=True)
    section_index: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped[str] = mapped_column(Text, default="")
    chosen: Mapped[int] = mapped_column(Integer, default=-1)
    answer: Mapped[int] = mapped_column(Integer, default=-1)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class Bookmark(Base):
    """题目收藏。"""

    __tablename__ = "bookmarks"
    __table_args__ = (UniqueConstraint("user_id", "problem_id", name="uq_bookmark"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    problem_id: Mapped[int] = mapped_column(ForeignKey("problems.id", ondelete="CASCADE"), index=True)
    note: Mapped[str] = mapped_column(String(256), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Note(Base):
    """个人笔记。可挂在章节或题目上。"""

    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    chapter_id: Mapped[int | None] = mapped_column(ForeignKey("chapters.id", ondelete="CASCADE"), default=None)
    problem_id: Mapped[int | None] = mapped_column(ForeignKey("problems.id", ondelete="CASCADE"), default=None)
    title: Mapped[str] = mapped_column(String(128), default="")
    content: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


# =====================================================================
# 五、评测记录
# =====================================================================


class Submission(Base):
    """提交记录。一次提交对应一条，包含总分和耗时统计。"""

    __tablename__ = "submissions"
    __table_args__ = (
        Index("ix_sub_user_problem", "user_id", "problem_id"),
        Index("ix_sub_created", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    problem_id: Mapped[int] = mapped_column(ForeignKey("problems.id", ondelete="CASCADE"), index=True)

    language: Mapped[str] = mapped_column(String(16), default="cpp")
    code: Mapped[str] = mapped_column(Text, nullable=False)
    code_length: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[str] = mapped_column(String(24), default=JudgeStatus.PENDING.value, index=True)
    score: Mapped[int] = mapped_column(Integer, default=0)
    max_score: Mapped[int] = mapped_column(Integer, default=100)

    time_ms: Mapped[int] = mapped_column(Integer, default=0)         # 最慢测试点
    memory_kb: Mapped[int] = mapped_column(Integer, default=0)       # 峰值内存
    compile_message: Mapped[str] = mapped_column(Text, default="")
    judge_message: Mapped[str] = mapped_column(Text, default="")
    compiler: Mapped[str] = mapped_column(String(64), default="")
    judge_time_ms: Mapped[int] = mapped_column(Integer, default=0)   # 评测本身耗时

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    judged_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)

    user: Mapped["User"] = relationship(back_populates="submissions")
    problem: Mapped["Problem"] = relationship(back_populates="submissions")
    results: Mapped[list["TestResult"]] = relationship(back_populates="submission", cascade="all, delete-orphan")


class TestResult(Base):
    """单个测试点的评测结果。"""

    __tablename__ = "test_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    case_id: Mapped[int | None] = mapped_column(ForeignKey("test_cases.id", ondelete="SET NULL"), default=None)
    order_no: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[str] = mapped_column(String(24), default=JudgeStatus.PENDING.value)
    time_ms: Mapped[int] = mapped_column(Integer, default=0)
    memory_kb: Mapped[int] = mapped_column(Integer, default=0)
    score: Mapped[int] = mapped_column(Integer, default=0)
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)

    stdin_excerpt: Mapped[str] = mapped_column(Text, default="")
    expected_excerpt: Mapped[str] = mapped_column(Text, default="")
    actual_excerpt: Mapped[str] = mapped_column(Text, default="")
    message: Mapped[str] = mapped_column(Text, default="")

    submission: Mapped["Submission"] = relationship(back_populates="results")


# =====================================================================
# 六、互动社区
# =====================================================================


class Comment(Base):
    """题解与讨论。parent_id 非空表示是一条回复。"""

    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    problem_id: Mapped[int] = mapped_column(ForeignKey("problems.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), default=None)

    content: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), default="discuss")   # discuss / solution
    likes: Mapped[int] = mapped_column(Integer, default=0)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    problem: Mapped["Problem"] = relationship(back_populates="comments")
    user: Mapped["User"] = relationship()
    replies: Mapped[list["Comment"]] = relationship(cascade="all, delete-orphan")


class CommentLike(Base):
    """评论点赞。同一用户对同一条评论只能点一次。"""

    __tablename__ = "comment_likes"
    __table_args__ = (UniqueConstraint("comment_id", "user_id", name="uq_comment_like"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    comment_id: Mapped[int] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# =====================================================================
# 七、统计与运维
# =====================================================================


class DailyStat(Base):
    """每日学习统计。学习曲线、热力图都从这里取数。

    不用实时聚合，是因为做题峰值时实时聚合会拖慢接口；
    每天凌晨跑一次补偿任务即可。
    """

    __tablename__ = "daily_stats"
    __table_args__ = (UniqueConstraint("user_id", "stat_date", name="uq_daily_user_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    stat_date: Mapped[date] = mapped_column(Date, index=True)

    submissions: Mapped[int] = mapped_column(Integer, default=0)
    accepted: Mapped[int] = mapped_column(Integer, default=0)
    chapters_done: Mapped[int] = mapped_column(Integer, default=0)
    minutes_spent: Mapped[int] = mapped_column(Integer, default=0)
    problems_solved: Mapped[int] = mapped_column(Integer, default=0)


class Announcement(Base):
    """系统公告。首页横幅展示。"""

    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(128))
    content: Mapped[str] = mapped_column(Text, default="")
    level: Mapped[str] = mapped_column(String(16), default="info")   # info / warn / danger
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)


class SystemConfig(Base):
    """键值配置。管理员可以在后台改，不用重启服务。"""

    __tablename__ = "system_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(String(256), default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class LoginAttempt(Base):
    """登录尝试记录。连续失败 5 次锁定 10 分钟，防暴力破解。"""

    __tablename__ = "login_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), index=True)
    ip: Mapped[str] = mapped_column(String(64), default="")
    success: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class JudgeQueue(Base):
    """评测队列。落库而不是放内存，服务重启后任务不丢。"""

    __tablename__ = "judge_queue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    priority: Mapped[int] = mapped_column(Integer, default=5)     # 数字越小越先跑
    status: Mapped[str] = mapped_column(String(16), default="waiting", index=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    worker_id: Mapped[str] = mapped_column(String(32), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)


class UserSkillStat(Base):
    """知识点掌握度。雷达图的数据源。

    score 由三部分加权得出：章节自测正确率 40%、关联题目通过率 40%、
    学习时长完成度 20%。权重写死在 services/analytics.py 里，方便讲解。
    """

    __tablename__ = "user_skill_stats"
    __table_args__ = (UniqueConstraint("user_id", "stage_code", name="uq_skill_user_stage"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    stage_code: Mapped[str] = mapped_column(String(8), index=True)

    chapters_total: Mapped[int] = mapped_column(Integer, default=0)
    chapters_done: Mapped[int] = mapped_column(Integer, default=0)
    quiz_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    problem_pass_rate: Mapped[float] = mapped_column(Float, default=0.0)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
