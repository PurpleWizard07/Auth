from typing import Any

from fastapi.responses import JSONResponse

from app.common.errors import AppError, ErrorCode


def error_response(
    code: ErrorCode,
    message: str,
    status_code: int = 400,
    details: dict[str, Any] | None = None,
) -> JSONResponse:
    """Return a JSON response conforming to the ErrorResponse envelope.

    Shape: { error: { code, message, details } }
    """
    body: dict[str, Any] = {
        "error": {
            "code": code.value,
            "message": message,
            "details": details if details is not None else {},
        }
    }
    return JSONResponse(status_code=status_code, content=body)


def error_response_from_exception(exc: AppError) -> JSONResponse:
    """Build an ErrorResponse envelope directly from an AppError instance."""
    return error_response(
        code=exc.code,
        message=exc.message,
        status_code=exc.status_code,
        details=exc.details,
    )
