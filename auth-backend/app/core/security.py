import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.config.settings import settings


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        password_hash.encode("utf-8"),
    )


def hash_token(token: str) -> str:
    """Return the SHA-256 hex digest of a raw token string."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """Encode a short-lived JWT access token.

    Args:
        subject: The value placed in the ``sub`` claim (typically the user id).
        extra_claims: Additional claims merged into the payload.
        expires_delta: Custom lifetime; falls back to settings.ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns:
        A signed JWT string.
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    now = datetime.now(tz=timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + expires_delta,
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """Encode a refresh token JWT.

    Args:
        subject: The value placed in the ``sub`` claim (typically the user id).
        extra_claims: Additional claims merged into the payload.
        expires_delta: Custom lifetime; falls back to settings.REFRESH_TOKEN_EXPIRE_DAYS.

    Returns:
        A signed JWT string.
    """
    if expires_delta is None:
        expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    now = datetime.now(tz=timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + expires_delta,
        "type": "refresh",
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT, returning its payload.

    Raises:
        jose.JWTError: If the token is invalid, expired, or the signature does
            not match.
    """
    payload: dict[str, Any] = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )
    return payload


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode a JWT and assert it is an access token.

    Raises:
        jose.JWTError: If the token is invalid, expired, or has the wrong type.
    """
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise JWTError("Token type is not 'access'.")
    return payload


def decode_refresh_token(token: str) -> dict[str, Any]:
    """Decode a JWT and assert it is a refresh token.

    Raises:
        jose.JWTError: If the token is invalid, expired, or has the wrong type.
    """
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise JWTError("Token type is not 'refresh'.")
    return payload
