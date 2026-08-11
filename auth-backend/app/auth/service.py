from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import HTTPException, Request, Response, status
from jose import JWTError, jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    LogoutResponse,
    MeResponse,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from app.database import get_session
from app.models.password_reset import PasswordReset
from app.models.refresh_token import RefreshToken
from app.models.user import User

# ---------------------------------------------------------------------------
# Environment / constants
# ---------------------------------------------------------------------------

SECRET_KEY: str = os.environ["JWT_SECRET_KEY"]
ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
REFRESH_TOKEN_REMEMBER_DAYS: int = int(os.environ.get("REFRESH_TOKEN_REMEMBER_DAYS", "30"))
BCRYPT_ROUNDS: int = int(os.environ.get("BCRYPT_ROUNDS", "12"))
RESET_TOKEN_EXPIRE_MINUTES: int = 30
COOKIE_NAME: str = "refresh_token"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sha256(value: str) -> str:
    """Return the SHA-256 hex digest of *value*."""
    return hashlib.sha256(value.encode()).hexdigest()


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _validate_password_policy(password: str) -> Optional[str]:
    """Return an error message string if the password violates policy, else None."""
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not any(c.isupper() for c in password):
        return "Password must contain at least one uppercase letter."
    if not any(c.islower() for c in password):
        return "Password must contain at least one lowercase letter."
    if not any(c.isdigit() for c in password):
        return "Password must contain at least one number."
    return None


def _set_refresh_cookie(response: Response, token: str, remember: bool) -> None:
    max_age = (
        REFRESH_TOKEN_REMEMBER_DAYS * 86400 if remember else REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=max_age,
        path="/auth/refresh",
    )


async def _get_session_from_request(request: Request) -> AsyncSession:
    """Extract the injected DB session from request.state."""
    return request.state.db  # type: ignore[attr-defined]


# ---------------------------------------------------------------------------
# login
# ---------------------------------------------------------------------------

async def login(
    *,
    request: Request,
    body: LoginRequest,
    response: Response,
) -> LoginResponse:
    db: AsyncSession = await _get_session_from_request(request)

    result = await db.execute(select(User).where(User.email == body.email))
    user: Optional[User] = result.scalar_one_or_none()

    if user is None or not _verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password.",
                "details": {},
            },
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_INACTIVE",
                "message": "Your account is inactive.",
                "details": {},
            },
        )

    access_token = _create_access_token(str(user.id), user.email)

    raw_refresh = secrets.token_urlsafe(48)
    remember = body.remember_me if hasattr(body, "remember_me") and body.remember_me else False
    expire_days = REFRESH_TOKEN_REMEMBER_DAYS if remember else REFRESH_TOKEN_EXPIRE_DAYS
    refresh_expires = datetime.now(timezone.utc) + timedelta(days=expire_days)

    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=_sha256(raw_refresh),
        expires_at=refresh_expires,
        remember_me=remember,
    )
    db.add(db_refresh)
    await db.commit()

    _set_refresh_cookie(response, raw_refresh, remember)

    return LoginResponse(
        accessToken=access_token,
        tokenType="bearer",
        user=MeResponse(
            id=str(user.id),
            fullName=user.full_name,
            email=user.email,
        ),
    )


# ---------------------------------------------------------------------------
# register
# ---------------------------------------------------------------------------

async def register(
    *,
    request: Request,
    body: RegisterRequest,
) -> RegisterResponse:
    db: AsyncSession = await _get_session_from_request(request)

    if body.password != body.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "PASSWORD_MISMATCH",
                "message": "Passwords do not match.",
                "details": {},
            },
        )

    policy_error = _validate_password_policy(body.password)
    if policy_error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "WEAK_PASSWORD",
                "message": policy_error,
                "details": {},
            },
        )

    result = await db.execute(select(User).where(User.email == body.email))
    existing: Optional[User] = result.scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "EMAIL_TAKEN",
                "message": "An account with this email already exists.",
                "details": {},
            },
        )

    user = User(
        full_name=body.full_name,
        email=body.email,
        password_hash=_hash_password(body.password),
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return RegisterResponse(
        id=str(user.id),
        fullName=user.full_name,
        email=user.email,
    )


# ---------------------------------------------------------------------------
# forgotPassword
# ---------------------------------------------------------------------------

async def forgotPassword(
    *,
    request: Request,
    body: ForgotPasswordRequest,
) -> ForgotPasswordResponse:
    db: AsyncSession = await _get_session_from_request(request)

    result = await db.execute(select(User).where(User.email == body.email))
    user: Optional[User] = result.scalar_one_or_none()

    # Enumeration resistance: always return the same response
    if user is not None and user.is_active:
        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)

        db_reset = PasswordReset(
            user_id=user.id,
            token_hash=_sha256(raw_token),
            expires_at=expires_at,
        )
        db.add(db_reset)
        await db.commit()

        # In a real system an email would be dispatched here with raw_token.
        # The email transport is out of scope for this work item.

    return ForgotPasswordResponse(
        message="If an account with that email exists, a password reset link has been sent."
    )


