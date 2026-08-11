from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import HTTPException, Request, Response, status
from jose import JWTError, jwt

from app.auth.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    MeResponse,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    LogoutResponse,
)

# ---------------------------------------------------------------------------
# Environment-driven configuration
# ---------------------------------------------------------------------------

SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "change-me-in-production")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
REFRESH_TOKEN_REMEMBER_DAYS: int = int(os.environ.get("REFRESH_TOKEN_REMEMBER_DAYS", "30"))
BCRYPT_ROUNDS: int = int(os.environ.get("BCRYPT_ROUNDS", "12"))
REFRESH_COOKIE_NAME: str = "refresh_token"

# ---------------------------------------------------------------------------
# In-memory stores (replace with a real DB repository in production)
# ---------------------------------------------------------------------------

# users: dict[str, dict]  keyed by email
_users: dict[str, dict] = {}
# refresh_tokens: dict[token_hash, dict]
_refresh_tokens: dict[str, dict] = {}
# password_resets: dict[token_hash, dict]
_password_resets: dict[str, dict] = {}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _validate_password_policy(password: str) -> Optional[str]:
    """Return an error message if the password violates policy, else None."""
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not any(c.isupper() for c in password):
        return "Password must contain at least one uppercase letter."
    if not any(c.islower() for c in password):
        return "Password must contain at least one lowercase letter."
    if not any(c.isdigit() for c in password):
        return "Password must contain at least one number."
    return None


def _set_refresh_cookie(response: Response, token: str, remember_me: bool) -> None:
    max_age = (
        REFRESH_TOKEN_REMEMBER_DAYS * 86400
        if remember_me
        else REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=max_age,
        path="/auth/refresh",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/auth/refresh",
        httponly=True,
        samesite="lax",
        secure=True,
    )


