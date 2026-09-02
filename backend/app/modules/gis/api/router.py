"""
GIS Module - API Router

Defines placeholder HTTP endpoints for geographic boundary, zoning, and resident/household location data.
Endpoints are stubs only: request/response contracts are declared via
the GIS schemas, but no business logic is executed yet.

Once the backend foundation is merged, this router will additionally:
  - Receive a DB session via dependency injection (e.g. Depends(get_db_session))
  - Receive the current user via an auth dependency (e.g. Depends(get_current_active_user))
  - Construct GISRepository / GISService and delegate to them
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, status

from app.modules.gis.schemas.schemas import (
    GISBoundaryResponse,
    GISBoundaryListResponse,
    ResidentLocationResponse,
    ResidentLocationListResponse,
    ZoneMapResponse,
    GeoDataUploadRequest,
)

router = APIRouter(prefix="/gis", tags=["GIS"])


@router.get("/boundaries", summary="Get barangay/zone/purok boundaries", response_model=GISBoundaryListResponse)
async def get_boundaries():
    """
    TODO: Retrieve boundary geodata used for map rendering.
    Will delegate to GISService.get_boundaries().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="get_boundaries endpoint is not implemented yet.")


@router.get("/resident-locations", summary="Get resident/household location points", response_model=ResidentLocationListResponse)
async def get_resident_locations(skip: int = 0, limit: int = 100):
    """
    TODO: Retrieve geolocation points for residents/households for map plotting.
    Will delegate to GISService.get_resident_locations().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="get_resident_locations endpoint is not implemented yet.")


@router.get("/zones/{zone_id}", summary="Get map data for a specific zone", response_model=ZoneMapResponse)
async def get_zone_map(zone_id: int):
    """
    TODO: Retrieve map/boundary data for a specific zone or purok.
    Will delegate to GISService.get_zone_map().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="get_zone_map endpoint is not implemented yet.")


@router.post("/geodata", summary="Upload/import geographic data")
async def upload_geodata(payload: GeoDataUploadRequest):
    """
    TODO: Accept and store uploaded geographic boundary/location data.
    Will delegate to GISService.upload_geodata().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="upload_geodata endpoint is not implemented yet.")
