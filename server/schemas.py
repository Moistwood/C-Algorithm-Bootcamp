"""Pydantic 请求/响应模型。

分两类：
- XxxIn   前端传来的数据，带严格校验
- XxxOut  返回给前端的数据，绝不包含 password_hash 等敏感字段
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

T = TypeVar("T")


class ORMModel(BaseModel):
    """允许从 ORM 对象直接构造响应体。"""

    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    """统一分页响应。"""

    items: list[T]
    total: int
    page: int
    size: int

    @property
    def pages(self) -> int:
        if self.size <= 0:
            return 0
        return (self.total + self.size - 1) // self.size


class Msg(BaseModel):
    """简单的消息响应。"""

    ok: bool = True
    message: str = ""


# =====================================================================
# 用户与认证
# =====================================================================


class UserRegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=32, description="3-32 位，字母数字下划线")
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    display_name: str = Field(default="", max_length=64)

    @field_validator("username")
    @classmethod
    def _check_username(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("用户名不能为空")
        for ch in v:
            if not (ch.isalnum() or ch == "_"):
                raise ValueError("用户名只能包含字母、数字和下划线")
        return v


class UserLoginIn(BaseModel):
    account: str = Field(description="用户名或邮箱")
    password: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserOut"


class RefreshIn(BaseModel):
    refresh_token: str


class UserOut(ORMModel):
    id: int
    username: str
    email: str
    display_name: str
    avatar: str
    school: str
    bio: str
    role: str
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None = None
    target_contest: str = ""
    weekly_goal_minutes: int = 300


class UserBrief(ORMModel):
    """评论、榜单里展示的简版用户信息。"""

    id: int
    username: str
    display_name: str
    avatar: str
    role: str

    @property
    def shown_name(self) -> str:
        return self.display_name or self.username


class UserUpdateIn(BaseModel):
    display_name: str | None = Field(default=None, max_length=64)
    avatar: str | None = Field(default=None, max_length=256)
    school: str | None = Field(default=None, max_length=128)
    bio: str | None = Field(default=None, max_length=256)
    target_contest: str | None = Field(default=None, max_length=64)
    weekly_goal_minutes: int | None = Field(default=None, ge=0, le=10080)


class PasswordChangeIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6, max_length=72)


class AdminUserUpdateIn(BaseModel):
    role: Literal["student", "admin"] | None = None
    is_active: bool | None = None
    display_name: str | None = None


# =====================================================================
# 知识内容
# =====================================================================


class StageOut(ORMModel):
    id: int
    code: str
    title: str
    subtitle: str
    icon: str
    order_no: int
    chapter_count: int = 0
    done_count: int = 0


class ChapterBrief(ORMModel):
    id: int
    stage_code: str
    order_no: int
    title: str
    subtitle: str
    est_minutes: int
    difficulty: int
    quiz_count: int = 0
    code_count: int = 0


class ChapterOut(ChapterBrief):
    goals: list[Any] = []
    body: list[Any] = []
    key_points: list[Any] = []
    is_published: bool = True
    updated_at: datetime | None = None


class ChapterIn(BaseModel):
    stage_code: str
    order_no: int = 0
    title: str
    subtitle: str = ""
    goals: list[Any] = []
    body: list[Any] = []
    key_points: list[Any] = []
    est_minutes: int = 30
    difficulty: int = 2
    is_published: bool = True


# =====================================================================
# 题目
# =====================================================================


class TestCaseOut(ORMModel):
    id: int
    order_no: int
    score: int
    is_sample: bool
    input_data: str
    expected_output: str
    explanation: str = ""


class TestCaseAdminOut(TestCaseOut):
    """管理员可见，包含全部字段（与 Out 一致，单独保留以便后续加字段）。"""


class TestCaseIn(BaseModel):
    input_data: str = ""
    expected_output: str = ""
    score: int = 10
    is_sample: bool = False
    explanation: str = ""


class ProblemBrief(ORMModel):
    id: int
    group_name: str
    title: str
    difficulty: str
    difficulty_name: str
    ref_chapter: int | None = None
    submit_count: int = 0
    accept_count: int = 0
    tags: list[Any] = []
    # 由服务层填充
    accepted: bool = False
    attempted: bool = False


class ProblemOut(ProblemBrief):
    description: str = ""
    input_format: str = ""
    output_format: str = ""
    constraints: str = ""
    hint: str = ""
    reference_code: str = ""
    pitfall: str = ""
    note_text: str = ""
    samples: list[Any] = []
    time_limit: int = 2000
    memory_limit: int = 256
    source: str = ""
    is_published: bool = True
    accept_rate: float = 0.0
    samples_detail: list[TestCaseOut] = []
    hidden_case_count: int = 0


class ProblemIn(BaseModel):
    group_name: str
    title: str
    difficulty: str = "easy"
    difficulty_name: str = "简单"
    difficulty_score: int = 1
    description: str = ""
    input_format: str = ""
    output_format: str = ""
    constraints: str = ""
    hint: str = ""
    reference_code: str = ""
    pitfall: str = ""
    note_text: str = ""
    samples: list[Any] = []
    tags: list[Any] = []
    ref_chapter: int | None = None
    time_limit: int = 2000
    memory_limit: int = 256
    is_published: bool = True
    source: str = ""


# =====================================================================
# 评测
# =====================================================================


class SubmitIn(BaseModel):
    problem_id: int
    code: str = Field(min_length=1, max_length=100_000)
    language: Literal["cpp"] = "cpp"


class TestResultOut(ORMModel):
    order_no: int
    status: str
    time_ms: int
    memory_kb: int
    score: int
    is_sample: bool
    stdin_excerpt: str = ""
    expected_excerpt: str = ""
    actual_excerpt: str = ""
    message: str = ""


class SubmissionOut(ORMModel):
    id: int
    problem_id: int
    problem_title: str = ""
    user_id: int
    language: str
    status: str
    status_name: str = ""
    score: int
    max_score: int
    time_ms: int
    memory_kb: int
    code_length: int
    compile_message: str = ""
    judge_message: str = ""
    judge_time_ms: int = 0
    created_at: datetime
    judged_at: datetime | None = None
    results: list[TestResultOut] = []


class SubmissionListItem(ORMModel):
    id: int
    problem_id: int
    problem_title: str = ""
    user_id: int
    username: str = ""
    status: str
    status_name: str = ""
    score: int
    time_ms: int
    memory_kb: int
    language: str
    created_at: datetime


class JudgeInfoOut(BaseModel):
    enabled: bool
    compiler: str
    compiler_path: str
    standard: str
    optimize: str
    time_limit: int
    max_output_kb: int
    concurrent: int
    queue_length: int


class RunIn(BaseModel):
    """自由运行（不判分），用于「代码运行器」页面。"""

    code: str = Field(min_length=1, max_length=100_000)
    stdin: str = ""
    time_limit: int = 2000


class RunOut(BaseModel):
    status: str
    status_name: str
    stdout: str = ""
    stderr: str = ""
    compile_message: str = ""
    time_ms: int = 0
    memory_kb: int = 0
    compile_ms: int = 0
    exit_code: int = 0


# =====================================================================
# 进度与统计
# =====================================================================


class ProgressOut(ORMModel):
    chapter_id: int
    status: str
    seconds_spent: int
    scroll_percent: int
    quiz_total: int
    quiz_correct: int
    quiz_accuracy: float = 0.0
    finished_at: datetime | None = None
    updated_at: datetime | None = None


class ProgressIn(BaseModel):
    chapter_id: int
    status: Literal["not_started", "learning", "done"] | None = None
    seconds_delta: int = Field(default=0, ge=0, le=3600)
    scroll_percent: int = Field(default=0, ge=0, le=100)


class QuizAnswerIn(BaseModel):
    chapter_id: int
    section_index: int
    chosen: int
    answer: int


class QuizResultOut(BaseModel):
    correct: bool
    answer: int
    explanation: str = ""


class OverallStatsOut(BaseModel):
    chapters_total: int
    chapters_done: int
    chapter_percent: float
    problems_total: int
    problems_solved: int
    problem_percent: float
    submissions_total: int
    accepted_total: int
    accept_rate: float
    minutes_total: int
    streak_days: int
    today_minutes: int
    weekly_goal_minutes: int
    rank: int = 0
    total_users: int = 0


class StageSkillOut(BaseModel):
    stage_code: str
    stage_title: str
    chapters_total: int
    chapters_done: int
    quiz_accuracy: float
    problem_pass_rate: float
    score: float


class DailyPointOut(BaseModel):
    stat_date: date
    submissions: int
    accepted: int
    minutes: int
    problems_solved: int


class HeatmapCellOut(BaseModel):
    day: date
    value: int
    level: int   # 0~4


class RankingItemOut(BaseModel):
    rank: int
    user_id: int
    username: str
    display_name: str
    avatar: str
    solved: int
    submissions: int
    accept_rate: float
    score: float


class WrongQuestionOut(BaseModel):
    problem_id: int
    title: str
    group_name: str
    attempts: int
    last_status: str
    last_at: datetime


# =====================================================================
# 社区
# =====================================================================


class CommentIn(BaseModel):
    problem_id: int
    content: str = Field(min_length=1, max_length=8000)
    parent_id: int | None = None
    kind: Literal["discuss", "solution"] = "discuss"


class CommentOut(ORMModel):
    id: int
    problem_id: int
    parent_id: int | None = None
    content: str
    kind: str
    likes: int
    is_pinned: bool
    created_at: datetime
    user: UserBrief
    liked: bool = False
    replies: list["CommentOut"] = []


CommentOut.model_rebuild()


# =====================================================================
# 管理后台
# =====================================================================


class AnnouncementIn(BaseModel):
    title: str
    content: str = ""
    level: Literal["info", "warn", "danger"] = "info"
    is_active: bool = True


class AnnouncementOut(ORMModel):
    id: int
    title: str
    content: str
    level: str
    is_active: bool
    created_at: datetime


class ConfigIn(BaseModel):
    key: str
    value: str
    description: str = ""


class ConfigOut(ORMModel):
    key: str
    value: str
    description: str
    updated_at: datetime


class AuditLogOut(ORMModel):
    id: int
    username: str
    action: str
    target_type: str
    target_id: str
    detail: str
    ip: str
    created_at: datetime


class SystemOverviewOut(BaseModel):
    users_total: int
    users_active_today: int
    chapters_total: int
    problems_total: int
    submissions_total: int
    submissions_today: int
    accept_rate: float
    judge_queue: int
    db_size_kb: int
    uptime_seconds: int
