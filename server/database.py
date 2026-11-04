"""数据库连接与会话管理。

默认使用 SQLite（零配置、单文件、方便演示）。
只要把 ALGO_DATABASE_URL 换成 PostgreSQL 连接串即可无缝迁移，
模型层没有使用任何 SQLite 专属语法。
"""

from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    """所有 ORM 模型的基类。"""

    pass


def _build_engine():
    connect_args = {}
    engine_kwargs = {"echo": settings.db_echo, "future": True}

    if settings.is_sqlite:
        # SQLite 默认禁止跨线程复用连接，FastAPI 的线程池需要关掉这个限制
        connect_args["check_same_thread"] = False
        # 评测和 Web 请求可能同时写库，用 WAL 提升并发
        engine_kwargs["connect_args"] = connect_args
    else:
        engine_kwargs.update(pool_size=10, max_overflow=20, pool_pre_ping=True)

    eng = create_engine(settings.database_url, **engine_kwargs)

    if settings.is_sqlite:

        @event.listens_for(eng, "connect")
        def _set_sqlite_pragma(dbapi_conn, _record):  # noqa: ANN001
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA journal_mode=WAL")
            cur.execute("PRAGMA foreign_keys=ON")
            cur.execute("PRAGMA synchronous=NORMAL")
            # API 线程和评测 worker 同时写库时，拿不到写锁的连接默认
            # 立刻报 database is locked。改为等 5 秒再失败，
            # 短暂的写冲突就都能自动消化掉。
            cur.execute("PRAGMA busy_timeout=5000")
            cur.close()

    return eng


engine = _build_engine()

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI 依赖注入用的数据库会话。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """脚本 / 后台任务里用的会话上下文，自动提交与回滚。"""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db(drop: bool = False) -> None:
    """建表。drop=True 会先删掉所有表（仅开发环境用）。"""
    from . import models  # noqa: F401  确保模型已注册到 Base.metadata

    if drop:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
