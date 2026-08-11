from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from app.auth.schemas import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    MeResponse,
    LogoutRequest,
    LogoutResponse,
    RefreshRequest,
    RefreshResponse,
)
from app.auth.service import (
    login,
    register,
    forgotPassword,
    resetPassword,
    me,
    logout,
    refresh,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    operation_id="login",
)
async def login_endpoint(
    request: Request,
    body: LoginRequest,
    response: Response,
) -> LoginResponse:
    return await login(request=request, body=body, response=response)


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="register",
)
async def register_endpoint(
    request: Request,
    body: RegisterRequest,
) -> RegisterResponse:
    return await register(request=request, body=body)


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    status_code=status.HTTP_202_ACCEPTED,
    operation_id="forgotPassword",
)
async def forgot_password_endpoint(
    request: Request,
    body: ForgotPasswordRequest,
) -> ForgotPasswordResponse:
    return await forgotPassword(request=request, body=body)


@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
    status_code=status.HTTP_200_OK,
    operation_id="resetPassword",
)
async def reset_password_endpoint(
    request: Request,
    body: ResetPasswordRequest,
) -> ResetPasswordResponse:
    return await resetPassword(request=request, body=body)


@router.get(
    "/me",
    response_model=MeResponse,
    status_code=status.HTTP_200_OK,
    operation_id="me",
)
async def me_endpoint(
    request: Request,
) -> MeResponse:
    return await me(request=request)


@router.post(
    "/logout",
    response_model=LogoutResponse,
    status_code=status.HTTP_200_OK,
    operation_id="logout",
)
async def logout_endpoint(
    request: Request,
    body: LogoutRequest,
    response: Response,
) -> LogoutResponse:
    return await logout(request=request, body=body, response=response)


@router.post(
    "/refresh",
    response_model=RefreshResponse,
    status_code=status.HTTP_200_OK,
    operation_id="refresh",
)
async def refresh_endpoint(
    request: Request,
    body: RefreshRequest,
    response: Response,
) -> RefreshResponse:
    return await refresh(request=request, body=body, response=response)
