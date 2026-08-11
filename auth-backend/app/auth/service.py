from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import secrets
import logging

from fastapi import Response
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.auth.schemas import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    MeResponse,
    LogoutResponse,
    RefreshResponse,
)
from app.auth.repository import AuthRepository
from app.config import Settings

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _set_refresh_cookie(response: Response, token: str, max_age: int) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=max_age,
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        samesite="lax",
        secure=True,
        path="/",
    )


class AuthService:
    def __init__(self, repository: AuthRepository, settings: Settings) -> None:
        self._repo = repository
        self._settings = settings

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _verify_password(self, plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    def _hash_password(self, plain: str) -> str:
        return pwd_context.hash(plain)

    def _create_access_token(self, user_id: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=self._settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        payload = {"sub": str(user_id), "exp": expire, "type": "access"}
        return jwt.encode(
            payload,
            self._settings.SECRET_KEY,
            algorithm=self._settings.ALGORITHM,
        )

    def _create_refresh_token(self) -> str:
        return secrets.token_urlsafe(64)

    def _decode_access_token(self, token: str) -> dict:
        return jwt.decode(
            token,
            self._settings.SECRET_KEY,
            algorithms=[self._settings.ALGORITHM],
        )

    # ------------------------------------------------------------------
    # Register
    # ------------------------------------------------------------------

    async def register(self, body: RegisterRequest) -> RegisterResponse:
        from app.core.exceptions import AppError

        existing = await self._repo.get_user_by_email(body.email)
        if existing is not None:
            raise AppError(
                code="EMAIL_TAKEN",
                message="An account with this email already exists.",
                status_code=409,
            )

        if body.password != body.confirm_password:
            raise AppError(
                code="PASSWORD_MISMATCH",
                message="Passwords do not match.",
                status_code=422,
            )

        password_hash = self._hash_password(body.password)
        user = await self._repo.create_user(
            full_name=body.full_name,
            email=body.email,
            password_hash=password_hash,
        )

        return RegisterResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    # ------------------------------------------------------------------
    # Login
    # ------------------------------------------------------------------

    async def login(self, body: LoginRequest, response: Response) -> LoginResponse:
        from app.core.exceptions import AppError

        user = await self._repo.get_user_by_email(body.email)
        if user is None or not self._verify_password(body.password, user.password_hash):
            raise AppError(
                code="INVALID_CREDENTIALS",
                message="Invalid email or password.",
                status_code=401,
            )

        if not user.is_active:
            raise AppError(
                code="ACCOUNT_INACTIVE",
                message="Invalid email or password.",
                status_code=401,
            )

        access_token = self._create_access_token(user.id)
        raw_refresh = self._create_refresh_token()
        token_hash = _hash_token(raw_refresh)

        remember_me: bool = body.remember_me if body.remember_me is not None else False
        refresh_ttl_days = (
            self._settings.REFRESH_TOKEN_REMEMBER_DAYS
            if remember_me
            else self._settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        expires_at = datetime.now(timezone.utc) + timedelta(days=refresh_ttl_days)

        await self._repo.create_refresh_token(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            remember_me=remember_me,
        )

        _set_refresh_cookie(
            response,
            raw_refresh,
            max_age=int(timedelta(days=refresh_ttl_days).total_seconds()),
        )

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
        )

    # ------------------------------------------------------------------
    # Forgot password
    # ------------------------------------------------------------------

    async def forgot_password(
        self, body: ForgotPasswordRequest
    ) -> ForgotPasswordResponse:
        user = await self._repo.get_user_by_email(body.email)
        if user is not None and user.is_active:
            raw_token = secrets.token_urlsafe(32)
            token_hash = _hash_token(raw_token)
            expires_at = datetime.now(timezone.utc) + timedelta(
                minutes=self._settings.RESET_TOKEN_EXPIRE_MINUTES
            )
            await self._repo.create_password_reset(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires_at,
            )
            # In a production system the reset link would be emailed here.
            logger.info("Password reset token created for user %s", user.id)

        return ForgotPasswordResponse(
            message="If that email is registered, you will receive a reset link shortly."
        )

    # ------------------------------------------------------------------
    # Reset password
    # ------------------------------------------------------------------

    async def reset_password(
        self, body: ResetPasswordRequest
    ) -> ResetPasswordResponse:
        from app.core.exceptions import AppError

        token_hash = _hash_token(body.token)
        reset_record = await self._repo.get_valid_password_reset(token_hash)

        if reset_record is None:
            raise AppError(
                code="INVALID_RESET_TOKEN",
                message="This password reset link is invalid or has expired.",
                status_code=400,
            )

        if body.password != body.confirm_password:
            raise AppError(
                code="PASSWORD_MISMATCH",
                message="Passwords do not match.",
                status_code=422,
            )

        new_hash = self._hash_password(body.password)
        await self._repo.update_user_password(reset_record.user_id, new_hash)
        await self._repo.mark_password_reset_used(reset_record.id)
        await self._repo.revoke_all_refresh_tokens(reset_record.user_id)

        return ResetPasswordResponse(message="Your password has been updated successfully.")

    # ------------------------------------------------------------------
    # Logout
    # ------------------------------------------------------------------

    async def logout(
        self,
        user_id: str,
        refresh_token: Optional[str],
        response: Response,
    ) -> LogoutResponse:
        if refresh_token is not None:
            token_hash = _hash_token(refresh_token)
            await self._repo.revoke_refresh_token_by_hash(token_hash)

        _clear_refresh_cookie(response)

        return LogoutResponse(message="You have been logged out successfully.")

    # ------------------------------------------------------------------
    # Refresh
    # ------------------------------------------------------------------

    async def refresh(
        self,
        refresh_token: Optional[str],
        response: Response,
    ) -> RefreshResponse:
        from app.core.exceptions import AppError

        if refresh_token is None:
            raise AppError(
                code="MISSING_REFRESH_TOKEN",
                message="Refresh token is missing.",
                status_code=401,
            )

        token_hash = _hash_token(refresh_token)
        record = await self._repo.get_valid_refresh_token(token_hash)

        if record is None:
            raise AppError(
                code="INVALID_REFRESH_TOKEN",
                message="Refresh token is invalid or has expired.",
                status_code=401,
            )

        user = await self._repo.get_user_by_id(record.user_id)
        if user is None or not user.is_active:
            raise AppError(
                code="ACCOUNT_INACTIVE",
                message="Invalid email or password.",
                status_code=401,
            )

        # Rotate: revoke old, issue new
        await self._repo.revoke_refresh_token_by_hash(token_hash)

        raw_new = self._create_refresh_token()
        new_hash = _hash_token(raw_new)
        refresh_ttl_days = (
            self._settings.REFRESH_TOKEN_REMEMBER_DAYS
            if record.remember_me
            else self._settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        expires_at = datetime.now(timezone.utc) + timedelta(days=refresh_ttl_days)

        await self._repo.create_refresh_token(
            user_id=record.user_id,
            token_hash=new_hash,
            expires_at=expires_at,
            remember_me=record.remember_me,
        )

        _set_refresh_cookie(
            response,
            raw_new,
            max_age=int(timedelta(days=refresh_ttl_days).total_seconds()),
        )

        access_token = self._create_access_token(record.user_id)
        return RefreshResponse(access_token=access_token, token_type="bearer")

    # ------------------------------------------------------------------
    # Get current user (used by dependency)
    # ------------------------------------------------------------------

    async def get_current_user(self, token: str):
        from app.core.exceptions import AppError

        try:
            payload = self._decode_access_token(token)
        except JWTError:
            raise AppError(
                code="INVALID_TOKEN",
                message="Could not validate credentials.",
                status_code=401,
            )

        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise AppError(
                code="INVALID_TOKEN",
                message="Could not validate credentials.",
                status_code=401,
            )

        user = await self._repo.get_user_by_id(user_id)
        if user is None or not user.is_active:
            raise AppError(
                code="INVALID_TOKEN",
                message="Could not validate credentials.",
                status_code=401,
            )

        return user
