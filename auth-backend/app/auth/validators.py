from __future__ import annotations

import re


# ---------------------------------------------------------------------------
# Password policy constants (mirrors capabilities.yaml)
# ---------------------------------------------------------------------------

PASSWORD_MIN_LENGTH = 8
_UPPER_RE = re.compile(r"[A-Z]")
_LOWER_RE = re.compile(r"[a-z]")
_DIGIT_RE = re.compile(r"[0-9]")
_EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+"
    r"@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
)


# ---------------------------------------------------------------------------
# Individual rule checkers
# ---------------------------------------------------------------------------


def _has_min_length(password: str) -> bool:
    return len(password) >= PASSWORD_MIN_LENGTH


def _has_uppercase(password: str) -> bool:
    return bool(_UPPER_RE.search(password))


def _has_lowercase(password: str) -> bool:
    return bool(_LOWER_RE.search(password))


def _has_digit(password: str) -> bool:
    return bool(_DIGIT_RE.search(password))


# ---------------------------------------------------------------------------
# Password policy validator
# Returns a list of error messages in the exact order defined in
# validation-rules.md.  Empty list means the password is valid.
# ---------------------------------------------------------------------------


def validate_password_policy(password: str) -> list[str]:
    """Return validation error messages for *password* (empty = valid)."""
    errors: list[str] = []

    if not _has_min_length(password):
        errors.append("Password must be at least 8 characters.")

    if not _has_uppercase(password):
        errors.append("Password must contain at least one uppercase letter.")

    if not _has_lowercase(password):
        errors.append("Password must contain at least one lowercase letter.")

    if not _has_digit(password):
        errors.append("Password must contain at least one number.")

    return errors


# ---------------------------------------------------------------------------
# Field validators
# Each function returns None when valid or the exact error message string
# from validation-rules.md when invalid.
# ---------------------------------------------------------------------------


def validate_full_name(full_name: str | None) -> str | None:
    """Validate the full_name field."""
    if not full_name or not full_name.strip():
        return "Full name is required."
    if len(full_name.strip()) < 2:
        return "Full name must be at least 2 characters."
    if len(full_name.strip()) > 100:
        return "Full name must be at most 100 characters."
    return None


def validate_email(email: str | None) -> str | None:
    """Validate the email field."""
    if not email or not email.strip():
        return "Email is required."
    if not _EMAIL_RE.match(email.strip()):
        return "Please enter a valid email address."
    return None


def validate_password(password: str | None) -> str | None:
    """Return the *first* policy violation message, or None when valid."""
    if not password:
        return "Password is required."
    errors = validate_password_policy(password)
    return errors[0] if errors else None


def validate_confirm_password(
    password: str | None, confirm_password: str | None
) -> str | None:
    """Validate that confirm_password matches password."""
    if not confirm_password:
        return "Please confirm your password."
    if password != confirm_password:
        return "Passwords do not match."
    return None


# ---------------------------------------------------------------------------
# Composite registration validator
# Returns a dict mapping field name -> list[str] of error messages.
# The keys are only present when there is at least one error for that field.
# ---------------------------------------------------------------------------


def validate_register_fields(
    *,
    full_name: str | None,
    email: str | None,
    password: str | None,
    confirm_password: str | None,
) -> dict[str, list[str]]:
    """Run all registration field validators and collect errors."""
    field_errors: dict[str, list[str]] = {}

    name_error = validate_full_name(full_name)
    if name_error:
        field_errors["full_name"] = [name_error]

    email_error = validate_email(email)
    if email_error:
        field_errors["email"] = [email_error]

    if not password:
        field_errors["password"] = ["Password is required."]
    else:
        policy_errors = validate_password_policy(password)
        if policy_errors:
            field_errors["password"] = policy_errors

    confirm_error = validate_confirm_password(password, confirm_password)
    if confirm_error:
        field_errors["confirm_password"] = [confirm_error]

    return field_errors


# ---------------------------------------------------------------------------
# Composite login validator
# ---------------------------------------------------------------------------


def validate_login_fields(
    *,
    email: str | None,
    password: str | None,
) -> dict[str, list[str]]:
    """Run field-presence validators for login (policy not checked here)."""
    field_errors: dict[str, list[str]] = {}

    email_error = validate_email(email)
    if email_error:
        field_errors["email"] = [email_error]

    if not password:
        field_errors["password"] = ["Password is required."]

    return field_errors


# ---------------------------------------------------------------------------
# Composite reset-password validator
# ---------------------------------------------------------------------------


def validate_reset_password_fields(
    *,
    password: str | None,
    confirm_password: str | None,
) -> dict[str, list[str]]:
    """Run validators for the reset-password form."""
    field_errors: dict[str, list[str]] = {}

    if not password:
        field_errors["password"] = ["Password is required."]
    else:
        policy_errors = validate_password_policy(password)
        if policy_errors:
            field_errors["password"] = policy_errors

    confirm_error = validate_confirm_password(password, confirm_password)
    if confirm_error:
        field_errors["confirm_password"] = [confirm_error]

    return field_errors
