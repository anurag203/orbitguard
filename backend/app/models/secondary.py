from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.common import RiskMetrics


class SecondaryScreeningRequest(BaseModel):
    plan_id: str = Field(..., min_length=1)
    candidate_id: str = Field(..., min_length=1)


class SecondaryConcern(BaseModel):
    object_id: str
    object_name: str
    risk: RiskMetrics
    status: str
    introduced_new_risk: bool
    reason: str


class SecondaryRiskResult(BaseModel):
    status: str
    summary: str
    screened_object_count: int = Field(..., ge=0)
    concerns: list[SecondaryConcern] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class SecondaryFixture(BaseModel):
    scenario_id: str
    catalog_id: str
    screening_mode: str
    screened_object_count: int = Field(..., ge=0)
    results: dict[str, SecondaryRiskResult]
