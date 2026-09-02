"""
JWT (JSON Web Token) utilities.

Provides functions to create short-lived access tokens and longer-lived
refresh tokens, plus a single `decode_token` function to verify and parse
them back. Both token types carry a `type` claim ("access" / "refresh") so
that an endpoint expecting one kind cannot be tricked into accepting the
other (e.g. using a refresh token as if it were an access token).
"""

from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any

import jwt
from jwt import PyJWTError

from app.core.config import settings


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


def _create_token(subject: str, token_type: TokenType, expires_delta: timedelta) -> str:
    """Build and sign a JWT containing the standard claims used across the app."""
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,  # subject = user id (as a string)
        "type": token_type.value,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str) -> str:
    """Create a short-lived access token for the given user id (`subject`)."""
    expires_delta = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    return _create_token(subject, TokenType.ACCESS, expires_delta)


def create_refresh_token(subject: str) -> str:
    """Create a longer-lived refresh token for the given user id (`subject`)."""
    expires_delta = timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    return _create_token(subject, TokenType.REFRESH, expires_delta)


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT, returning its payload.

    Raises `jwt.PyJWTError` (or a subclass, e.g. `ExpiredSignatureError`,
    `InvalidTokenError`) if the token is malformed, expired, or has an
    invalid signature. Callers (see `app.dependencies.auth`) are responsible
    for translating that into an HTTP-facing error.
    """
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


__all__ = ["TokenType", "create_access_token", "create_refresh_token", "decode_token", "PyJWTError"]
