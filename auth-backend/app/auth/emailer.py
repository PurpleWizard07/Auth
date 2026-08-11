from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config.settings import settings


def _build_reset_link(raw_token: str) -> str:
    """Build the full password-reset URL from the raw token."""
    base = settings.APP_BASE_URL.rstrip("/")
    return f"{base}/reset-password?token={raw_token}"


def _build_plain_text_body(reset_link: str) -> str:
    return (
        "You requested a password reset.\n\n"
        "Click the link below to reset your password:\n"
        f"{reset_link}\n\n"
        "This link expires in 1 hour.\n\n"
        "If you did not request a password reset, please ignore this email."
    )


def _build_html_body(reset_link: str) -> str:
    return (
        "<!DOCTYPE html>"
        "<html lang=\"en\">"
        "<head><meta charset=\"UTF-8\"></head>"
        "<body>"
        "<p>You requested a password reset.</p>"
        "<p>Click the link below to reset your password:</p>"
        f'<p><a href=\"{reset_link}\">Reset your password</a></p>'
        "<p>This link expires in 1 hour.</p>"
        "<p>If you did not request a password reset, please ignore this email.</p>"
        "</body>"
        "</html>"
    )


def send_reset_email(to_email: str, raw_token: str) -> None:
    """Send a password-reset email to *to_email* containing the reset link.

    Builds the link as ``APP_BASE_URL/reset-password?token=<raw_token>`` and
    delivers it via the SMTP_* settings.
    """
    reset_link = _build_reset_link(raw_token)

    message = MIMEMultipart("alternative")
    message["Subject"] = "Reset your password"
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email

    plain_part = MIMEText(_build_plain_text_body(reset_link), "plain", "utf-8")
    html_part = MIMEText(_build_html_body(reset_link), "html", "utf-8")

    # Attach plain text first; HTML is the preferred alternative.
    message.attach(plain_part)
    message.attach(html_part)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        if settings.SMTP_TLS:
            server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, to_email, message.as_string())
