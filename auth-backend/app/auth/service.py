from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import Response

from app.auth.schemas import LoginRequest, LoginResponse
from app.core.config import settings
from app.core.database import database
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_token,
    verify_password,
)
from app.core.exceptions import UnauthorizedException


async def login(body: LoginRequest, response: Response) -> LoginResponse:
    """Authenticate a user with email and password.

    Enumeration-resistant: always returns the same error for bad credentials.
    """
    row = await database.fetch_one(
        "SELECT id, full_name, email, password_hash, is_active "
        "FROM users WHERE email = :email",
        {"email": body.email.lower()},
    )

    # Perform comparison even when no row found to prevent timing attacks.
    stored_hash: str = row["password_hash"] if row else "$2b$12$invalidhashfortimingXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    password_valid = verify_password(body.password, stored_hash)

    if not row or not password_valid or not row["is_active"]:
        raise UnauthorizedException("Invalid email or password.")

    user_id: int = row["id"]
    full_name: str = row["full_name"]
    email: str = row["email"]

    # Issue access token.
    access_token = create_access_token(
        subject=str(user_id),
        extra_claims={"email": email, "full_name": full_name},
    )

    # Issue refresh token and persist its hash.
    raw_refresh_token, refresh_token_hash = create_refresh_token()
    remember_me: bool = body.remember_me if body.remember_me is not None else False
    refresh_expires_delta = (
        timedelta(days=settings.REFRESH_TOKEN_REMEMBER_ME_DAYS)
        if remember_me
        else timedelta(days=settings.REFRESH_TOKEN_DAYS)
    )
    expires_at = datetime.now(timezone.utc) + refresh_expires_delta

    await database.execute(
        "INSERT INTO refresh_tokens "
        "(user_id, token_hash, expires_at, remember_me, created_at) "
        "VALUES (:user_id, :token_hash, :expires_at, :remember_me, :created_at)",
        {
            "user_id": user_id,
            "token_hash": refresh_token_hash,
            "expires_at": expires_at,
            "remember_me": remember_me,
            "created_at": datetime.now(timezone.utc),
        },
    )

    # Set refresh token in httpOnly cookie.
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        max_age=int(refresh_expires_delta.total_seconds()),
        path="/auth/refresh",
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user_id,
            "full_name": full_name,
            "email": email,
        },
    )
