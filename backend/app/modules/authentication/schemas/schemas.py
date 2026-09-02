"""
Authentication module schemas.

This module keeps the authentication feature's public DTO names while
reusing the shared user/token schema shapes used by the service layer.
"""

from pydantic import BaseModel

from app.schemas.token import RefreshTokenRequest, Token as TokenResponse
from app.schemas.user import UserRead as UserProfileResponse


class LoginRequest(BaseModel):
    """Credentials accepted by non-Swagger JSON clients."""

    username: str
    password: str


__all__ = [
    "LoginRequest",
    "RefreshTokenRequest",
    "TokenResponse",
    "UserProfileResponse",
]
