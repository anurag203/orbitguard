from __future__ import annotations

from pathlib import Path

from app.models.maneuver import ManeuverPlanRequest
from app.services.maneuver_service import ManeuverService
from app.services.secondary_risk_service import SecondaryRiskService


def _protect_isro_plan():
    return ManeuverService().plan(ManeuverPlanRequest(conjunction_id="conj-protect-isro-001"))


def test_secondary_screening_clears_recommended_candidate() -> None:
    plan = _protect_isro_plan()
    assert plan.recommendation is not None

    result = SecondaryRiskService().screen(plan, plan.recommendation)

    assert result.status == "clear"
    assert result.screened_object_count == 3
    assert result.concerns == []
    assert "No new critical conjunctions" in result.summary


def test_secondary_screening_blocks_introduced_critical_fixture() -> None:
    plan = _protect_isro_plan()
    assert plan.recommendation is not None
    risky_candidate = plan.recommendation.model_copy(update={"candidate_id": "mnv-protect-isro-risk-demo"})

    result = SecondaryRiskService().screen(plan, risky_candidate)

    assert result.status == "blocked"
    assert result.concerns
    assert result.concerns[0].risk.severity == "critical"
    assert result.concerns[0].introduced_new_risk is True


def test_missing_secondary_fixture_returns_warning_not_clear(tmp_path: Path) -> None:
    plan = _protect_isro_plan()
    assert plan.recommendation is not None

    result = SecondaryRiskService(fixture_dir=tmp_path).screen(plan, plan.recommendation)

    assert result.status == "warning"
    assert result.screened_object_count == 0
    assert result.warnings
