"""
GIS Module - Repository

Encapsulates all data-access logic for geographic boundary, zoning, and resident/household location data.
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


class GISRepository:
    """
    Data-access layer for geographic boundary, zoning, and resident/household location data.
    Will be injected into GISService once implemented.
    """

    def __init__(self, db_session: DBSession) -> None:
        self.db_session = db_session

    async def get_boundaries(self) -> Any:
        """
        TODO: Retrieve stored boundary geodata records.
        """
        raise NotImplementedError("GISRepository.get_boundaries is not implemented yet.")

    async def get_resident_locations(self, skip: int = 0, limit: int = 100) -> Any:
        """
        TODO: Retrieve stored resident/household geolocation records.
        """
        raise NotImplementedError("GISRepository.get_resident_locations is not implemented yet.")

    async def get_zone_by_id(self, zone_id: int) -> Any:
        """
        TODO: Retrieve boundary/map data for a specific zone/purok record.
        """
        raise NotImplementedError("GISRepository.get_zone_by_id is not implemented yet.")

    async def save_geodata(self, geodata: Any) -> Any:
        """
        TODO: Persist uploaded/imported geographic boundary or location data.
        """
        raise NotImplementedError("GISRepository.save_geodata is not implemented yet.")
