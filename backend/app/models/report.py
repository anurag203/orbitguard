from __future__ import annotations

from pydantic import BaseModel, Field


class ReportCreateRequest(BaseModel):
    scenario_run_id: str
    conjunction_id: str
    plan_id: str
    candidate_id: str


class ReportCreateResponse(BaseModel):
    report_id: str
    status: str


class ReportSection(BaseModel):
    title: str
    body: str


class BriefingOutput(BaseModel):
    headline: str
    summary: str
    key_points: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class ReportSourceIds(BaseModel):
    scenario_run_id: str
    conjunction_id: str
    plan_id: str
    candidate_id: str


class ReportResponse(BaseModel):
    report_id: str
    title: str
    briefing: BriefingOutput
    source_ids: ReportSourceIds
    sections: list[ReportSection] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
