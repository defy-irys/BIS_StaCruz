"""
Database startup initialization.

IMPORTANT: This module intentionally does NOT create tables via
`Base.metadata.create_all()`. Schema changes are managed exclusively
through Alembic migrations (see `/alembic`) so that schema history is
versioned, reviewable, and reproducible across dev/staging/production.

What this module *does* do is verify, at application startup, that the
configured database is actually reachable - so the app fails fast with a
clear error instead of surfacing confusing connection errors on the first
incoming request.
"""

from sqlalchemy import text

from app.core.logging import get_logger
from app.database.session import engine

logger = get_logger(__name__)


async def check_database_connection() -> None:
    """
    Run a trivial `SELECT 1` to confirm the database is reachable.

    Raises whatever exception the driver raises on connection failure;
    the lifespan in `main.py` lets this propagate so startup aborts
    loudly rather than starting a server that can't serve requests.
    """
    logger.info("Verifying database connectivity...")
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    logger.info("Database connection verified successfully.")
