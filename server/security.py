"""安全模块：密码哈希、JWT 签发与校验、权限判定。

密码哈希优先使用 bcrypt（带盐、自适应成本）；若环境里 bcrypt 版本
不兼容，则自动降级到标准库的 PBKDF2-HMAC-SHA256，保证服务不会因为
依赖问题起不来。
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt as pyjwt
from jwt.exceptions import InvalidTokenError

from .config import settings

# ---------------------------------------------------------------------
# 密码哈希
# ---------------------------------------------------------------------

_BCRYPT_ROUNDS = 12
_bcrypt_ok = False

try:  # pragma: no cover - 取决于运行环境
    import bcrypt as _bcrypt

    # 先做一次真实调用，确认这个版本的 API 是我们要的
    _probe = _bcrypt.hashpw(b"probe", _bcrypt.gensalt(rounds=4))
    _bcrypt_ok = _bcrypt.checkpw(b"probe", _probe)
except Exception:  # noqa: BLE001
    _bcrypt_ok = False


def hash_password(plain: str) -> str:
    """把明文密码转成可存库的哈希串。"""
    if _bcrypt_ok:
        salt = _bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
        return _bcrypt.hashpw(plain.encode("utf-8"), salt).decode("ascii")
    return _pbkdf2_hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """校验明文与哈希是否匹配。任何异常都视为不匹配。"""
    if not plain or not hashed:
        return False
    try:
        if hashed.startswith("$2"):
            if not _bcrypt_ok:
                return False
            return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("ascii"))
        if hashed.startswith("pbkdf2$"):
            return _pbkdf2_verify(plain, hashed)
    except Exception:  # noqa: BLE001
        return False
    return False


def _pbkdf2_hash(plain: str) -> str:
    iterations = 260_000
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, iterations)
    return "pbkdf2$%d$%s$%s" % (
        iterations,
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(dk).decode("ascii"),
    )


def _pbkdf2_verify(plain: str, hashed: str) -> bool:
    try:
        _, iters, salt_b64, dk_b64 = hashed.split("$", 3)
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(dk_b64)
        actual = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, int(iters))
        return hmac.compare_digest(actual, expected)
    except Exception:  # noqa: BLE001
        return False


def password_strength(plain: str) -> tuple[bool, str]:
    """弱密码拦截。返回 (是否合格, 原因)。"""
    if len(plain) < settings.password_min_length:
        return False, "密码至少 %d 位" % settings.password_min_length
    if len(plain) > 72:
        return False, "密码不能超过 72 位"
    if plain.isdigit():
        return False, "密码不能是纯数字"
    if plain.lower() in {"123456", "password", "qwerty", "111111", "abc123", "000000"}:
        return False, "这个密码太常见了，换一个"
    return True, ""


# ---------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------


def create_access_token(subject: str | int, extra: dict[str, Any] | None = None) -> str:
    payload: dict[str, Any] = {
        "sub": str(subject),
        "typ": "access",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes),
    }
    if extra:
        payload.update(extra)
    return pyjwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(subject: str | int) -> str:
    payload = {
        "sub": str(subject),
        "typ": "refresh",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.refresh_token_expire_minutes),
    }
    return pyjwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str, expected_type: str = "access") -> dict[str, Any] | None:
    """解码并校验 token。校验失败一律返回 None，不抛异常给上层。

    PyJWT 会自动校验 exp（过期抛 ExpiredSignatureError）；
    算法白名单必须显式传，防止算法混淆攻击。
    """
    try:
        payload = pyjwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except InvalidTokenError:
        return None
    if payload.get("typ") != expected_type:
        return None
    return payload


def token_remaining_seconds(token: str) -> int:
    payload = decode_token(token)
    if not payload:
        return 0
    exp = payload.get("exp")
    if not exp:
        return 0
    return max(0, int(exp - datetime.now(timezone.utc).timestamp()))


# ---------------------------------------------------------------------
# 杂项
# ---------------------------------------------------------------------


def new_api_key(prefix: str = "ak") -> str:
    """生成随机标识，用于 worker_id、匿名昵称等。"""
    return "%s_%s" % (prefix, secrets.token_hex(8))


def mask_email(email: str) -> str:
    """打码展示：zhangsan@qq.com -> zh***@qq.com"""
    if "@" not in email:
        return email[:2] + "***"
    name, domain = email.split("@", 1)
    if len(name) <= 2:
        return name[0] + "***@" + domain
    return name[:2] + "***@" + domain
