"""
Asynchronous repositories for authentication.

All database access for authentication entities is handled here.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.models import RefreshToken
from app.models.role import Role
from app.models.user import User


class UserRepository:
    """Data access for the User entity."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_with_roles_permissions(
        self, user_id: UUID
    ) -> Optional[User]:
        """
        Load a user together with roles and permissions.

        Eager loading prevents async lazy-loading errors and avoids
        N+1 queries when authorization checks inspect RBAC data.
        """
        stmt = (
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.roles).selectinload(Role.permissions)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user


class RefreshTokenRepository:
    """Data access for refresh tokens."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, refresh_token: RefreshToken) -> RefreshToken:
        self.db.add(refresh_token)
        await self.db.flush()
        return refresh_token

    async def get_valid_token(
        self, token: str
    ) -> Optional[RefreshToken]:
        """
        Return a refresh token that exists and has not been revoked.

        Expiration is checked by AuthService.
        """
        stmt = select(RefreshToken).where(
            RefreshToken.token == token,
            RefreshToken.revoked.is_(False),
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def revoke_token(self, refresh_token: RefreshToken) -> None:
        refresh_token.revoked = True
        await self.db.flush()

    async def revoke_all_for_user(self, user_id: UUID) -> None:
        stmt = select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked.is_(False),
        )
        result = await self.db.execute(stmt)

        for token in result.scalars().all():
            token.revoked = True

        await self.db.flush()