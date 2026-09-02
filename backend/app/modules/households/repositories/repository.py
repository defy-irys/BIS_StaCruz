"""
Households Module - Repository

Encapsulates all data-access logic for household records and resident-to-household membership.
This layer will communicate with the database once the persistence
layer (models, session handling) is finalized in the backend foundation.

IMPORTANT:
- No SQL/ORM queries are implemented here yet.
- No database models are imported or defined here yet.
- `DBSession` below is a temporary placeholder type and should be
  replaced with the actual session type (e.g. SQLAlchemy AsyncSession)
  exposed by the shared database module once it is available.
"""

from typing import Any, List, Optional

DBSession = Any  # Placeholder alias until the shared DB session type is available


class HouseholdRepository:
    """
    Data-access layer for household records and resident-to-household membership.
    Will be injected into HouseholdService once implemented.
    """

    def __init__(self, db_session: DBSession) -> None:
        self.db_session = db_session

    async def get_all(self, skip: int = 0, limit: int = 100) -> Any:
        """
        TODO: Retrieve a paginated list of household records.
        """
        raise NotImplementedError("HouseholdRepository.get_all is not implemented yet.")

    async def get_by_id(self, household_id: int) -> Any:
        """
        TODO: Retrieve a single household record by its unique identifier.
        """
        raise NotImplementedError("HouseholdRepository.get_by_id is not implemented yet.")

    async def create(self, household_data: Any) -> Any:
        """
        TODO: Persist a new household record.
        """
        raise NotImplementedError("HouseholdRepository.create is not implemented yet.")

    async def update(self, household_id: int, household_data: Any) -> Any:
        """
        TODO: Update an existing household record.
        """
        raise NotImplementedError("HouseholdRepository.update is not implemented yet.")

    async def delete(self, household_id: int) -> Any:
        """
        TODO: Delete or archive a household record.
        """
        raise NotImplementedError("HouseholdRepository.delete is not implemented yet.")

    async def get_members(self, household_id: int) -> Any:
        """
        TODO: Retrieve the members linked to a household.
        """
        raise NotImplementedError("HouseholdRepository.get_members is not implemented yet.")

    async def add_member(self, household_id: int, member_data: Any) -> Any:
        """
        TODO: Persist a resident-to-household membership link.
        """
        raise NotImplementedError("HouseholdRepository.add_member is not implemented yet.")

    async def remove_member(self, household_id: int, resident_id: int) -> Any:
        """
        TODO: Remove a resident-to-household membership link.
        """
        raise NotImplementedError("HouseholdRepository.remove_member is not implemented yet.")