# ---------------------------------------------------------------------------
# resetPassword
# ---------------------------------------------------------------------------

async def resetPassword(
    *,
    request: Request,
    body: ResetPasswordRequest,
) -> ResetPasswordResponse:
    db: AsyncSession = await _get_session_from_request(request)

    if body.password != body.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "PASSWORD_MISMATCH",
                "message": "Passwords do not match.",
                "details": {},
            },
        )

    policy_error = _validate_password_policy(body.password)
    if policy_error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "WEAK_PASSWORD",
                "message": policy_error,
                "details": {},
            },
        )

    token_hash = _sha256(body.token)
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(PasswordReset).where(
            PasswordReset.token_hash == token_hash,
            PasswordReset.used_at.is_(None),
            PasswordReset.expires_at > now,
        )
    )
    reset_record: Optional[PasswordReset] = result.scalar_one_or_none()

    if reset_record is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_OR_EXPIRED_TOKEN",
                "message": "This password reset link is invalid or has expired.",
                "details": {},
            },
        )

    user_result = await db.execute(
        select(User).where(User.id == reset_record.user_id)
    )
    user: Optional[User] = user_result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_OR_EXPIRED_TOKEN",
                "message": "This password reset link is invalid or has expired.",
                "details": {},
            },
        )

    # Mark the reset token as used
    reset_record.used_at = now
    # Update the user's password
    user.password_hash = _hash_password(body.password)
    user.updated_at = now

    # Revoke all existing refresh tokens for the user for security
    await db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )

    await db.commit()

    return ResetPasswordResponse(
        message="Your password has been reset successfully."
    )


# ---------------------------------------------------------------------------
# me
# ---------------------------------------------------------------------------

async def me(
    *,
    request: Request,
) -> MeResponse:
    db: AsyncSession = await _get_session_from_request(request)

    authorization: str = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "MISSING_TOKEN",
                "message": "Authentication required.",
                "details": {},
            },
        )

    token = authorization.removeprefix("Bearer ")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload["sub"]
    except (JWTError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_TOKEN",
                "message": "Authentication required.",
                "details": {},
            },
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user: Optional[User] = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "USER_NOT_FOUND",
                "message": "Authentication required.",
                "details": {},
            },
        )

    return MeResponse(
        id=str(user.id),
        fullName=user.full_name,
        email=user.email,
    )


# ---------------------------------------------------------------------------
# logout
# ---------------------------------------------------------------------------

async def logout(
    *,
    request: Request,
    body: LogoutRequest,
    response: Response,
) -> LogoutResponse:
    db: AsyncSession = await _get_session_from_request(request)

    raw_refresh = request.cookies.get(COOKIE_NAME) or (body.refresh_token if hasattr(body, "refresh_token") else None)

    if raw_refresh:
        token_hash = _sha256(raw_refresh)
        now = datetime.now(timezone.utc)
        result = await db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked_at.is_(None),
            )
        )
        db_token: Optional[RefreshToken] = result.scalar_one_or_none()
        if db_token is not None:
            db_token.revoked_at = now
            await db.commit()

    response.delete_cookie(key=COOKIE_NAME, path="/auth/refresh")

    return LogoutResponse(message="Logged out successfully.")


# ---------------------------------------------------------------------------
# refresh
# ---------------------------------------------------------------------------

async def refresh(
    *,
    request: Request,
    body: RefreshRequest,
    response: Response,
) -> RefreshResponse:
    db: AsyncSession = await _get_session_from_request(request)

    raw_refresh = request.cookies.get(COOKIE_NAME) or (
        body.refresh_token if hasattr(body, "refresh_token") else None
    )

    if not raw_refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "MISSING_TOKEN",
                "message": "Refresh token is required.",
                "details": {},
            },
        )

    token_hash = _sha256(raw_refresh)
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > now,
        )
    )
    db_token: Optional[RefreshToken] = result.scalar_one_or_none()

    if db_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_TOKEN",
                "message": "Refresh token is invalid or has expired.",
                "details": {},
            },
        )

    user_result = await db.execute(select(User).where(User.id == db_token.user_id))
    user: Optional[User] = user_result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "USER_NOT_FOUND",
                "message": "Authentication required.",
                "details": {},
            },
        )

    # Rotate: revoke old token
    db_token.revoked_at = now

    # Issue new refresh token
    new_raw_refresh = secrets.token_urlsafe(48)
    remember = db_token.remember_me
    expire_days = REFRESH_TOKEN_REMEMBER_DAYS if remember else REFRESH_TOKEN_EXPIRE_DAYS
    new_expires = now + timedelta(days=expire_days)

    new_db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=_sha256(new_raw_refresh),
        expires_at=new_expires,
        remember_me=remember,
    )
    db.add(new_db_refresh)
    await db.commit()

    new_access_token = _create_access_token(str(user.id), user.email)
    _set_refresh_cookie(response, new_raw_refresh, remember)

    return RefreshResponse(
        accessToken=new_access_token,
        tokenType="bearer",
    )
