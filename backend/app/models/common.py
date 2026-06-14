from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str


class MetricValue(BaseModel):
    value: float
    unit: str


class RiskMetrics(BaseModel):
    pc: float
    miss_distance_m: float
    relative_velocity_km_s: float
    severity: str
