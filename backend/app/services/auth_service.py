"""
Authentication service.

Orchestrates the login flow: look up the user, verify their password,
and issue a token pair. Also implements refresh-token exchange. This is
the layer that `api/v1/endpoints/auth.py` calls into - the endpoint itself
stays a thin HTTP adapter with no business logic of its own.
"""

import uuid

from app.auth.jwt_handler import (
    PyJWTError,
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.auth.password import verify_password
from app.core.exceptions import InactiveUserException, InvalidCredentialsException, InvalidTokenException
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.token import Token


class AuthService:
    """Application service implementing authentication use cases."""

    def __init__(self, user_repository: UserRepository):
        self._users = user_repository

    async def authenticate(self, username: str, password: str) -> User:
        """
        Verify a username/password pair.

        Raises `InvalidCredentialsException` if the username doesn't exist or
        the password doesn't match, and `InactiveUserException` if the
        account has been deactivated. The two failure modes for "unknown
        user" vs "wrong password" are intentionally reported identically to
        avoid leaking which usernames exist.
        """
        user = await self._users.get_by_username(username)
        if user is None or not verify_password(password, user.hashed_password):
            raise InvalidCredentialsException()
        if not user.is_active:
            raise InactiveUserException()
        return user

    async def login(self, username: str, password: str) -> Token:
        """Authenticate credentials and issue a fresh access/refresh token pair."""
        user = await self.authenticate(username, password)
        return Token(
            access_token=create_access_token(subject=str(user.id)),
            refresh_token=create_refresh_token(subject=str(user.id)),
        )

    async def refresh(self, refresh_token: str) -> Token:
        """
        Exchange a valid, non-expired refresh token for a new token pair.

        Raises `InvalidTokenException` if the token is malformed/expired, is
        not a refresh token, or no longer maps to an active user.
        """
        try:
            payload = decode_token(refresh_token)
        except PyJWTError as exc:
            raise InvalidTokenException() from exc

        if payload.get("type") != TokenType.REFRESH.value:
            raise InvalidTokenException("Provided token is not a refresh token.")

        try:
            user_id = uuid.UUID(payload["sub"])
        except (ValueError, KeyError) as exc:
            raise InvalidTokenException() from exc

        user = await self._users.get_by_id(user_id)
        if user is None or not user.is_active:
            raise InvalidTokenException()

        return Token(
            access_token=create_access_token(subject=str(user.id)),
            refresh_token=create_refresh_token(subject=str(user.id)),
        )
