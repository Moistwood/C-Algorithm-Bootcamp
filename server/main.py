"""FastAPI 应用入口。

启动流程：
    1. 建目录
    2. 建表
    3. 首次启动导入种子数据（章节 / 题目 / 阶段）
    4. 恢复上次异常中断的评测任务
    5. 启动评测 worker 线程

运行：
    python -m server.main
    或
    uvicorn server.main:app --reload --port 8000
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import BASE_DIR, ensure_dirs, settings
from .database import init_db
from .routers import admin, auth, comments, content, judge, progress, stats, users
from .services import judge as engine
from .services import runner

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("algo")


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_dirs()
    logger.info("初始化数据库：%s", settings.database_url)

    from .seed import ensure_seed_data

    init_db()
    ensure_seed_data()

    recovered = runner.recover_stuck_tasks()
    if recovered:
        logger.info("恢复了 %d 个中断的评测任务", recovered)

    info = engine.compiler_info()
    if info["available"]:
        logger.info("编译器就绪：%s  (%s)", info["version"], info["path"])
    else:
        logger.warning("未找到 g++，评测功能不可用。请运行：python setup-toolchain.py")

    runner.start_workers()

    logger.info("%s v%s 启动完成 → http://127.0.0.1:8000", settings.app_name, settings.app_version)
    yield

    runner.stop_workers()
    logger.info("服务已停止")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "C++ 算法竞赛特训与在线评测系统的后端服务。\n\n"
        "功能模块：用户认证、知识内容、在线评测、学习进度、统计分析、题解讨论、管理后台。"
    ),
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------
# 全局异常处理：统一返回 {ok, detail} 结构
# ---------------------------------------------------------------------


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"ok": False, "detail": exc.detail, "code": exc.status_code},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first = errors[0] if errors else {}
    field = ".".join(str(x) for x in first.get("loc", [])[1:]) or "参数"
    msg = first.get("msg", "参数校验失败")
    return JSONResponse(
        status_code=422,
        content={"ok": False, "detail": "%s：%s" % (field, msg), "code": 422, "errors": errors},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("未处理异常 %s %s", request.method, request.url.path)
    detail = str(exc) if settings.debug else "服务器内部错误"
    return JSONResponse(status_code=500, content={"ok": False, "detail": detail, "code": 500})


# ---------------------------------------------------------------------
# 路由注册
# ---------------------------------------------------------------------

for r in (auth.router, content.router, judge.router, progress.router,
          stats.router, comments.router, users.router, admin.router):
    app.include_router(r)


@app.get("/api/health", tags=["系统"], summary="健康检查")
def health() -> dict:
    info = engine.compiler_info()
    return {
        "ok": True,
        "app": settings.app_name,
        "version": settings.app_version,
        "judge": {
            "enabled": settings.judge_enabled and info["available"],
            "compiler": info["version"],
        },
        "queue": runner.queue_length(),
    }


# ---------------------------------------------------------------------
# 兼容旧版前端的接口
# 早期版本用独立的 judge.py 提供 /api/ping 与 /api/run，
# 这里保留同名路由，前端 assets/judge.js 不用改也能跑。
# ---------------------------------------------------------------------


@app.get("/api/ping", tags=["系统"], summary="评测机探活（兼容旧版）")
def legacy_ping() -> dict:
    info = engine.compiler_info()
    return {
        "ok": bool(info["available"]),
        "ready": bool(info["available"]),
        "compiler": info["version"],
        "path": info["path"],
        "standard": settings.judge_cpp_standard,
        "optimize": settings.judge_optimize,
        "timeLimit": settings.judge_default_time_limit,
        "version": settings.app_version,
    }


@app.post("/api/run", tags=["系统"], summary="自由运行（兼容旧版）")
def legacy_run(payload: dict) -> dict:
    """允许匿名调用，方便本地单人使用时不强制注册。

    只要服务不暴露到公网就没有风险；要上线的话把 judge_enabled 关掉，
    或者在前面加一层 Nginx 的访问控制。
    """
    from .services import judge as _engine

    if not settings.judge_enabled:
        return {
            "status": "system_error", "statusName": "评测功能已关闭",
            "stdout": "", "stderr": "", "compileMessage": "服务器已关闭评测功能。",
            "time": 0, "compileMs": 0, "exitCode": -1,
        }

    code = payload.get("code") or ""
    stdin = payload.get("stdin") or ""
    limit = int(payload.get("timeLimit") or payload.get("time_limit") or settings.judge_default_time_limit)
    limit = max(200, min(limit, 10_000))

    r = _engine.run_once(code, stdin, limit)
    return {
        "status": r["status"],
        "statusName": r["status_name"],
        "stdout": r["stdout"],
        "stderr": r["stderr"],
        "compileMessage": r["compile_message"],
        "time": r["time_ms"],
        "compileMs": r["compile_ms"],
        "exitCode": r["exit_code"],
        "memory": r.get("memory_kb", 0),
    }


@app.get("/api/meta", tags=["系统"], summary="站点元信息")
def meta() -> dict:
    """前端启动时拉一次，用于展示版本号和公告。"""
    from sqlalchemy import func, select

    from .database import session_scope
    from .models import Announcement, Chapter, Problem, User

    with session_scope() as db:
        announcements = db.scalars(
            select(Announcement).where(Announcement.is_active.is_(True)).order_by(Announcement.id.desc()).limit(3)
        ).all()
        stats_data = {
            "chapters": db.scalar(select(func.count(Chapter.id))),
            "problems": db.scalar(select(func.count(Problem.id))),
            "users": db.scalar(select(func.count(User.id))),
        }
        ann = [
            {"id": a.id, "title": a.title, "content": a.content, "level": a.level}
            for a in announcements
        ]

    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "announcements": ann,
        "stats": stats_data,
    }


# ---------------------------------------------------------------------
# 静态文件
# ---------------------------------------------------------------------


def _mount_static() -> None:
    assets_dir = BASE_DIR / "assets"
    data_dir = BASE_DIR / "data"

    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
    if data_dir.is_dir():
        app.mount("/data", StaticFiles(directory=str(data_dir)), name="data")

    # 前端构建产物（如果之后改成打包版本）
    dist = BASE_DIR / "static"
    if dist.is_dir():
        app.mount("/static", StaticFiles(directory=str(dist)), name="static")


_mount_static()


@app.get("/", include_in_schema=False)
def index_page():
    p: Path = BASE_DIR / "index.html"
    if p.is_file():
        return FileResponse(p)
    return JSONResponse({"ok": True, "message": "前端页面未找到，接口文档见 /api/docs"})


@app.get("/index.html", include_in_schema=False)
def index_page_alias():
    """显式支持 /index.html，避免用户直接输入这个地址时 404。"""
    return index_page()


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    p = BASE_DIR / "assets" / "favicon.ico"
    if p.is_file():
        return FileResponse(p)
    return JSONResponse(status_code=204, content=None)


def main() -> None:
    import uvicorn

    uvicorn.run(
        "server.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info",
    )


if __name__ == "__main__":
    main()
