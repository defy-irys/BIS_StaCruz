"""
Officials Module - Schemas

Defines the Pydantic data models (DTOs) used for request validation
and response serialization for barangay official records, positions, and terms.

These are placeholder definitions only. Fields will be added once
the data requirements are finalized. No database models are defined
here -- schemas describe API input/output shape only.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class OfficialBase(BaseModel):
    """
    TODO: Shared/common fields for a barangay official (e.g. name, position, term start/end).
    """
    pass


class OfficialCreate(OfficialBase):
    """
    TODO: Fields required to register a new official record.
    """
    pass


class OfficialUpdate(OfficialBase):
    """
    TODO: Fields allowed for a partial/full update of an existing official record.
    """
    pass


class OfficialResponse(OfficialBase):
    """
    TODO: Official representation returned to API consumers.
    """
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OfficialListResponse(BaseModel):
    """
    TODO: Paginated wrapper for returning multiple official records.
    """
    items: List[dict] = []  # TODO: replace 'dict' with the OfficialResponse schema type
    total: int = 0
