"""
Households Module - Service

Contains the business logic layer for household records and resident-to-household membership.
The service orchestrates calls to HouseholdRepository and will later
enforce business rules, validation, and cross-module coordination.

NOTE: No business/CRUD logic is implemented yet.
"""

from typing import Any, List, Optional
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
from app.modules.households.repositories.repository import HouseholdRepository


class HouseholdService:
    """
    Business logic layer for household records and resident-to-household membership.
    """

    def __init__(self, repository: HouseholdRepository) -> None:
        self.repository = repository

    async def list_households(self, skip: int = 0, limit: int = 100) -> Any:
        """
        TODO: Retrieve a paginated list of households, applying any business-level rules.
        """
        raise NotImplementedError("HouseholdService.list_households is not implemented yet.")

    async def get_household(self, household_id: int) -> Any:
        """
        TODO: Retrieve a single household, including any necessary business validation.
        """
        raise NotImplementedError("HouseholdService.get_household is not implemented yet.")

    async def create_household(self, household_data: HouseholdCreate) -> Any:
        """
        TODO: Coordinate household creation, including validation.
        """
        raise NotImplementedError("HouseholdService.create_household is not implemented yet.")

    async def update_household(self, household_id: int, household_data: HouseholdUpdate) -> Any:
        """
        TODO: Coordinate household update workflow.
        """
        raise NotImplementedError("HouseholdService.update_household is not implemented yet.")

    async def delete_household(self, household_id: int) -> Any:
        """
        TODO: Coordinate household deletion/archival workflow.
        """
        raise NotImplementedError("HouseholdService.delete_household is not implemented yet.")

    async def get_household_members(self, household_id: int) -> Any:
        """
        TODO: Retrieve the residents linked to a household, coordinating with the Residents module if needed.
        """
        raise NotImplementedError("HouseholdService.get_household_members is not implemented yet.")

    async def add_household_member(self, household_id: int, member_data: HouseholdMemberLink) -> Any:
        """
        TODO: Coordinate linking an existing resident to a household as a member.
        """
        raise NotImplementedError("HouseholdService.add_household_member is not implemented yet.")

    async def remove_household_member(self, household_id: int, resident_id: int) -> Any:
        """
        TODO: Coordinate removal of a resident's membership from a household.
        """
        raise NotImplementedError("HouseholdService.remove_household_member is not implemented yet.")
