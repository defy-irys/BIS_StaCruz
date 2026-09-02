"""
Authentication dependencies.

Provides:
  * `get_auth_service` - constructs `AuthService` for use in the auth endpoints.
  * `get_current_user` - decodes the bearer token from the `Authorization`
    header and loads the corresponding `User`. This is the dependency any
    protected endpoint should depend on to require authentication.
  * `get_current_active_user` - additionally rejects deactivated accounts.

These are the building blocks other routers (once domain features exist)
will use to protect their endpoints, e.g.:
    @router.get("/residents")
    async def list_residents(user: CurrentUser): ...
"""

import uuid
from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

from app.auth.jwt_handler import PyJWTError, TokenType, decode_token
from app.core.exceptions import InactiveUserException, InsufficientPermissionsException, InvalidTokenException
from app.dependencies.database import get_user_repository
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService

# `tokenUrl` points to the login endpoint; used only to generate the
# "Authorize" button in the OpenAPI/Swagger docs, not for actual routing.
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_auth_service(user_repository: Annotated[UserRepository, Depends(get_user_repository)]) -> AuthService:
    """Provide an `AuthService` wired up with a request-scoped `UserRepository`."""
    return AuthService(user_repository)


async def get_current_user(
    token: Annotated[str, Depends(_oauth2_scheme)],
    user_repository: Annotated[UserRepository, Depends(get_user_repository)],
) -> User:
    """
    Resolve the currently authenticated user from a bearer access token.

    Raises `InvalidTokenException` (-> HTTP 401) if the token is missing,
    malformed, expired, not an access token, or does not resolve to an
    existing user.
    """
    try:
        payload = decode_token(token)
    except PyJWTError as exc:
        raise InvalidTokenException() from exc

    if payload.get("type") != TokenType.ACCESS.value:
        raise InvalidTokenException("Provided token is not an access token.")

    try:
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, KeyError) as exc:
        raise InvalidTokenException() from exc

    user = await user_repository.get_by_id(user_id)
    if user is None:
        raise InvalidTokenException()
    return user


async def get_current_active_user(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Require that the resolved user's account is active (not disabled)."""
    if not user.is_active:
        raise InactiveUserException()
    return user


async def get_current_superuser(user: Annotated[User, Depends(get_current_active_user)]) -> User:
    """Require that the authenticated user has administrative privileges."""
    if not user.is_superuser:
        raise InsufficientPermissionsException("This user does not have administrative access.")
    return user


async def get_current_admin(user: Annotated[User, Depends(get_current_superuser)]) -> User:
    """Backward-compatible alias for routes that still use the admin dependency name."""
    return user


# Convenient annotated aliases for use in endpoint signatures.
CurrentUser = Annotated[User, Depends(get_current_active_user)]
CurrentSuperuser = Annotated[User, Depends(get_current_superuser)]
CurrentAdmin = Annotated[User, Depends(get_current_admin)]
