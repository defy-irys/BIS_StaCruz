"""
Base schema configuration.

`ORMBaseSchema` is the parent for any schema that needs to be built directly
from a SQLAlchemy model instance (via `from_attributes`, the Pydantic v2
replacement for v1's `orm_mode`). Plain request-body schemas that don't wrap
ORM objects can just inherit from `pydantic.BaseModel` directly.
"""

from pydantic import BaseModel, ConfigDict


class ORMBaseSchema(BaseModel):
    """Base class for response schemas that are constructed from ORM objects."""

    model_config = ConfigDict(from_attributes=True)
