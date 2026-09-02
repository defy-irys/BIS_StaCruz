"""
Generic base repository.

`BaseRepository` factors out the CRUD operations that are identical for
almost any SQLAlchemy model (get by id, list, add, delete) so concrete
repositories only need to implement entity-specific queries. This exists
purely as reusable data-access infrastructure - it does not encode any
business rules.
"""

import uuid
from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Generic async repository for a single SQLAlchemy model type."""

    def __init__(self, model: type[ModelType], session: AsyncSession):
        self._model = model
        self._session = session

    async def get_by_id(self, entity_id: uuid.UUID) -> ModelType | None:
        """Fetch a single row by primary key, or None if it doesn't exist."""
        return await self._session.get(self._model, entity_id)

    async def list_all(self) -> list[ModelType]:
        """Fetch every row for this model. Fine for small/reference tables only."""
        result = await self._session.execute(select(self._model))
        return list(result.scalars().all())

    async def add(self, entity: ModelType) -> ModelType:
        """Add a new entity, flush to obtain generated defaults (e.g. id), and return it."""
        self._session.add(entity)
        await self._session.flush()
        return entity

    async def delete(self, entity: ModelType) -> None:
        """Delete an entity."""
        await self._session.delete(entity)
        await self._session.flush()
