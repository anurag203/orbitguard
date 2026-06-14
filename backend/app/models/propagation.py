from __future__ import annotations

from pydantic import BaseModel, Field


class PropagationRequest(BaseModel):
    object_ids: list[str] = Field(default_factory=list, max_length=200)
    start_time_utc: str | None = None
    end_time_utc: str | None = None
    step_seconds: int = Field(default=60, ge=1, le=3600)


class StateVector(BaseModel):
    timestamp_utc: str
    position_km: list[float] = Field(..., min_length=3, max_length=3)
    velocity_km_s: list[float] = Field(..., min_length=3, max_length=3)


class PropagationWarning(BaseModel):
    object_id: str
    code: str
    message: str
    timestamp_utc: str | None = None


class PropagationSeries(BaseModel):
    object_id: str
    name: str
    sample_count: int
    status: str
    states: list[StateVector] = Field(default_factory=list)
    warnings: list[PropagationWarning] = Field(default_factory=list)


class PropagationResponse(BaseModel):
    mode: str
    start_time_utc: str
    end_time_utc: str
    step_seconds: int
    series: list[PropagationSeries]
    warnings: list[str] = Field(default_factory=list)
