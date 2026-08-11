from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import secrets

bcrypt_rounds: int

from fastapi import HTTPException, Response, status
from jose import JWTError, jwt
from passlib.context import CryptContext

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
from app.auth.repository import AuthRepository
from app.core.config import settings


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class AuthService:
    def __init__(self, repository: AuthRepository) -> None:
        self._repo = repository
        self._pwd_context = CryptContext(
            schemes=["bcrypt"],
            deprecated="auto",
            bcrypt__rounds=settings.BCRYPT_ROUNDS,
        )

    def _hash_password(self, password: str) -> str:
        return self._pwd_context.hash(password)

    def _verify_password(self, plain: str, hashed: str) -> bool:
        return self._pwd_context.verify(plain, hashed)

    def _create_access_token(self, user_id: int) -> str:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        payload = {"sub": str(user_id), "exp": expire, "type": "access"}
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    def _create_refresh_token(self) -> str:
        return secrets.token_urlsafe(64)

    def _set_refresh_cookie(
        self, response: Response, token: str, remember_me: bool
    ) -> None:
        max_age: Optional[int] = None
        if remember_me:
            max_age = settings.REFRESH_TOKEN_REMEMBER_DAYS * 24 * 3600
        else:
            max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
        response.set_cookie(
            key="refresh_token",
            value=token,
            httponly=True,
            samesite="lax",
            secure=settings.COOKIE_SECURE,
            max_age=max_age,
            path="/auth",
        )

    def _clear_refresh_cookie(self, response: Response) -> None:
        response.delete_cookie(key="refresh_token", path="/auth")

    async def register(self, body: RegisterRequest) -> RegisterResponse:
        existing = await self._repo.get_user_by_email(body.email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": {
                        "code": "EMAIL_ALREADY_REGISTERED",
                        "message": "An account with this email already exists.",
                        "details": {},
                    }
                },
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

    async def login(self, body: LoginRequest, response: Response) -> LoginResponse:
        user = await self._repo.get_user_by_email(body.email)
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
        if user is None:
            raise invalid_exc
        if not self._verify_password(body.password, user.password_hash):
            raise invalid_exc
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "ACCOUNT_INACTIVE",
                        "message": "Your account is inactive.",
                        "details": {},
                    }
                },
            )
        access_token = self._create_access_token(user.id)
        raw_refresh = self._create_refresh_token()
        token_hash = _hash_token(raw_refresh)
        remember_me: bool = body.remember_me if body.remember_me is not None else False
        expire_days = (
            settings.REFRESH_TOKEN_REMEMBER_DAYS
            if remember_me
            else settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        expires_at = datetime.now(timezone.utc) + timedelta(days=expire_days)
        await self._repo.create_refresh_token(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            remember_me=remember_me,
        )
        self._set_refresh_cookie(response, raw_refresh, remember_me)
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
        )

    async def forgotPassword(
        self, body: ForgotPasswordRequest
    ) -> ForgotPasswordResponse:
        user = await self._repo.get_user_by_email(body.email)
        if user is not None and user.is_active:
            raw_token = secrets.token_urlsafe(32)
            token_hash = _hash_token(raw_token)
            expires_at = datetime.now(timezone.utc) + timedelta(
                minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES
            )
            await self._repo.create_password_reset(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires_at,
            )
            # Email sending would be triggered here via an email service
            # Not implemented in this service to keep concerns separated
        return ForgotPasswordResponse(
            message="If an account with that email exists, a password reset link has been sent."
        )

    async def resetPassword(
        self, body: ResetPasswordRequest
    ) -> ResetPasswordResponse:
        token_hash = _hash_token(body.token)
        reset_record = await self._repo.get_valid_password_reset(token_hash)
        if reset_record is None:
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
        new_hash = self._hash_password(body.password)
        await self._repo.update_user_password(reset_record.user_id, new_hash)
        await self._repo.mark_password_reset_used(reset_record.id)
        await self._repo.revoke_all_refresh_tokens(reset_record.user_id)
        return ResetPasswordResponse(
            message="Your password has been reset successfully."
        )

    async def me(self, user_id: int) -> MeResponse:
        user = await self._repo.get_user_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": {
                        "code": "USER_NOT_FOUND",
                        "message": "User not found.",
                        "details": {},
                    }
                },
            )
        return MeResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    async def logout(
        self, body: LogoutRequest, response: Response
    ) -> LogoutResponse:
        if body.refresh_token:
            token_hash = _hash_token(body.refresh_token)
            await self._repo.revoke_refresh_token_by_hash(token_hash)
        self._clear_refresh_cookie(response)
        return LogoutResponse(message="Logged out successfully.")

    async def refresh(
        self, body: RefreshRequest, response: Response
    ) -> RefreshResponse:
        invalid_exc = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "INVALID_REFRESH_TOKEN",
                    "message": "Invalid or expired refresh token.",
                    "details": {},
                }
            },
        )
        raw_token = body.refresh_token
        if not raw_token:
            raise invalid_exc
        token_hash = _hash_token(raw_token)
        record = await self._repo.get_valid_refresh_token(token_hash)
        if record is None:
            raise invalid_exc
        # Rotate: revoke old, issue new
        await self._repo.revoke_refresh_token_by_hash(token_hash)
        new_raw_refresh = self._create_refresh_token()
        new_token_hash = _hash_token(new_raw_refresh)
        remember_me: bool = record.remember_me
        expire_days = (
            settings.REFRESH_TOKEN_REMEMBER_DAYS
            if remember_me
            else settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        expires_at = datetime.now(timezone.utc) + timedelta(days=expire_days)
        await self._repo.create_refresh_token(
            user_id=record.user_id,
            token_hash=new_token_hash,
            expires_at=expires_at,
            remember_me=remember_me,
        )
        access_token = self._create_access_token(record.user_id)
        self._set_refresh_cookie(response, new_raw_refresh, remember_me)
        return RefreshResponse(
            access_token=access_token,
            token_type="bearer",
        )
