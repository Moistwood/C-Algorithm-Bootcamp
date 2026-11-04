"""全局配置。

所有配置项都可以通过环境变量覆盖，前缀为 ALGO_，例如：
    ALGO_SECRET_KEY=xxx
    ALGO_DATABASE_URL=postgresql+psycopg://user:pass@localhost/algoboot
"""

from __future__ import annotations

import os
import secrets
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# 项目根目录（server/ 的上一级）
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
STATIC_DIR = BASE_DIR / "static"
RUNTIME_DIR = BASE_DIR / "runtime"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="ALGO_",
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ---------- 基本信息 ----------
    app_name: str = "C++ 算法竞赛特训与在线评测系统"
    app_version: str = "2.0.0"
    debug: bool = True

    # ---------- 数据库 ----------
    # 默认 SQLite，放在 runtime/ 下，不污染仓库
    database_url: str = f"sqlite:///{(RUNTIME_DIR / 'app.db').as_posix()}"
    db_echo: bool = False

    # ---------- 安全 ----------
    # 留空则首次启动自动生成随机密钥，存到 runtime/secret.key。
    # 不要写死默认值：仓库是公开的，写死的密钥等于没有密钥，
    # 任何人拿代码就能伪造管理员 token。
    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7      # 7 天
    refresh_token_expire_minutes: int = 60 * 24 * 30   # 30 天
    password_min_length: int = 6

    # ---------- 评测 ----------
    judge_enabled: bool = True
    judge_work_dir: str = str(RUNTIME_DIR / "judge")
    judge_compile_timeout: int = 40          # 秒
    judge_default_time_limit: int = 2000     # 毫秒
    judge_max_output: int = 512 * 1024       # 单次输出上限 512KB
    judge_max_concurrent: int = 2            # 同时编译运行的提交数
    judge_cpp_standard: str = "c++14"
    judge_optimize: str = "-O2"

    # 提交频率限制：同一用户两次提交的最小间隔，以及每分钟上限
    judge_submit_interval: float = 3.0
    judge_submit_per_minute: int = 12

    # 编译器路径，留空则自动探测
    gpp_path: str = ""

    # ---------- 分页 ----------
    page_size_default: int = 20
    page_size_max: int = 100

    # ---------- 跨域 ----------
    cors_origins: str = "*"

    @property
    def cors_origin_list(self) -> list[str]:
        raw = (self.cors_origins or "").strip()
        if not raw or raw == "*":
            return ["*"]
        return [x.strip() for x in raw.split(",") if x.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    s = Settings()
    s.secret_key = _resolve_secret_key(s.secret_key)
    return s


def _resolve_secret_key(configured: str) -> str:
    """拿到签名密钥：环境变量优先，否则读/生成 runtime 下的密钥文件。

    持久化到文件是为了重启后已发出的 token 不失效；文件权限尽量收紧，
    并且 runtime/ 已在 .gitignore 里，不会被提交。
    """
    key = (configured or "").strip()
    if key:
        return key

    key_file = RUNTIME_DIR / "secret.key"
    if key_file.is_file():
        try:
            saved = key_file.read_text(encoding="utf-8").strip()
            if saved:
                return saved
        except OSError:
            pass

    key = secrets.token_urlsafe(48)
    try:
        key_file.write_text(key, encoding="utf-8")
        os.chmod(key_file, 0o600)
    except OSError:
        # 磁盘不可写时至少保证本次进程有随机密钥，不至于退回公开默认值
        pass
    return key


settings = get_settings()


def ensure_dirs() -> None:
    """确保运行期需要的目录都存在。"""
    for d in (RUNTIME_DIR, Path(settings.judge_work_dir), DATA_DIR):
        Path(d).mkdir(parents=True, exist_ok=True)
