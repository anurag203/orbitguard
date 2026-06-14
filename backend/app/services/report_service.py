from __future__ import annotations

import logging

from app.core.errors import OrbitGuardError
from app.core.ids import ScenarioIds
from app.models.maneuver import ManeuverCandidate, ManeuverPlanRequest, ManeuverPlanResponse
from app.models.report import (
    BriefingOutput,
    ReportCreateRequest,
    ReportCreateResponse,
    ReportResponse,
    ReportSection,
    ReportSourceIds,
)
from app.models.secondary import SecondaryRiskResult
from app.services.conjunction_service import ConjunctionService
from app.services.maneuver_service import ManeuverService
from app.services.scenario_service import ScenarioService
from app.services.secondary_risk_service import SecondaryRiskService

logger = logging.getLogger("orbitguard.report")


class ReportService:
    def __init__(
        self,
        conjunction_service: ConjunctionService | None = None,
        maneuver_service: ManeuverService | None = None,
        secondary_risk_service: SecondaryRiskService | None = None,
        scenario_service: ScenarioService | None = None,
    ) -> None:
        self._reports: dict[str, ReportResponse] = {}
        self._conjunction_service = conjunction_service or ConjunctionService()
        self._maneuver_service = maneuver_service or ManeuverService()
        self._secondary_risk_service = secondary_risk_service or SecondaryRiskService()
        self._scenario_service = scenario_service or ScenarioService()

    def create_report(self, request: ReportCreateRequest) -> ReportCreateResponse:
        conjunction = self._conjunction_service.get_detail(request.conjunction_id)
        plan = self._maneuver_service.plan(ManeuverPlanRequest(conjunction_id=request.conjunction_id))
        if request.plan_id != plan.plan_id:
            raise OrbitGuardError(404, "plan_not_found", f"Maneuver plan '{request.plan_id}' was not found.")
        if plan.recommendation is None:
            raise OrbitGuardError(
                409,
                "report_plan_has_no_recommendation",
                "Cannot create a maneuver report because the plan has no safe recommendation.",
            )
        if request.candidate_id != plan.recommendation.candidate_id:
            raise OrbitGuardError(
                422,
                "report_candidate_mismatch",
                "Report candidate must match the selected maneuver recommendation.",
            )

        secondary = self._secondary_risk_service.screen(plan, plan.recommendation)

        manifest = self._scenario_service.find_by_top_conjunction(request.conjunction_id)
        scenario_title = manifest.title if manifest else conjunction.primary_object_id
        report_id = ScenarioIds.from_conjunction_id(request.conjunction_id).report_id
        self._reports[report_id] = self._build_report(
            report_id=report_id,
            request=request,
            plan=plan,
            candidate=plan.recommendation,
            secondary=secondary,
            tca_utc=conjunction.tca_utc,
            scenario_title=scenario_title,
        )
        logger.info(
            "report.created report=%s conjunction=%s",
            report_id,
            request.conjunction_id,
        )
        return ReportCreateResponse(report_id=report_id, status="created")

    def get_report(self, report_id: str) -> ReportResponse:
        report = self._reports.get(report_id)
        if report is None:
            report = self._lazy_create_report(report_id)
        if report is None:
            raise OrbitGuardError(404, "report_not_found", f"Report '{report_id}' was not found.")
        return report

    def _lazy_create_report(self, report_id: str) -> ReportResponse | None:
        # Best-effort reconstruction: if a report has not been created yet but its id
        # maps to a known scenario whose expected outcome is a real maneuver, rebuild it
        # deterministically from the scenario manifest. Scenarios without an applicable
        # recommendation (e.g. education mode) simply return None -> 404.
        ids = ScenarioIds.from_report_id(report_id)
        manifest = self._scenario_service.find_by_top_conjunction(ids.conjunction_id)
        if manifest is None:
            return None
        if ScenarioIds.from_conjunction_id(manifest.top_conjunction_id).report_id != report_id:
            return None
        try:
            self.create_report(
                ReportCreateRequest(
                    scenario_run_id=manifest.run_id,
                    conjunction_id=manifest.top_conjunction_id,
                    plan_id=manifest.expected_outcome.plan_id,
                    candidate_id=manifest.expected_outcome.recommended_candidate_id,
                )
            )
        except OrbitGuardError:
            return None
        return self._reports.get(report_id)

    def _build_report(
        self,
        report_id: str,
        request: ReportCreateRequest,
        plan: ManeuverPlanResponse,
        candidate: ManeuverCandidate,
        secondary: SecondaryRiskResult,
        tca_utc: str,
        scenario_title: str,
    ) -> ReportResponse:
        before = plan.before
        after = candidate.predicted_risk
        risk_reduction = (
            f"Estimated Pc changes from {self._format_pc(before.pc)} to {self._format_pc(after.pc)}, "
            f"while miss distance changes from {before.miss_distance_m:.1f} m to {after.miss_distance_m / 1000:.2f} km."
        )
        decision = (
            f"Recommend candidate {candidate.candidate_id}: {candidate.delta_v_m_s:.2f} m/s "
            f"{self._format_direction(candidate.direction)} burn {candidate.burn_t_minus_tca_s / 3600:.1f} hours before TCA."
        )
        secondary_line = (
            f"Secondary screening status is {secondary.status}: {secondary.summary} "
            f"Screened objects: {secondary.screened_object_count}."
        )

        return ReportResponse(
            report_id=report_id,
            title=f"{scenario_title} Maneuver Brief",
            briefing=BriefingOutput(
                headline=f"OrbitGuard recommends a low-delta-v avoidance maneuver for {scenario_title}.",
                summary=f"{decision} {risk_reduction} {secondary_line}",
                key_points=[
                    decision,
                    risk_reduction,
                    secondary_line,
                ],
                limitations=[
                    "Pc uses an assumed covariance model because public TLEs do not include covariance.",
                    "Maneuver effects use the documented Round 1 along-track lead-time surrogate.",
                "This is a simulation recommendation, not spacecraft command authority.",
                ],
            ),
            source_ids=ReportSourceIds(
                scenario_run_id=request.scenario_run_id,
                conjunction_id=request.conjunction_id,
                plan_id=request.plan_id,
                candidate_id=request.candidate_id,
            ),
            sections=[
                ReportSection(title="Decision", body=decision),
                ReportSection(title="Risk Reduction", body=risk_reduction),
                ReportSection(title="Secondary Screening", body=secondary_line),
                ReportSection(
                    title="Audit Trail",
                    body=(
                        f"Scenario run {request.scenario_run_id}; conjunction {request.conjunction_id}; "
                        f"TCA {tca_utc}; plan {request.plan_id}; selected candidate {request.candidate_id}."
                    ),
                ),
            ],
            assumptions=[
                *plan.assumptions,
                *candidate.assumptions,
                *secondary.assumptions,
                "Estimated Pc is not operational-grade without real covariance.",
                "The maneuver is a simulation recommendation, not spacecraft command authority.",
            ],
            warnings=[*plan.warnings, *secondary.warnings],
        )

    def _format_pc(self, value: float) -> str:
        if value == 0:
            return "0.000e+00"
        return f"{value:.3e}"

    def _format_direction(self, value: str) -> str:
        return value.replace("-", " ")
