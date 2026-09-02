"""Authentication module API router."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.dependencies.auth import CurrentUser, get_auth_service
from app.services.auth_service import AuthService
from app.modules.authentication.schemas.schemas import (
    RefreshTokenRequest,
    TokenResponse,
    UserProfileResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", summary="Authenticate a user and issue tokens", response_model=TokenResponse)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> TokenResponse:
    """Authenticate form credentials and return a bearer token pair."""
    return await auth_service.login(form_data.username, form_data.password)


@router.post("/logout", summary="End the current bearer-token session", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user: CurrentUser) -> Response:
    """
    Acknowledge logout for stateless JWT clients.

    Tokens remain valid until expiration; server-side revocation is outside
    this phase's current stateless JWT implementation.
    """
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/refresh", summary="Refresh an access token", response_model=TokenResponse)
async def refresh_token(
    payload: RefreshTokenRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> TokenResponse:
    """Validate a refresh token and issue a new token pair."""
    return await auth_service.refresh(payload.refresh_token)


@router.get("/me", summary="Get the current authenticated user's profile", response_model=UserProfileResponse)
async def get_current_user_profile(current_user: CurrentUser) -> UserProfileResponse:
    """Return the authenticated user's profile."""
    return UserProfileResponse.model_validate(current_user)
