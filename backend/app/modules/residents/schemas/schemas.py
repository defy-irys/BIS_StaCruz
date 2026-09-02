"""
Residents Module - Schemas

Defines the Pydantic data models (DTOs) used for request validation
and response serialization for barangay resident profile records.

These are placeholder definitions only. Fields will be added once
the data requirements are finalized. No database models are defined
here -- schemas describe API input/output shape only.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class ResidentBase(BaseModel):
    """
    TODO: Shared/common fields for a resident profile (e.g. name, birth date, sex, civil status, address).
    """
    pass


class ResidentCreate(ResidentBase):
    """
    TODO: Fields required to register a new resident record.
    """
    pass


class ResidentUpdate(ResidentBase):
    """
    TODO: Fields allowed for a partial/full update of an existing resident record.
    """
    pass


class ResidentResponse(ResidentBase):
    """
    TODO: Resident representation returned to API consumers, including system-generated fields.
    """
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ResidentListResponse(BaseModel):
    """
    TODO: Paginated wrapper for returning multiple resident records.
    """
    items: List[dict] = []  # TODO: replace 'dict' with the ResidentResponse schema type
    total: int = 0
