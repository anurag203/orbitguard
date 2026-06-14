from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_report_service
from app.models.report import ReportCreateRequest, ReportCreateResponse, ReportResponse
from app.services.report_service import ReportService

router = APIRouter()


@router.post("/reports", response_model=ReportCreateResponse)
def create_report(
    request: ReportCreateRequest,
    service: ReportService = Depends(get_report_service),
) -> ReportCreateResponse:
    return service.create_report(request)


@router.get("/reports/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: str,
    service: ReportService = Depends(get_report_service),
) -> ReportResponse:
    return service.get_report(report_id)
