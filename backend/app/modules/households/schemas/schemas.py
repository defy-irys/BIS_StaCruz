"""
Households Module - Schemas

Defines the Pydantic data models (DTOs) used for request validation
and response serialization for household records and resident-to-household membership.

These are placeholder definitions only. Fields will be added once
the data requirements are finalized. No database models are defined
here -- schemas describe API input/output shape only.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class HouseholdBase(BaseModel):
    """
    TODO: Shared/common fields for a household record (e.g. household number, address, purok/zone).
    """
    pass


class HouseholdCreate(HouseholdBase):
    """
    TODO: Fields required to register a new household record.
    """
    pass


class HouseholdUpdate(HouseholdBase):
    """
    TODO: Fields allowed for a partial/full update of an existing household record.
    """
    pass


class HouseholdResponse(HouseholdBase):
    """
    TODO: Household representation returned to API consumers.
    """
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HouseholdListResponse(BaseModel):
    """
    TODO: Paginated wrapper for returning multiple household records.
    """
    items: List[dict] = []  # TODO: replace 'dict' with the HouseholdResponse schema type
    total: int = 0


class HouseholdMemberLink(HouseholdBase):
    """
    TODO: Fields required to link an existing resident to a household as a member (e.g. resident_id, relationship to head).
    """
    pass


class HouseholdMemberResponse(HouseholdBase):
    """
    TODO: Representation of a resident's membership within a household.
    """
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HouseholdMemberListResponse(BaseModel):
    """
    TODO: Wrapper for returning the list of members belonging to a household.
    """
    items: List[dict] = []  # TODO: replace 'dict' with the HouseholdMemberResponse schema type
    total: int = 0
