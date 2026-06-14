from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_scenario_service
from app.models.scenario import ScenarioEvent, ScenarioListResponse, ScenarioRunRequest, ScenarioRunResponse
from app.services.scenario_service import ScenarioService

router = APIRouter()


@router.get("/scenarios", response_model=ScenarioListResponse)
def list_scenarios(service: ScenarioService = Depends(get_scenario_service)) -> ScenarioListResponse:
    return service.list_scenarios()


@router.post("/scenarios/{scenario_id}/run", response_model=ScenarioRunResponse)
def run_scenario(
    scenario_id: str,
    request: ScenarioRunRequest | None = None,
    service: ScenarioService = Depends(get_scenario_service),
) -> ScenarioRunResponse:
    return service.run_scenario(scenario_id, request or ScenarioRunRequest())


@router.post("/scenarios/{scenario_id}/reset", response_model=ScenarioRunResponse)
def reset_scenario(
    scenario_id: str,
    service: ScenarioService = Depends(get_scenario_service),
) -> ScenarioRunResponse:
    return service.reset_scenario(scenario_id)


@router.get("/scenarios/{scenario_id}/timeline", response_model=list[ScenarioEvent])
def get_scenario_timeline(
    scenario_id: str,
    service: ScenarioService = Depends(get_scenario_service),
) -> list[ScenarioEvent]:
    return service.get_scenario_event_timeline(scenario_id)
