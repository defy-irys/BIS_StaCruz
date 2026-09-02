"""
Database dependencies.

Thin DI wiring layer: takes the request-scoped `AsyncSession` (from
`app.database.session.get_db`) and constructs the repositories that need
it. Endpoints depend on repositories/services, never on `get_db` directly,
which keeps route handlers decoupled from session management details.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.repositories.user_repository import UserRepository

# Reusable annotated type for a request-scoped DB session.
DBSession = Annotated[AsyncSession, Depends(get_db)]


def get_user_repository(session: DBSession) -> UserRepository | None:
    """
    Provide a `UserRepository` bound to the current request's DB session.
    
    Returns None if the session is None (test scenarios where DB is not available).
    """
    if session is None:
        return None
    return UserRepository(session)
