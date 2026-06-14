from __future__ import annotations

from pydantic import BaseModel, Field


class CovarianceModel(BaseModel):
    model_id: str
    sigma_x_m: float = Field(..., gt=0)
    sigma_y_m: float = Field(..., gt=0)
    hard_body_radius_m: float = Field(..., gt=0)
    source: str
    notes: list[str] = Field(default_factory=list)


class PcEstimate(BaseModel):
    pc: float = Field(..., ge=0, le=1)
    method: str
    encounter_x_m: float
    encounter_y_m: float
    covariance: CovarianceModel
    assumptions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class RiskClassification(BaseModel):
    severity: str
    status: str
    reasons: list[str] = Field(default_factory=list)
