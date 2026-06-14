from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.catalog import CatalogObject


class ScenarioSummary(BaseModel):
    scenario_id: str
    title: str
    mode: str
    status: str
    description: str
    hero: bool = False


class ScenarioListResponse(BaseModel):
    scenarios: list[ScenarioSummary]


class ScenarioRunRequest(BaseModel):
    deterministic: bool = True


class ScenarioEvent(BaseModel):
    timestamp_offset_s: int
    title: str
    description: str
    focus: str | None = None
    camera_hint: str | None = None


class ScenarioExpectedOutcome(BaseModel):
    primary_object_id: str
    secondary_object_id: str
    plan_id: str
    recommended_candidate_id: str
    secondary_status: str


class ScenarioManifest(BaseModel):
    scenario_id: str
    title: str
    mode: str
    status: str
    hero: bool = False
    description: str
    catalog_id: str
    protected_object_id: str
    run_id: str
    top_conjunction_id: str
    labels: list[str] = Field(default_factory=list)
    summary: str
    events: list[ScenarioEvent] = Field(default_factory=list)
    expected_outcome: ScenarioExpectedOutcome
    demo_beats: list[str] = Field(default_factory=list)


class ScenarioRunResponse(BaseModel):
    scenario_id: str
    run_id: str
    mode: str
    status: str
    catalog_id: str
    protected_object: CatalogObject
    top_conjunction_id: str
    events: list[ScenarioEvent] = Field(default_factory=list)
    labels: list[str] = Field(default_factory=list)
    expected_outcome: ScenarioExpectedOutcome
    demo_beats: list[str] = Field(default_factory=list)
    summary: str
