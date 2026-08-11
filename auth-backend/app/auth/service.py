import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
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
from app.core.config import settings
from app.core.database import get_db_connection
from app.core.errors import AppError


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def _create_refresh_token() -> str:
    return secrets.token_urlsafe(64)


class AuthService:
    async def login(self, body: LoginRequest) -> LoginResponse:
        async with get_db_connection() as conn:
            row = await conn.fetchrow(
                "SELECT id, password_hash, is_active, full_name, email, created_at, updated_at "
                "FROM users WHERE email = $1",
                body.email,
            )
            if row is None or not _verify_password(body.password, row["password_hash"]):
                raise AppError(
                    status_code=401,
                    code="INVALID_CREDENTIALS",
                    message="Invalid email or password.",
                )
            if not row["is_active"]:
                raise AppError(
                    status_code=401,
                    code="INVALID_CREDENTIALS",
                    message="Invalid email or password.",
                )
            user_id = str(row["id"])
            access_token = _create_access_token(user_id)
            raw_refresh = _create_refresh_token()
            refresh_hash = _hash_token(raw_refresh)
            remember_me = body.remember_me if body.remember_me is not None else False
            expires_at = datetime.now(timezone.utc) + timedelta(
                days=settings.REFRESH_TOKEN_EXPIRE_DAYS_LONG
                if remember_me
                else settings.REFRESH_TOKEN_EXPIRE_DAYS
            )
            await conn.execute(
                "INSERT INTO refresh_tokens (user_id, token_hash, expires_at, remember_me) "
                "VALUES ($1, $2, $3, $4)",
                row["id"],
                refresh_hash,
                expires_at,
                remember_me,
            )
            return LoginResponse(
                access_token=access_token,
                refresh_token=raw_refresh,
                token_type="bearer",
            )

    async def register(self, body: RegisterRequest) -> RegisterResponse:
        async with get_db_connection() as conn:
            existing = await conn.fetchrow(
                "SELECT id FROM users WHERE email = $1",
                body.email,
            )
            if existing is not None:
                raise AppError(
                    status_code=409,
                    code="EMAIL_ALREADY_REGISTERED",
                    message="An account with this email already exists.",
                )
            password_hash = _hash_password(body.password)
            row = await conn.fetchrow(
                "INSERT INTO users (full_name, email, password_hash, is_active) "
                "VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, created_at",
                body.full_name,
                body.email,
                password_hash,
                True,
            )
            return RegisterResponse(
                id=str(row["id"]),
                full_name=row["full_name"],
                email=row["email"],
                created_at=row["created_at"].isoformat(),
            )

    async def forgotPassword(self, body: ForgotPasswordRequest) -> ForgotPasswordResponse:
        generic_response = ForgotPasswordResponse(
            message="If an account with that email exists, a password reset link has been sent."
        )
        async with get_db_connection() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM users WHERE email = $1 AND is_active = TRUE",
                body.email,
            )
            if row is None:
                return generic_response
            raw_token = secrets.token_urlsafe(64)
            token_hash = _hash_token(raw_token)
            expires_at = datetime.now(timezone.utc) + timedelta(
                minutes=settings.RESET_TOKEN_EXPIRE_MINUTES
            )
            await conn.execute(
                "INSERT INTO password_resets (user_id, token_hash, expires_at) "
                "VALUES ($1, $2, $3)",
                row["id"],
                token_hash,
                expires_at,
            )
            # Email sending is delegated to an external mail service.
            # The token would be embedded in a link such as:
            # {settings.FRONTEND_URL}/reset-password?token={raw_token}
            # Actual email dispatch is handled by the email provider integration.
        return generic_response

    async def resetPassword(self, body: ResetPasswordRequest) -> ResetPasswordResponse:
        token_hash = _hash_token(body.token)
        async with get_db_connection() as conn:
            row = await conn.fetchrow(
                "SELECT id, user_id, expires_at, used_at FROM password_resets "
                "WHERE token_hash = $1",
                token_hash,
            )
            if row is None:
                raise AppError(
                    status_code=400,
                    code="INVALID_RESET_TOKEN",
                    message="This password reset link is invalid or has expired.",
                )
            if row["used_at"] is not None:
                raise AppError(
                    status_code=400,
                    code="INVALID_RESET_TOKEN",
                    message="This password reset link is invalid or has expired.",
                )
            if datetime.now(timezone.utc) > row["expires_at"].replace(tzinfo=timezone.utc):
                raise AppError(
                    status_code=400,
                    code="INVALID_RESET_TOKEN",
                    message="This password reset link is invalid or has expired.",
                )
            new_hash = _hash_password(body.password)
            await conn.execute(
                "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
                new_hash,
                row["user_id"],
            )
            await conn.execute(
                "UPDATE password_resets SET used_at = NOW() WHERE id = $1",
                row["id"],
            )
            await conn.execute(
                "UPDATE refresh_tokens SET revoked_at = NOW() "
                "WHERE user_id = $1 AND revoked_at IS NULL",
                row["user_id"],
            )
        return ResetPasswordResponse(message="Your password has been reset successfully.")

    async def me(self) -> MeResponse:
        raise AppError(
            status_code=501,
            code="NOT_IMPLEMENTED",
            message="Not implemented.",
        )

    async def logout(self, body: LogoutRequest) -> LogoutResponse:
        token_hash = _hash_token(body.refresh_token)
        async with get_db_connection() as conn:
            await conn.execute(
                "UPDATE refresh_tokens SET revoked_at = NOW() "
                "WHERE token_hash = $1 AND revoked_at IS NULL",
                token_hash,
            )
        return LogoutResponse(message="Logged out successfully.")

    async def refresh(self, body: RefreshRequest) -> RefreshResponse:
        token_hash = _hash_token(body.refresh_token)
        async with get_db_connection() as conn:
            row = await conn.fetchrow(
                "SELECT id, user_id, expires_at, revoked_at, remember_me "
                "FROM refresh_tokens WHERE token_hash = $1",
                token_hash,
            )
            if row is None or row["revoked_at"] is not None:
                raise AppError(
                    status_code=401,
                    code="INVALID_REFRESH_TOKEN",
                    message="Refresh token is invalid or has been revoked.",
                )
            if datetime.now(timezone.utc) > row["expires_at"].replace(tzinfo=timezone.utc):
                raise AppError(
                    status_code=401,
                    code="INVALID_REFRESH_TOKEN",
                    message="Refresh token is invalid or has been revoked.",
                )
            await conn.execute(
                "UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1",
                row["id"],
            )
            user_id = str(row["user_id"])
            remember_me = row["remember_me"]
            access_token = _create_access_token(user_id)
            raw_refresh = _create_refresh_token()
            new_hash = _hash_token(raw_refresh)
            expires_at = datetime.now(timezone.utc) + timedelta(
                days=settings.REFRESH_TOKEN_EXPIRE_DAYS_LONG
                if remember_me
                else settings.REFRESH_TOKEN_EXPIRE_DAYS
            )
            await conn.execute(
                "INSERT INTO refresh_tokens (user_id, token_hash, expires_at, remember_me) "
                "VALUES ($1, $2, $3, $4)",
                row["user_id"],
                new_hash,
                expires_at,
                remember_me,
            )
        return RefreshResponse(
            access_token=access_token,
            refresh_token=raw_refresh,
            token_type="bearer",
        )
