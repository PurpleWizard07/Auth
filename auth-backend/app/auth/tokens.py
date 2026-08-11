from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import jwt

from app.config.settings import settings

# ---------------------------------------------------------------------------
# TTL constants
# ---------------------------------------------------------------------------

ACCESS_TOKEN_TTL: timedelta = timedelta(minutes=15)

# Refresh token TTLs depend on rememberMe
REFRESH_TOKEN_TTL_DEFAULT: timedelta = timedelta(hours=24)
REFRESH_TOKEN_TTL_EXTENDED: timedelta = timedelta(days=30)

# Password-reset token TTL
RESET_TOKEN_TTL: timedelta = timedelta(hours=1)

# Algorithm used for JWTs
ALGORITHM = "HS256"


# ---------------------------------------------------------------------------
# Hashing helpers
# ---------------------------------------------------------------------------


def hash_token(raw_token: str) -> str:
    """Return a hex-encoded SHA-256 digest of *raw_token*."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Access token
# ---------------------------------------------------------------------------


def create_access_token(
    *,
    user_id: int,
    extra_claims: Optional[dict[str, Any]] = None,
) -> str:
    """Create a short-lived JWT access token for *user_id*."""
    now = datetime.now(tz=timezone.utc)
    expire = now + ACCESS_TOKEN_TTL
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "iat": now,
        "exp": expire,
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT access token; raises JoseError on failure."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])


# ---------------------------------------------------------------------------
# Refresh token
# ---------------------------------------------------------------------------


def _refresh_token_ttl(remember_me: bool) -> timedelta:
    """Return the appropriate refresh-token TTL based on *remember_me*."""
    return REFRESH_TOKEN_TTL_EXTENDED if remember_me else REFRESH_TOKEN_TTL_DEFAULT


def create_refresh_token(
    *,
    remember_me: bool = False,
) -> tuple[str, datetime]:
    """Generate a cryptographically secure refresh token.

    Returns a ``(raw_token, expires_at)`` tuple.  Persist
    ``hash_token(raw_token)`` — never the raw value.
    """
    raw = secrets.token_urlsafe(64)
    expires_at = datetime.now(tz=timezone.utc) + _refresh_token_ttl(remember_me)
    return raw, expires_at


def rotate_refresh_token(
    *,
    remember_me: bool = False,
) -> tuple[str, datetime]:
    """Produce a replacement refresh token during rotation.

    Callers are responsible for revoking the old token in the repository and
    persisting the new ``hash_token(raw_token)`` + *expires_at*.
    """
    return create_refresh_token(remember_me=remember_me)


# ---------------------------------------------------------------------------
# Password-reset token
# ---------------------------------------------------------------------------


def create_reset_token() -> tuple[str, datetime]:
    """Generate a cryptographically secure one-time password-reset token.

    Returns a ``(raw_token, expires_at)`` tuple.  Persist
    ``hash_token(raw_token)`` — never the raw value.
    """
    raw = secrets.token_urlsafe(64)
    expires_at = datetime.now(tz=timezone.utc) + RESET_TOKEN_TTL
    return raw, expires_at


# ---------------------------------------------------------------------------
# Token validation helpers
# ---------------------------------------------------------------------------


def is_token_expired(expires_at: datetime) -> bool:
    """Return True when *expires_at* is in the past."""
    now = datetime.now(tz=timezone.utc)
    # Normalise to UTC if the stored datetime is naive
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return now >= expires_at


def is_refresh_token_valid(token_row: dict) -> bool:
    """Return True when a refresh-token DB row is still usable."""
    if token_row.get("revoked_at") is not None:
        return False
    expires_at: datetime = token_row["expires_at"]
    return not is_token_expired(expires_at)


def is_reset_token_valid(token_row: dict) -> bool:
    """Return True when a password-reset DB row is still usable."""
    if token_row.get("used_at") is not None:
        return False
    expires_at: datetime = token_row["expires_at"]
    return not is_token_expired(expires_at)
