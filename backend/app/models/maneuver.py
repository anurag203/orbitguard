from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.common import RiskMetrics
from app.models.secondary import SecondaryRiskResult


class ManeuverPlanRequest(BaseModel):
    conjunction_id: str = Field(..., min_length=1)
    max_delta_v_m_s: float = Field(default=0.5, gt=0)
    safety_pc_threshold: float = Field(default=1e-6, gt=0, le=1)
    min_miss_distance_m: float = Field(default=8_000.0, gt=0)


class ManeuverConstraints(BaseModel):
    max_delta_v_m_s: float
    safety_pc_threshold: float
    min_miss_distance_m: float
    allowed_directions: list[str]


class ManeuverCandidate(BaseModel):
    candidate_id: str
    burn_t_minus_tca_s: int
    direction: str
    delta_v_m_s: float
    score: float
    status: str
    reason: str
    predicted_risk: RiskMetrics
    miss_distance_gain_m: float
    pc_reduction_factor: float
    rejection_reasons: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)


class ManeuverPlanResponse(BaseModel):
    plan_id: str
    conjunction_id: str
    status: str
    recommendation: ManeuverCandidate | None
    alternatives: list[ManeuverCandidate]
    before: RiskMetrics
    predicted_after: RiskMetrics
    requires_secondary_screening: bool
    explanation: str
    candidate_count: int
    constraints: ManeuverConstraints
    assumptions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class ManeuverApplyRequest(BaseModel):
    plan_id: str = Field(..., min_length=1)
    candidate_id: str = Field(..., min_length=1)


class ManeuverApplyResponse(BaseModel):
    plan_id: str
    candidate_id: str
    before: RiskMetrics
    after: RiskMetrics
    secondary_status: str
    secondary_summary: str
    screened_object_count: int
    secondary: SecondaryRiskResult
