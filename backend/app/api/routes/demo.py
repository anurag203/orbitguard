from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_demo_service
from app.models.demo import DemoReplayResponse, DemoStatusResponse, ExpectedDemoFlow
from app.services.demo_service import DemoService

router = APIRouter()


@router.get("/demo/status", response_model=DemoStatusResponse)
def demo_status(service: DemoService = Depends(get_demo_service)) -> DemoStatusResponse:
    return service.status()


@router.get("/demo/expected-flow", response_model=ExpectedDemoFlow)
def expected_demo_flow(service: DemoService = Depends(get_demo_service)) -> ExpectedDemoFlow:
    return service.expected_flow()


@router.post("/demo/replay/{flow_id}", response_model=DemoReplayResponse)
def replay_demo_flow(
    flow_id: str,
    service: DemoService = Depends(get_demo_service),
) -> DemoReplayResponse:
    return service.replay(flow_id)
