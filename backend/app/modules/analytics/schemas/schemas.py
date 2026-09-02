"""
Analytics Module - Schemas

Defines the Pydantic data models (DTOs) used for request validation
and response serialization for aggregated statistics, dashboards, and demographic/population trends.

These are placeholder definitions only. Fields will be added once
the data requirements are finalized. No database models are defined
here -- schemas describe API input/output shape only.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    """
    TODO: High-level summary statistics for the main dashboard (e.g. population count, household count).
    """
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PopulationStatsResponse(BaseModel):
    """
    TODO: Population statistics broken down by attributes such as age and sex.
    """
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DemographicBreakdownResponse(BaseModel):
    """
    TODO: Demographic breakdown (e.g. civil status, occupation, education level).
    """
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HouseholdStatsResponse(BaseModel):
    """
    TODO: Household-level statistics (e.g. average size, type distribution).
    """
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TrendResponse(BaseModel):
    """
    TODO: Time-series trend data (e.g. population growth, new registrations) for a requested period.
    """
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
