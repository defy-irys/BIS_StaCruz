"""
Application entry point.

Builds and configures the FastAPI application instance via `create_app()`.
Running this module directly (`python -m app.main`) or pointing uvicorn at
`app.main:app` both work.

Responsibilities wired up here, in order:
  1. Logging configuration
  2. Lifespan (startup/shutdown) - verifies DB connectivity, disposes the
     engine's connection pool on shutdown
  3. CORS middleware
  4. Custom middleware (request logging)
  5. Exception handlers
  6. Versioned API routers
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.database.init_db import check_database_connection
from app.database.session import dispose_engine
from app.middleware.logging_middleware import RequestLoggingMiddleware

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan context manager.

    Code before `yield` runs on startup; code after `yield` runs on
    shutdown. FastAPI/Starlette guarantees the shutdown section runs even
    if the application is stopped via signal, as long as the process is
    given a chance to shut down gracefully.
    """
    configure_logging()
    logger.info("Starting %s (env=%s)...", settings.APP_NAME, settings.APP_ENV)

    try:
        await check_database_connection()
    except Exception:
        if settings.is_production:
            raise
        logger.warning("Database connectivity check skipped because the database is unavailable during startup.")

    yield  # ---- application runs while suspended here ----

    logger.info("Shutting down %s...", settings.APP_NAME)
    await dispose_engine()


def create_app() -> FastAPI:
    """
    Application factory.

    Using a factory function (rather than a bare module-level `app = FastAPI()`)
    makes the app easy to construct multiple times with different settings,
    e.g. in tests.
    """
    app = FastAPI(
        title=settings.APP_NAME,
        description=(
            "Backend foundation for the Barangay Information Management "
            "System - Barangay Inhabitant Profiling System (BIMS-BIPS)."
        ),
        version="0.1.0",
        lifespan=lifespan,
        # Hide interactive docs in production to reduce the API's public surface area.
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
    )

    # --- CORS -------------------------------------------------------------
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Custom middleware --------------------------------------------------
    # Middleware added later runs *earlier* on the request path, so keep
    # this near the end of the middleware-registration block.
    app.add_middleware(RequestLoggingMiddleware)

    # --- Exception handlers -------------------------------------------------
    register_exception_handlers(app)

    # --- Routers -----------------------------------------------------------
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @app.get("/health", tags=["Health"], summary="Liveness/readiness probe")
    async def health_check() -> dict[str, str]:
        """Simple health check endpoint for load balancers/orchestrators."""
        return {"status": "ok"}

    return app


app = create_app()
