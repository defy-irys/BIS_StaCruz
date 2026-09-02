"""
Officials Module - API Router

Defines placeholder HTTP endpoints for barangay official records, positions, and terms.
Endpoints are stubs only: request/response contracts are declared via
the Officials schemas, but no business logic is executed yet.

Once the backend foundation is merged, this router will additionally:
  - Receive a DB session via dependency injection (e.g. Depends(get_db_session))
  - Receive the current user via an auth dependency (e.g. Depends(get_current_active_user))
  - Construct OfficialRepository / OfficialService and delegate to them
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, status

from app.modules.officials.schemas.schemas import (
    OfficialBase,
    OfficialCreate,
    OfficialUpdate,
    OfficialResponse,
    OfficialListResponse,
)

router = APIRouter(prefix="/officials", tags=["Officials"])


@router.get("/", summary="List officials", response_model=OfficialListResponse)
async def list_officials(skip: int = 0, limit: int = 100):
    """
    TODO: Return a paginated list of barangay official records.
    Will delegate to OfficialService.list_officials().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="list_officials endpoint is not implemented yet.")


@router.get("/{official_id}", summary="Get an official by ID", response_model=OfficialResponse)
async def get_official(official_id: int):
    """
    TODO: Return a single official record by its unique identifier.
    Will delegate to OfficialService.get_official().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="get_official endpoint is not implemented yet.")


@router.post("/", summary="Create an official record", response_model=OfficialResponse)
async def create_official(payload: OfficialCreate):
    """
    TODO: Create a new barangay official record.
    Will delegate to OfficialService.create_official().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="create_official endpoint is not implemented yet.")


@router.put("/{official_id}", summary="Update an official record", response_model=OfficialResponse)
async def update_official(official_id: int, payload: OfficialUpdate):
    """
    TODO: Update an existing official record.
    Will delegate to OfficialService.update_official().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="update_official endpoint is not implemented yet.")


@router.delete("/{official_id}", summary="Delete an official record")
async def delete_official(official_id: int):
    """
    TODO: Delete or archive an official record.
    Will delegate to OfficialService.delete_official().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="delete_official endpoint is not implemented yet.")


@router.get("/position/{position}", summary="Get officials by position", response_model=OfficialListResponse)
async def get_officials_by_position(position: str):
    """
    TODO: Retrieve officials currently holding a specific position/role (e.g. Punong Barangay, Kagawad).
    Will delegate to OfficialService.get_officials_by_position().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="get_officials_by_position endpoint is not implemented yet.")


@router.get("/term/{term_year}", summary="Get officials by term year", response_model=OfficialListResponse)
async def get_officials_by_term(term_year: int):
    """
    TODO: Retrieve officials who served/are serving during a specific term year.
    Will delegate to OfficialService.get_officials_by_term().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="get_officials_by_term endpoint is not implemented yet.")
