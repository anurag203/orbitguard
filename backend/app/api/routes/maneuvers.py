from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_maneuver_service
from app.models.maneuver import ManeuverApplyRequest, ManeuverApplyResponse, ManeuverPlanRequest, ManeuverPlanResponse
from app.services.maneuver_service import ManeuverService

router = APIRouter()


@router.post("/maneuvers/plan", response_model=ManeuverPlanResponse)
def plan_maneuver(
    request: ManeuverPlanRequest,
    service: ManeuverService = Depends(get_maneuver_service),
) -> ManeuverPlanResponse:
    return service.plan(request)


@router.post("/maneuvers/apply", response_model=ManeuverApplyResponse)
def apply_maneuver(
    request: ManeuverApplyRequest,
    service: ManeuverService = Depends(get_maneuver_service),
) -> ManeuverApplyResponse:
    return service.apply(request)
