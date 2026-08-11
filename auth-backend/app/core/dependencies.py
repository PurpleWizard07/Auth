"""FastAPI dependency providers for the auth application."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.database import get_db

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> "User":  # noqa: F821 — resolved at runtime
    """Validate the Bearer access token and return the authenticated User.

    Raises:
        HTTPException 401: If the token is missing, invalid, expired, or the
            user cannot be found or is inactive.
    """
    from app.models.user import User  # local import to avoid circular deps

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error": {
                "code": "UNAUTHORIZED",
                "message": "Could not validate credentials.",
                "details": [],
            }
        },
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_exception

    token = credentials.credentials

    try:
        payload = decode_access_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.get(User, user_id)
    if result is None:
        raise credentials_exception

    if not result.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Could not validate credentials.",
                    "details": [],
                }
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    return result
