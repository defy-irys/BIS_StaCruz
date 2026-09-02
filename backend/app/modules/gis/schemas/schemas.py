"""
GIS Module - Schemas

Defines the Pydantic data models (DTOs) used for request validation
and response serialization for geographic boundary, zoning, and resident/household location data.

These are placeholder definitions only. Fields will be added once
the data requirements are finalized. No database models are defined
here -- schemas describe API input/output shape only.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class GISBoundaryResponse(BaseModel):
    """
    TODO: Representation of a geographic boundary (e.g. barangay/zone/purok polygon and metadata).
    """
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GISBoundaryListResponse(BaseModel):
    """
    TODO: Wrapper for returning multiple boundary records.
    """
    items: List[dict] = []  # TODO: replace 'dict' with the GISBoundaryResponse schema type
    total: int = 0


class ResidentLocationResponse(BaseModel):
    """
    TODO: Geolocation point associated with a resident or household.
    """
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ResidentLocationListResponse(BaseModel):
    """
    TODO: Wrapper for returning multiple resident/household location points.
    """
    items: List[dict] = []  # TODO: replace 'dict' with the ResidentLocationResponse schema type
    total: int = 0


class ZoneMapResponse(BaseModel):
    """
    TODO: Map/boundary data specific to a single zone or purok.
    """
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GeoDataUploadRequest(BaseModel):
    """
    TODO: Payload required to upload/import geographic boundary or location data.
    """
    pass
