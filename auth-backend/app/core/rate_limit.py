"""Rate limiting utilities for login and forgot-password endpoints (NFR-08)."""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config.settings import settings

limiter = Limiter(key_func=get_remote_address)

login_limit: str = settings.LOGIN_RATE_LIMIT
forgot_password_limit: str = settings.FORGOT_PASSWORD_RATE_LIMIT
