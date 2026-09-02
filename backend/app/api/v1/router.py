"""
API v1 Router Aggregator

Combines all module-level routers into a single APIRouter that can be
included in the main FastAPI application once the backend foundation
(app instance, middleware, startup configuration, DI) is merged.

Usage (once the foundation is merged):

    from fastapi import FastAPI
    from app.api.v1.router import api_router

    app = FastAPI()
    app.include_router(api_router)
"""

from fastapi import APIRouter

from app.modules.authentication.api.router import router as authentication_router
from app.modules.residents.api.router import router as residents_router
from app.modules.households.api.router import router as households_router
from app.modules.officials.api.router import router as officials_router
from app.modules.reports.api.router import router as reports_router
from app.modules.gis.api.router import router as gis_router
from app.modules.analytics.api.router import router as analytics_router

api_router = APIRouter()

api_router.include_router(authentication_router)
api_router.include_router(residents_router)
api_router.include_router(households_router)
api_router.include_router(officials_router)
api_router.include_router(reports_router)
api_router.include_router(gis_router)
api_router.include_router(analytics_router)
