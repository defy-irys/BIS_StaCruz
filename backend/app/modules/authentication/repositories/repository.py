"""
Authentication Module - Repository

Encapsulates all data-access logic for authentication session and token lifecycle.
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


class AuthRepository:
    """
    Data-access layer for authentication session and token lifecycle.
    Will be injected into AuthService once implemented.
    """

    def __init__(self, db_session: DBSession) -> None:
        self.db_session = db_session

    async def get_user_credentials_by_username(self, username: str) -> Any:
        """
        TODO: Retrieve stored user credentials (e.g. username, hashed password) for authentication.
        """
        raise NotImplementedError("AuthRepository.get_user_credentials_by_username is not implemented yet.")

    async def store_refresh_token(self, user_id: int, token: str) -> Any:
        """
        TODO: Persist an issued refresh token for later validation/revocation.
        """
        raise NotImplementedError("AuthRepository.store_refresh_token is not implemented yet.")

    async def revoke_refresh_token(self, token: str) -> Any:
        """
        TODO: Invalidate a previously issued refresh token.
        """
        raise NotImplementedError("AuthRepository.revoke_refresh_token is not implemented yet.")

    async def get_user_by_id(self, user_id: int) -> Any:
        """
        TODO: Retrieve a user account record by its unique identifier.
        """
        raise NotImplementedError("AuthRepository.get_user_by_id is not implemented yet.")
