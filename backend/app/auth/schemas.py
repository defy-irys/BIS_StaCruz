"""
Pydantic schemas for authentication.

Adjusted to match the final User model:
- `username` is optional because the model may allow NULL.
- `UserResponse` maps all fields that exist on the User model.
"""
from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Registration payload."""
    email: EmailStr
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    """Login credentials."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT pair response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Refresh token payload."""
    refresh_token: str


class UserResponse(BaseModel):
    """Public user data returned in API responses."""
    id: UUID
    email: str
    username: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}