"""
User repository.

Adds the lookups that authentication actually needs on top of the generic
`BaseRepository`: finding a user by username or email. No other
user-related querying (search, pagination, filters, etc.) is implemented -
that belongs to a future user-management feature, not this foundation.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models.role import Role
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Data-access layer for the `User` model."""

    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_username(self, username: str) -> User | None:
        """Look up a user by their unique username (used at login)."""
        result = await self._session.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Look up a user by their unique email address."""
        result = await self._session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_id_with_roles_permissions(self, user_id: UUID) -> User | None:
        """
        Load a user together with their roles and permissions using eager loading.

        This prevents async lazy-loading errors and avoids N+1 queries when
        authorization checks inspect RBAC data (e.g., in app/api/rbac.py).
        """
        stmt = (
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.roles).selectinload(Role.permissions)
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()
