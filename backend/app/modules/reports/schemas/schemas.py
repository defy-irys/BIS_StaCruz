"""
Reports Module - Schemas

Defines the Pydantic data models (DTOs) used for request validation
and response serialization for generated statistical/administrative reports.

These are placeholder definitions only. Fields will be added once
the data requirements are finalized. No database models are defined
here -- schemas describe API input/output shape only.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class ReportTypeResponse(BaseModel):
    """
    TODO: Representation of an available report type (e.g. id, name, description).
    """
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportGenerateRequest(BaseModel):
    """
    TODO: Parameters required to generate a report (e.g. report_type, filters, date range).
    """
    pass


class ReportResponse(BaseModel):
    """
    TODO: Representation of a generated report (metadata, status, and reference to its content/file).
    """
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    """
    TODO: Paginated wrapper for returning multiple generated report records.
    """
    items: List[dict] = []  # TODO: replace 'dict' with the ReportResponse schema type
    total: int = 0
