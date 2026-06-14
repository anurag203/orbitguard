from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.models.common import RiskMetrics
from app.models.risk import PcEstimate


class ScreeningRequest(BaseModel):
    scenario_id: str | None = None
    protected_object_id: str | None = None
    catalog_id: str | None = None
    start_time_utc: str | None = None
    end_time_utc: str | None = None
    step_seconds: int = Field(default=60, ge=1, le=3600)
    coarse_threshold_m: float = Field(default=50_000.0, gt=0)
    max_results: int = Field(default=10, ge=1, le=100)


class ConjunctionSummary(BaseModel):
    conjunction_id: str
    primary_object_id: str
    secondary_object_id: str
    tca_utc: str
    risk: RiskMetrics
    status: str


class ScreeningResponse(BaseModel):
    mode: str
    computation_mode: Literal["sgp4", "fixture-fallback"] = "sgp4"
    conjunctions: list[ConjunctionSummary]
    warnings: list[str] = Field(default_factory=list)


class EncounterPlanePoint(BaseModel):
    x_m: float
    y_m: float
    label: str


class ConjunctionDetail(ConjunctionSummary):
    relative_position_m: list[float] = Field(..., min_length=3, max_length=3)
    relative_velocity_vector_km_s: list[float] = Field(..., min_length=3, max_length=3)
    encounter_plane: list[EncounterPlanePoint]
    pc_estimate: PcEstimate
    assumptions: list[str] = Field(default_factory=list)
