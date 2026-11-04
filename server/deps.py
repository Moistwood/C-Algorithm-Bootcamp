"""FastAPI 依赖注入。

认证走 HTTP Bearer Token。也支持 ?token= 查询参数，
方便在浏览器地址栏里直接调试接口（仅开发环境）。
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import AuditLog, User, UserRole
from .security import decode_token

bearer_scheme = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def _extract_token(request: Request, cred: HTTPAuthorizationCredentials | None) -> str | None:
    if cred and cred.scheme.lower() == "bearer" and cred.credentials:
        return cred.credentials
    # 兜底：查询参数（仅调试用）
    if settings.debug:
        return request.query_params.get("token")
    return None


def get_current_user(
    request: Request,
    db: DbSession,
    cred: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User:
    token = _extract_token(request, cred)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未登录或登录已过期",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token, expected_type="access")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录凭证无效，请重新登录",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        uid = int(payload.get("sub", 0))
    except (TypeError, ValueError):
        uid = 0

    user = db.get(User, uid)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账号已被停用")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_optional_user(
    request: Request,
    db: DbSession,
    cred: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User | None:
    """允许匿名访问的接口用。未登录返回 None 而不是报错。"""
    token = _extract_token(request, cred)
    if not token:
        return None
    payload = decode_token(token, expected_type="access")
    if not payload:
        return None
    try:
        uid = int(payload.get("sub", 0))
    except (TypeError, ValueError):
        return None
    user = db.get(User, uid)
    if not user or not user.is_active:
        return None
    return user


OptionalUser = Annotated[User | None, Depends(get_optional_user)]


def require_roles(*roles: str):
    """生成一个「必须属于指定角色之一」的依赖。"""

    allowed = {r for r in roles}

    def _checker(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="权限不足")
        return user

    return _checker


require_admin = require_roles(UserRole.ADMIN.value)

AdminUser = Annotated[User, Depends(require_admin)]


class Pagination:
    """统一分页参数。"""

    def __init__(
        self,
        page: int = Query(1, ge=1, le=10_000, description="页码，从 1 开始"),
        size: int = Query(0, ge=0, le=100, description="每页条数，0 表示用默认值"),
    ) -> None:
        self.page = page
        self.size = size or settings.page_size_default
        self.offset = (self.page - 1) * self.size
        self.limit = min(self.size, settings.page_size_max)


PageQuery = Annotated[Pagination, Depends(Pagination)]


def client_ip(request: Request) -> str:
    """取真实客户端 IP。优先 X-Forwarded-For，兼容反向代理。"""
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    real = request.headers.get("x-real-ip", "")
    if real:
        return real.strip()
    return request.client.host if request.client else ""


def write_audit(
    db: Session,
    user: User | None,
    action: str,
    target_type: str = "",
    target_id: str | int = "",
    detail: str = "",
    ip: str = "",
) -> None:
    """写审计日志。失败不影响主流程，所以不往外抛异常。"""
    try:
        db.add(
            AuditLog(
                user_id=user.id if user else None,
                username=user.username if user else "anonymous",
                action=action,
                target_type=target_type,
                target_id=str(target_id),
                detail=detail[:2000],
                ip=ip,
            )
        )
        db.flush()
    except Exception:  # noqa: BLE001
        db.rollback()
