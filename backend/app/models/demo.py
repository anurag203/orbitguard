from __future__ import annotations

from pydantic import BaseModel, Field


class DemoReadinessCheck(BaseModel):
    name: str
    status: str
    required: bool
    category: str
    detail: str


class ExpectedDemoFlow(BaseModel):
    flow_id: str
    scenario_id: str
    expected_run_id: str
    expected_top_conjunction_id: str
    expected_plan_id: str
    expected_candidate_id: str
    steps: list[str] = Field(default_factory=list)


class DemoStatusResponse(BaseModel):
    status: str
    offline_mode: bool
    default_flow_id: str
    summary: str
    checks: list[DemoReadinessCheck] = Field(default_factory=list)
    missing_required_count: int = 0


class DemoReplayCheck(BaseModel):
    name: str
    status: str
    expected: str
    actual: str
    detail: str


class DemoReplayResponse(BaseModel):
    flow_id: str
    status: str
    summary: str
    checks: list[DemoReplayCheck] = Field(default_factory=list)
