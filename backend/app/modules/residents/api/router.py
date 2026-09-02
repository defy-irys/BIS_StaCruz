"""
Residents Module - API Router

Defines placeholder HTTP endpoints for barangay resident profile records.
Endpoints are stubs only: request/response contracts are declared via
the Residents schemas, but no business logic is executed yet.

Once the backend foundation is merged, this router will additionally:
  - Receive a DB session via dependency injection (e.g. Depends(get_db_session))
  - Receive the current user via an auth dependency (e.g. Depends(get_current_active_user))
  - Construct ResidentRepository / ResidentService and delegate to them
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, status

from app.modules.residents.schemas.schemas import (
    ResidentBase,
    ResidentCreate,
    ResidentUpdate,
    ResidentResponse,
    ResidentListResponse,
)

router = APIRouter(prefix="/residents", tags=["Residents"])


@router.get("/", summary="List residents", response_model=ResidentListResponse)
async def list_residents(skip: int = 0, limit: int = 100):
    """
    TODO: Return a paginated list of resident records.
    Will delegate to ResidentService.list_residents().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="list_residents endpoint is not implemented yet.")


@router.get("/{resident_id}", summary="Get a resident by ID", response_model=ResidentResponse)
async def get_resident(resident_id: int):
    """
    TODO: Return a single resident record by its unique identifier.
    Will delegate to ResidentService.get_resident().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="get_resident endpoint is not implemented yet.")


@router.post("/", summary="Create a resident", response_model=ResidentResponse)
async def create_resident(payload: ResidentCreate):
    """
    TODO: Create a new resident record.
    Will delegate to ResidentService.create_resident().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="create_resident endpoint is not implemented yet.")


@router.put("/{resident_id}", summary="Update a resident", response_model=ResidentResponse)
async def update_resident(resident_id: int, payload: ResidentUpdate):
    """
    TODO: Update an existing resident record.
    Will delegate to ResidentService.update_resident().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="update_resident endpoint is not implemented yet.")


@router.delete("/{resident_id}", summary="Delete a resident")
async def delete_resident(resident_id: int):
    """
    TODO: Delete or archive a resident record.
    Will delegate to ResidentService.delete_resident().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="delete_resident endpoint is not implemented yet.")


@router.get("/search/", summary="Search residents", response_model=ResidentListResponse)
async def search_residents(q: Optional[str] = None, skip: int = 0, limit: int = 100):
    """
    TODO: Search/filter residents (e.g. by name, purok/zone, age range, household).
    Will delegate to ResidentService.search_residents().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="search_residents endpoint is not implemented yet.")
