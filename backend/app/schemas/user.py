"""
User schemas.

Defines the API-facing shapes for user data. `UserRead` is what gets
returned to clients (e.g. from `/auth/me`) and deliberately excludes
`hashed_password` - it must never leave the server. `UserCreate` exists
because the `AuthService` needs a validated shape to create the very first
account(s); it is not wired to any public "register" endpoint in this
foundation (account provisioning policy is a business decision left to a
later phase).
"""

import uuid
from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.base import ORMBaseSchema
from pydantic import BaseModel


class UserCreate(BaseModel):
    """Input shape for creating a new user account."""

    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserRead(ORMBaseSchema):
    """Output shape representing a user account. Never includes the password hash."""

    id: uuid.UUID
    username: str
    email: EmailStr
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
