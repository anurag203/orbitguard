from __future__ import annotations

import pytest

from app.core.errors import OrbitGuardError
from app.models.maneuver import ManeuverPlanRequest
from app.models.report import ReportCreateRequest
from app.services.maneuver_service import ManeuverService
from app.services.report_service import ReportService


def _report_request(candidate_id: str = "mnv-protect-isro-a") -> ReportCreateRequest:
    return ReportCreateRequest(
        scenario_run_id="scenario-run-protect-isro-001",
        conjunction_id="conj-protect-isro-001",
        plan_id="maneuver-plan-protect-isro-001",
        candidate_id=candidate_id,
    )


def test_report_is_grounded_in_current_maneuver_outputs() -> None:
    plan = ManeuverService().plan(ManeuverPlanRequest(conjunction_id="conj-protect-isro-001"))
    assert plan.recommendation is not None
    service = ReportService()

    response = service.create_report(_report_request())
    report = service.get_report(response.report_id)

    briefing_text = report.briefing.summary
    assert f"{plan.recommendation.delta_v_m_s:.2f} m/s" in briefing_text
    assert f"{plan.before.pc:.3e}" in briefing_text
    assert f"{plan.recommendation.predicted_risk.pc:.3e}" in briefing_text
    assert f"{plan.recommendation.predicted_risk.miss_distance_m / 1000:.2f} km" in briefing_text
    assert report.source_ids.conjunction_id == "conj-protect-isro-001"


def test_report_includes_secondary_status_and_assumptions() -> None:
    service = ReportService()

    response = service.create_report(_report_request())
    report = service.get_report(response.report_id)

    assert any(section.title == "Secondary Screening" for section in report.sections)
    assert "Secondary screening status is clear" in report.briefing.summary
    assert report.assumptions
    assert any("not spacecraft command" in assumption for assumption in report.assumptions)


def test_report_rejects_candidate_that_is_not_selected() -> None:
    service = ReportService()

    with pytest.raises(OrbitGuardError) as exc_info:
        service.create_report(_report_request(candidate_id="mnv-protect-isro-b"))

    assert exc_info.value.code == "report_candidate_mismatch"
