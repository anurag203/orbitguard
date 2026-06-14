from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from app.core.config import settings
from app.dependencies import get_demo_service
from app.models.common import HealthResponse
from app.models.demo import DemoStatusResponse
from app.services.demo_service import DemoService

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    # Liveness: the process is up and can answer requests.
    return HealthResponse(
        status="ok",
        service="orbitguard-backend",
        version=settings.version,
        environment=settings.environment,
    )


@router.get("/ready", response_model=DemoStatusResponse)
def ready(response: Response, demo: DemoService = Depends(get_demo_service)) -> DemoStatusResponse:
    # Readiness: are the offline demo fixtures present? Reuses existing DemoService checks.
    status = demo.status()
    if status.status != "ready":
        response.status_code = 503
    return status
