"""
Households Module - API Router

Defines placeholder HTTP endpoints for household records and resident-to-household membership.
Endpoints are stubs only: request/response contracts are declared via
the Households schemas, but no business logic is executed yet.

Once the backend foundation is merged, this router will additionally:
  - Receive a DB session via dependency injection (e.g. Depends(get_db_session))
  - Receive the current user via an auth dependency (e.g. Depends(get_current_active_user))
  - Construct HouseholdRepository / HouseholdService and delegate to them
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, status

from app.modules.households.schemas.schemas import (
    HouseholdBase,
    HouseholdCreate,
    HouseholdUpdate,
    HouseholdResponse,
    HouseholdListResponse,
    HouseholdMemberLink,
    HouseholdMemberResponse,
    HouseholdMemberListResponse,
)

router = APIRouter(prefix="/households", tags=["Households"])


@router.get("/", summary="List households", response_model=HouseholdListResponse)
async def list_households(skip: int = 0, limit: int = 100):
    """
    TODO: Return a paginated list of household records.
    Will delegate to HouseholdService.list_households().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="list_households endpoint is not implemented yet.")


@router.get("/{household_id}", summary="Get a household by ID", response_model=HouseholdResponse)
async def get_household(household_id: int):
    """
    TODO: Return a single household record by its unique identifier.
    Will delegate to HouseholdService.get_household().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="get_household endpoint is not implemented yet.")


@router.post("/", summary="Create a household", response_model=HouseholdResponse)
async def create_household(payload: HouseholdCreate):
    """
    TODO: Create a new household record.
    Will delegate to HouseholdService.create_household().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="create_household endpoint is not implemented yet.")


@router.put("/{household_id}", summary="Update a household", response_model=HouseholdResponse)
async def update_household(household_id: int, payload: HouseholdUpdate):
    """
    TODO: Update an existing household record.
    Will delegate to HouseholdService.update_household().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="update_household endpoint is not implemented yet.")


@router.delete("/{household_id}", summary="Delete a household")
async def delete_household(household_id: int):
    """
    TODO: Delete or archive a household record.
    Will delegate to HouseholdService.delete_household().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="delete_household endpoint is not implemented yet.")


@router.get("/{household_id}/members", summary="List members of a household", response_model=HouseholdMemberListResponse)
async def get_household_members(household_id: int):
    """
    TODO: Return the list of residents belonging to a household.
    Will delegate to HouseholdService.get_household_members().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="get_household_members endpoint is not implemented yet.")


@router.post("/{household_id}/members", summary="Add a member to a household", response_model=HouseholdMemberResponse)
async def add_household_member(household_id: int, payload: HouseholdMemberLink):
    """
    TODO: Link an existing resident to this household as a member.
    Will delegate to HouseholdService.add_household_member().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="add_household_member endpoint is not implemented yet.")


@router.delete("/{household_id}/members/{resident_id}", summary="Remove a member from a household")
async def remove_household_member(household_id: int, resident_id: int):
    """
    TODO: Remove a resident's membership from this household.
    Will delegate to HouseholdService.remove_household_member().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="remove_household_member endpoint is not implemented yet.")
