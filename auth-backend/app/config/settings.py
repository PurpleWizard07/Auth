from __future__ import annotations

from pydantic import AnyUrl, EmailStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ------------------------------------------------------------------ #
    # Database
    # ------------------------------------------------------------------ #
    DATABASE_URL: str

    # ------------------------------------------------------------------ #
    # JWT
    # ------------------------------------------------------------------ #
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_TTL_MINUTES: int = 15

    # ------------------------------------------------------------------ #
    # Bcrypt
    # ------------------------------------------------------------------ #
    BCRYPT_ROUNDS: int = 12

    # ------------------------------------------------------------------ #
    # Password-reset token
    # ------------------------------------------------------------------ #
    RESET_TOKEN_TTL_MINUTES: int = 30

    # ------------------------------------------------------------------ #
    # Refresh token
    # ------------------------------------------------------------------ #
    REFRESH_TOKEN_TTL_DAYS: int = 7
    REFRESH_TOKEN_TTL_DAYS_REMEMBER_ME: int = 30

    # ------------------------------------------------------------------ #
    # SMTP
    # ------------------------------------------------------------------ #
    SMTP_HOST: str
    SMTP_PORT: int = 587
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    SMTP_FROM_EMAIL: EmailStr
    SMTP_FROM_NAME: str = "Auth Starter"
    SMTP_USE_TLS: bool = True

    # ------------------------------------------------------------------ #
    # Rate limits
    # ------------------------------------------------------------------ #
    RATE_LIMIT_LOGIN_MAX_ATTEMPTS: int = 5
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = 60
    RATE_LIMIT_FORGOT_PASSWORD_MAX_ATTEMPTS: int = 3
    RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS: int = 300

    # ------------------------------------------------------------------ #
    # Validators
    # ------------------------------------------------------------------ #
    @field_validator("BCRYPT_ROUNDS")
    @classmethod
    def bcrypt_rounds_minimum(cls, v: int) -> int:
        if v < 12:
            raise ValueError(
                "BCRYPT_ROUNDS must be at least 12 for adequate security"
            )
        return v

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def jwt_secret_key_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("JWT_SECRET_KEY must not be empty")
        return v

    @field_validator("DATABASE_URL")
    @classmethod
    def database_url_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("DATABASE_URL must not be empty")
        return v

    @field_validator("SMTP_HOST")
    @classmethod
    def smtp_host_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("SMTP_HOST must not be empty")
        return v

    @field_validator("SMTP_USERNAME")
    @classmethod
    def smtp_username_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("SMTP_USERNAME must not be empty")
        return v

    @field_validator("SMTP_PASSWORD")
    @classmethod
    def smtp_password_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("SMTP_PASSWORD must not be empty")
        return v

    @field_validator("RESET_TOKEN_TTL_MINUTES")
    @classmethod
    def reset_token_ttl_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("RESET_TOKEN_TTL_MINUTES must be a positive integer")
        return v

    @field_validator("REFRESH_TOKEN_TTL_DAYS", "REFRESH_TOKEN_TTL_DAYS_REMEMBER_ME")
    @classmethod
    def refresh_token_ttl_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError(
                "REFRESH_TOKEN_TTL_DAYS and REFRESH_TOKEN_TTL_DAYS_REMEMBER_ME must be positive integers"
            )
        return v


def get_settings() -> Settings:
    """Return a cached Settings instance; fails fast if any required var is missing."""
    return _settings


# Module-level instantiation ensures the application fails immediately at startup
# if required environment variables are absent or invalid.
_settings: Settings = Settings()
