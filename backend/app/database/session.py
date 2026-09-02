"""
Async database engine and session management.

Defines the single `AsyncEngine` for the application and an
`async_sessionmaker` used to create `AsyncSession` instances. The
`get_db` generator is the FastAPI dependency that endpoints/services use
to obtain a request-scoped session; it guarantees the session is always
closed (and rolled back on error) at the end of the request.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Single engine instance shared across the application's lifetime.
# `pool_pre_ping` guards against stale connections (e.g. after DB restarts
# or long idle periods) by testing them before handing them out.
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
)

# Session factory. `expire_on_commit=False` keeps ORM objects usable (e.g.
# for serialization into Pydantic schemas) after the session commits,
# without triggering a fresh DB round-trip to re-fetch attributes.
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields a request-scoped `AsyncSession`.

    Usage:
        @router.get("/things")
        async def list_things(db: AsyncSession = Depends(get_db)):
            ...

    On success the session is simply closed. On exception, the transaction
    is rolled back before the exception propagates, so a failed request
    never leaves a partially-committed transaction behind.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def dispose_engine() -> None:
    """Cleanly dispose of the engine's connection pool on application shutdown."""
    logger.info("Disposing database engine connection pool...")
    await engine.dispose()
