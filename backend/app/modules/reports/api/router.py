"""
Reports Module - API Router

Defines placeholder HTTP endpoints for generated statistical/administrative reports.
Endpoints are stubs only: request/response contracts are declared via
the Reports schemas, but no business logic is executed yet.

Once the backend foundation is merged, this router will additionally:
  - Receive a DB session via dependency injection (e.g. Depends(get_db_session))
  - Receive the current user via an auth dependency (e.g. Depends(get_current_active_user))
  - Construct ReportRepository / ReportService and delegate to them
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, status

from app.modules.reports.schemas.schemas import (
    ReportTypeResponse,
    ReportGenerateRequest,
    ReportResponse,
    ReportListResponse,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/types", summary="List available report types", response_model=List[ReportTypeResponse])
async def list_report_types():
    """
    TODO: Return the catalog of report types supported by the system.
    Will delegate to ReportService.list_report_types().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="list_report_types endpoint is not implemented yet.")


@router.post("/generate", summary="Generate a report", response_model=ReportResponse)
async def generate_report(payload: ReportGenerateRequest):
    """
    TODO: Generate a new report based on requested type, filters, and date range.
    Will delegate to ReportService.generate_report().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="generate_report endpoint is not implemented yet.")


@router.get("/{report_id}", summary="Get a generated report by ID", response_model=ReportResponse)
async def get_report(report_id: int):
    """
    TODO: Retrieve a previously generated report's metadata by its unique identifier.
    Will delegate to ReportService.get_report().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="get_report endpoint is not implemented yet.")


@router.get("/", summary="List generated reports", response_model=ReportListResponse)
async def list_generated_reports(skip: int = 0, limit: int = 100):
    """
    TODO: Return a paginated list of previously generated reports.
    Will delegate to ReportService.list_generated_reports().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="list_generated_reports endpoint is not implemented yet.")


@router.get("/{report_id}/export", summary="Export a generated report")
async def export_report(report_id: int, export_format: Optional[str] = "pdf"):
    """
    TODO: Export a generated report in the requested format (e.g. PDF, CSV, XLSX).
    Will delegate to ReportService.export_report().
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="export_report endpoint is not implemented yet.")
