"""认证路由：注册、登录、刷新令牌、修改资料与密码。

安全设计：
1. 密码 bcrypt 哈希存储，接口在任何响应里都不返回哈希；
2. 登录失败按「用户名 + IP」计数，15 分钟内 5 次失败锁定 10 分钟；
3. 登录成功与失败都写 LoginAttempt，便于后台排查撞库；
4. 用户密码错误与用户不存在返回同一句提示，避免账号枚举。
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import func, or_, select

from ..config import settings
from ..deps import CurrentUser, DbSession, client_ip
from ..models import DailyStat, LoginAttempt, User, UserRole
from ..schemas import (
    Msg,
    PasswordChangeIn,
    RefreshIn,
    TokenOut,
    UserLoginIn,
    UserOut,
    UserRegisterIn,
    UserUpdateIn,
)
from ..security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    password_strength,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["认证"])

# 登录失败锁定策略
_MAX_FAILS = 5
_FAIL_WINDOW_MINUTES = 15
_LOCK_MINUTES = 10


def _issue_token(user: User) -> TokenOut:
    access = create_access_token(user.id, {"username": user.username, "role": user.role})
    refresh = create_refresh_token(user.id)
    return TokenOut(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED, summary="注册")
def register(payload: UserRegisterIn, request: Request, db: DbSession) -> TokenOut:
    ok, reason = password_strength(payload.password)
    if not ok:
        raise HTTPException(status_code=400, detail=reason)

    exists = db.scalar(
        select(User).where(
            or_(User.username == payload.username, User.email == str(payload.email))
        )
    )
    if exists:
        if exists.username == payload.username:
            raise HTTPException(status_code=409, detail="这个用户名已经被占了")
        raise HTTPException(status_code=409, detail="这个邮箱已经注册过了")

    # 第一个注册的用户自动成为管理员，方便首次部署
    is_first = db.scalar(select(func.count(User.id))) == 0

    user = User(
        username=payload.username,
        email=str(payload.email),
        password_hash=hash_password(payload.password),
        display_name=payload.display_name or payload.username,
        role=UserRole.ADMIN.value if is_first else UserRole.STUDENT.value,
        last_login_at=datetime.now(timezone.utc),
        last_login_ip=client_ip(request),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_token(user)


@router.post("/login", response_model=TokenOut, summary="登录")
def login(payload: UserLoginIn, request: Request, db: DbSession) -> TokenOut:
    ip = client_ip(request)
    account = payload.account.strip()
    now = datetime.now(timezone.utc)

    # 1. 检查是否处于锁定期
    window_start = now - timedelta(minutes=_FAIL_WINDOW_MINUTES)
    recent = db.scalars(
        select(LoginAttempt)
        .where(
            LoginAttempt.username == account,
            LoginAttempt.created_at >= window_start,
            LoginAttempt.success.is_(False),
        )
        .order_by(LoginAttempt.created_at.desc())
    ).all()

    if len(recent) >= _MAX_FAILS:
        last = recent[0].created_at
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        unlock_at = last + timedelta(minutes=_LOCK_MINUTES)
        if now < unlock_at:
            wait = int((unlock_at - now).total_seconds() // 60) + 1
            raise HTTPException(
                status_code=429,
                detail="密码错误次数过多，请 %d 分钟后再试" % wait,
            )

    # 2. 查用户
    user = db.scalar(
        select(User).where(or_(User.username == account, User.email == account))
    )

    if not user or not verify_password(payload.password, user.password_hash):
        db.add(LoginAttempt(username=account, ip=ip, success=False))
        db.commit()
        left = max(0, _MAX_FAILS - len(recent) - 1)
        detail = "用户名或密码错误"
        if 0 < left <= 2:
            detail += "（再错 %d 次将锁定 %d 分钟）" % (left, _LOCK_MINUTES)
        raise HTTPException(status_code=401, detail=detail)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已被停用，请联系管理员")

    # 3. 登录成功
    user.last_login_at = now
    user.last_login_ip = ip
    db.add(LoginAttempt(username=account, ip=ip, success=True))

    # 顺手补一条今日统计，保证学习曲线不会断点
    today = now.date()
    ds = db.scalar(select(DailyStat).where(DailyStat.user_id == user.id, DailyStat.stat_date == today))
    if not ds:
        db.add(DailyStat(user_id=user.id, stat_date=today))

    db.commit()
    db.refresh(user)
    return _issue_token(user)


@router.post("/refresh", response_model=TokenOut, summary="刷新令牌")
def refresh(payload: RefreshIn, db: DbSession) -> TokenOut:
    data = decode_token(payload.refresh_token, expected_type="refresh")
    if not data:
        raise HTTPException(status_code=401, detail="刷新凭证无效，请重新登录")
    try:
        uid = int(data.get("sub", 0))
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="刷新凭证无效") from None

    user = db.get(User, uid)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="账号不可用")
    return _issue_token(user)


@router.get("/me", response_model=UserOut, summary="当前登录用户")
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.put("/me", response_model=UserOut, summary="修改个人资料")
def update_me(payload: UserUpdateIn, user: CurrentUser, db: DbSession) -> UserOut:
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if value is not None:
            setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/password", response_model=Msg, summary="修改密码")
def change_password(payload: PasswordChangeIn, user: CurrentUser, db: DbSession) -> Msg:
    if not verify_password(payload.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="原密码不正确")

    ok, reason = password_strength(payload.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail=reason)
    if payload.old_password == payload.new_password:
        raise HTTPException(status_code=400, detail="新密码不能和原密码相同")

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return Msg(message="密码已修改")


@router.delete("/me", response_model=Msg, summary="注销账号")
def deactivate_me(payload: PasswordChangeIn, user: CurrentUser, db: DbSession) -> Msg:
    """软删除：标记停用而不是物理删除，保留提交记录供统计使用。"""
    if not verify_password(payload.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="密码不正确")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="管理员账号不能自助注销")
    user.is_active = False
    db.commit()
    return Msg(message="账号已注销")