def _get_refresh_token_from_request(request: Request) -> Optional[str]:
    return request.cookies.get(REFRESH_COOKIE_NAME)


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class AuthService:
    # ------------------------------------------------------------------
    # register
    # ------------------------------------------------------------------

    async def register(self, body: RegisterRequest) -> RegisterResponse:
        if body.email in _users:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "EMAIL_TAKEN",
                    "message": "An account with this email already exists.",
                    "details": None,
                },
            )

        if body.password != body.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "PASSWORD_MISMATCH",
                    "message": "Passwords do not match.",
                    "details": None,
                },
            )

        policy_error = _validate_password_policy(body.password)
        if policy_error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "WEAK_PASSWORD",
                    "message": policy_error,
                    "details": None,
                },
            )

        user_id = secrets.token_hex(16)
        now = datetime.now(timezone.utc)
        _users[body.email] = {
            "id": user_id,
            "full_name": body.full_name,
            "email": body.email,
            "password_hash": _hash_password(body.password),
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }

        return RegisterResponse(
            id=user_id,
            fullName=body.full_name,
            email=body.email,
        )

    # ------------------------------------------------------------------
    # login
    # ------------------------------------------------------------------

    async def login(self, body: LoginRequest, response: Response) -> LoginResponse:
        user = _users.get(body.email)
        invalid_exc = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password.",
                "details": None,
            },
        )

        if user is None or not _verify_password(body.password, user["password_hash"]):
            raise invalid_exc

        if not user["is_active"]:
            raise invalid_exc

        access_token = _create_access_token(user["id"], user["email"])
        raw_refresh = secrets.token_urlsafe(48)
        token_hash = _sha256(raw_refresh)
        remember = body.remember_me or False
        expires_days = REFRESH_TOKEN_REMEMBER_DAYS if remember else REFRESH_TOKEN_EXPIRE_DAYS
        expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)

        _refresh_tokens[token_hash] = {
            "id": secrets.token_hex(16),
            "user_id": user["id"],
            "token_hash": token_hash,
            "expires_at": expires_at,
            "revoked_at": None,
            "remember_me": remember,
            "created_at": datetime.now(timezone.utc),
        }

        _set_refresh_cookie(response, raw_refresh, remember)

        return LoginResponse(
            accessToken=access_token,
            tokenType="bearer",
            expiresIn=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    # ------------------------------------------------------------------
    # refresh
    # ------------------------------------------------------------------

    async def refresh(self, request: Request, response: Response) -> RefreshResponse:
        raw_token = _get_refresh_token_from_request(request)

        invalid_exc = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_REFRESH_TOKEN",
                "message": "Invalid or expired refresh token.",
                "details": None,
            },
        )

        if not raw_token:
            raise invalid_exc

        token_hash = _sha256(raw_token)
        stored = _refresh_tokens.get(token_hash)

        if stored is None:
            raise invalid_exc

        if stored["revoked_at"] is not None:
            raise invalid_exc

        if stored["expires_at"] < datetime.now(timezone.utc):
            raise invalid_exc

        # Find the user
        user = next(
            (u for u in _users.values() if u["id"] == stored["user_id"]),
            None,
        )
        if user is None or not user["is_active"]:
            raise invalid_exc

        # Rotate: revoke old token
        stored["revoked_at"] = datetime.now(timezone.utc)

        # Issue new refresh token
        new_raw_refresh = secrets.token_urlsafe(48)
        new_hash = _sha256(new_raw_refresh)
        remember = stored["remember_me"]
        expires_days = REFRESH_TOKEN_REMEMBER_DAYS if remember else REFRESH_TOKEN_EXPIRE_DAYS
        expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)

        _refresh_tokens[new_hash] = {
            "id": secrets.token_hex(16),
            "user_id": user["id"],
            "token_hash": new_hash,
            "expires_at": expires_at,
            "revoked_at": None,
            "remember_me": remember,
            "created_at": datetime.now(timezone.utc),
        }

        _set_refresh_cookie(response, new_raw_refresh, remember)

        access_token = _create_access_token(user["id"], user["email"])

        return RefreshResponse(
            accessToken=access_token,
            tokenType="bearer",
            expiresIn=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    # ------------------------------------------------------------------
    # forgotPassword
    # ------------------------------------------------------------------

    async def forgotPassword(self, body: ForgotPasswordRequest) -> ForgotPasswordResponse:
        # Enumeration resistance: always return the same message
        user = _users.get(body.email)
        if user and user["is_active"]:
            raw_token = secrets.token_urlsafe(48)
            token_hash = _sha256(raw_token)
            expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
            _password_resets[token_hash] = {
                "id": secrets.token_hex(16),
                "user_id": user["id"],
                "token_hash": token_hash,
                "expires_at": expires_at,
                "used_at": None,
                "created_at": datetime.now(timezone.utc),
            }
            # In production: send email with raw_token

        return ForgotPasswordResponse(
            message="If an account with that email exists, a password reset link has been sent."
        )

    # ------------------------------------------------------------------
    # resetPassword
    # ------------------------------------------------------------------

    async def resetPassword(self, body: ResetPasswordRequest) -> ResetPasswordResponse:
        token_hash = _sha256(body.token)
        stored = _password_resets.get(token_hash)

        invalid_exc = HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_RESET_TOKEN",
                "message": "This password reset link is invalid or has expired.",
                "details": None,
            },
        )

        if stored is None:
            raise invalid_exc
        if stored["used_at"] is not None:
            raise invalid_exc
        if stored["expires_at"] < datetime.now(timezone.utc):
            raise invalid_exc

        if body.password != body.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "PASSWORD_MISMATCH",
                    "message": "Passwords do not match.",
                    "details": None,
                },
            )

        policy_error = _validate_password_policy(body.password)
        if policy_error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "WEAK_PASSWORD",
                    "message": policy_error,
                    "details": None,
                },
            )

        user = next(
            (u for u in _users.values() if u["id"] == stored["user_id"]),
            None,
        )
        if user is None:
            raise invalid_exc

        user["password_hash"] = _hash_password(body.password)
        user["updated_at"] = datetime.now(timezone.utc)
        stored["used_at"] = datetime.now(timezone.utc)

        # Revoke all refresh tokens for this user
        for rt in _refresh_tokens.values():
            if rt["user_id"] == user["id"] and rt["revoked_at"] is None:
                rt["revoked_at"] = datetime.now(timezone.utc)

        return ResetPasswordResponse(message="Your password has been reset successfully.")

    # ------------------------------------------------------------------
    # me
    # ------------------------------------------------------------------

    async def me(self, token: str) -> MeResponse:
        unauth_exc = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_TOKEN",
                "message": "Invalid or expired token.",
                "details": None,
            },
        )
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except JWTError:
            raise unauth_exc

        email: Optional[str] = payload.get("email")
        if email is None:
            raise unauth_exc

        user = _users.get(email)
        if user is None or not user["is_active"]:
            raise unauth_exc

        return MeResponse(
            id=user["id"],
            fullName=user["full_name"],
            email=user["email"],
        )

    # ------------------------------------------------------------------
    # logout
    # ------------------------------------------------------------------

    async def logout(
        self,
        request: Request,
        response: Response,
        token: Optional[str],
    ) -> LogoutResponse:
        raw_refresh = _get_refresh_token_from_request(request)
        if raw_refresh:
            token_hash = _sha256(raw_refresh)
            stored = _refresh_tokens.get(token_hash)
            if stored and stored["revoked_at"] is None:
                stored["revoked_at"] = datetime.now(timezone.utc)

        _clear_refresh_cookie(response)

        return LogoutResponse(message="You have been logged out successfully.")
