from __future__ import annotations

import hashlib
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import HTTPException, status

from app.auth.schemas import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    MeResponse,
    LogoutResponse,
    RefreshResponse,
)

# ---------------------------------------------------------------------------
# Environment / config helpers
# ---------------------------------------------------------------------------

SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "change-me-in-production")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
BCRYPT_ROUNDS: int = int(os.environ.get("BCRYPT_ROUNDS", "12"))

# ---------------------------------------------------------------------------
# In-memory store (replace with real DB calls in production)
# ---------------------------------------------------------------------------
# Keyed by email (lower-cased)
_users: dict[str, dict] = {}
_user_id_counter: list[int] = [1]


# ---------------------------------------------------------------------------
# Password policy
# ---------------------------------------------------------------------------

def _validate_password(password: str) -> Optional[str]:
    """Return a validation error message or None if the password is valid."""
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter."
    if not re.search(r"[0-9]", password):
        return "Password must contain at least one number."
    return None


# ---------------------------------------------------------------------------
# Hashing helpers
# ---------------------------------------------------------------------------

def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def _create_access_token(user_id: int, email: str) -> str:
    expire = datetime.now(tz=timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "email": email, "exp": expire, "type": "access"}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _create_refresh_token(user_id: int) -> str:
    expire = datetime.now(tz=timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire, "type": "refresh"}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ---------------------------------------------------------------------------
# Endpoint implementations
# ---------------------------------------------------------------------------

async def register(payload: RegisterRequest) -> RegisterResponse:
    email_key = payload.email.lower()

    # Duplicate e-mail check
    if email_key in _users:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "EMAIL_TAKEN",
                    "message": "An account with this email already exists.",
                    "details": {"field": "email"},
                }
            },
        )

    # Password match
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "PASSWORD_MISMATCH",
                    "message": "Passwords do not match.",
                    "details": {"field": "confirmPassword"},
                }
            },
        )

    # Password policy
    policy_error = _validate_password(payload.password)
    if policy_error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "WEAK_PASSWORD",
                    "message": policy_error,
                    "details": {"field": "password"},
                }
            },
        )

    # Terms acceptance
    if not payload.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "TERMS_NOT_ACCEPTED",
                    "message": "You must accept the Terms of Service to register.",
                    "details": {"field": "termsAccepted"},
                }
            },
        )

    user_id = _user_id_counter[0]
    _user_id_counter[0] += 1
    now = datetime.now(tz=timezone.utc)

    _users[email_key] = {
        "id": user_id,
        "full_name": payload.full_name,
        "email": payload.email,
        "password_hash": _hash_password(payload.password),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    access_token = _create_access_token(user_id, payload.email)
    refresh_token = _create_refresh_token(user_id)

    return RegisterResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


async def login(payload: LoginRequest) -> LoginResponse:
    email_key = payload.email.lower()
    user = _users.get(email_key)

    invalid_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error": {
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password.",
                "details": {},
            }
        },
    )

    if user is None or not _verify_password(payload.password, user["password_hash"]):
        raise invalid_exc

    if not user["is_active"]:
        raise invalid_exc

    access_token = _create_access_token(user["id"], user["email"])
    refresh_token = _create_refresh_token(user["id"])

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


async def forgotPassword(payload: ForgotPasswordRequest) -> ForgotPasswordResponse:
    # Enumeration-resistant: always return the same response
    return ForgotPasswordResponse(
        message="If an account with that email exists, a password reset link has been sent."
    )


async def resetPassword(payload: ResetPasswordRequest) -> ResetPasswordResponse:
    # Password match
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "PASSWORD_MISMATCH",
                    "message": "Passwords do not match.",
                    "details": {"field": "confirmPassword"},
                }
            },
        )

    # Password policy
    policy_error = _validate_password(payload.password)
    if policy_error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "WEAK_PASSWORD",
                    "message": policy_error,
                    "details": {"field": "password"},
                }
            },
        )

    token_hash = _sha256(payload.token)
    target_user: Optional[dict] = None
    for user in _users.values():
        stored = user.get("_reset_token_hash")
        expires = user.get("_reset_token_expires")
        if stored == token_hash and expires and datetime.now(tz=timezone.utc) < expires:
            target_user = user
            break

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "INVALID_OR_EXPIRED_TOKEN",
                    "message": "This password reset link is invalid or has expired.",
                    "details": {},
                }
            },
        )

    target_user["password_hash"] = _hash_password(payload.password)
    target_user["_reset_token_hash"] = None
    target_user["_reset_token_expires"] = None
    target_user["updated_at"] = datetime.now(tz=timezone.utc)

    return ResetPasswordResponse(message="Your password has been reset successfully.")


async def me() -> MeResponse:
    # Without real auth middleware this is a stub; wire up dependency injection in production.
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error": {
                "code": "NOT_AUTHENTICATED",
                "message": "Authentication required.",
                "details": {},
            }
        },
    )


async def logout() -> LogoutResponse:
    return LogoutResponse(message="Logged out successfully.")


async def refresh() -> RefreshResponse:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error": {
                "code": "INVALID_REFRESH_TOKEN",
                "message": "Refresh token is invalid or has expired.",
                "details": {},
            }
        },
    )
