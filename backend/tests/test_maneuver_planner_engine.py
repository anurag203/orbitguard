from __future__ import annotations

from app.engines.maneuver_planner_engine import ManeuverPlannerEngine
from app.models.maneuver import ManeuverConstraints
from app.services.conjunction_service import ConjunctionService


def _protect_isro_conjunction():
    return ConjunctionService().get_detail("conj-protect-isro-001")


def _constraints(max_delta_v_m_s: float = 0.5) -> ManeuverConstraints:
    return ManeuverConstraints(
        max_delta_v_m_s=max_delta_v_m_s,
        safety_pc_threshold=1e-6,
        min_miss_distance_m=8_000.0,
        allowed_directions=["along-track-prograde"],
    )


def test_candidate_generation_respects_delta_v_limit() -> None:
    engine = ManeuverPlannerEngine()

    candidates = engine.generate_candidates(_protect_isro_conjunction(), _constraints(max_delta_v_m_s=0.08))

    assert candidates
    assert all(candidate.delta_v_m_s <= 0.08 for candidate in candidates)


def test_planner_selects_minimum_delta_v_safe_candidate() -> None:
    engine = ManeuverPlannerEngine()

    result = engine.plan(_protect_isro_conjunction(), _constraints())

    assert result.status == "recommended"
    assert result.recommendation is not None
    assert result.recommendation.candidate_id == "mnv-protect-isro-a"
    assert result.recommendation.delta_v_m_s == 0.12
    assert result.recommendation.predicted_risk.pc < 1e-6
    assert result.recommendation.predicted_risk.miss_distance_m >= 8_000


def test_no_safe_plan_returns_clear_status_and_warning() -> None:
    engine = ManeuverPlannerEngine()

    result = engine.plan(_protect_isro_conjunction(), _constraints(max_delta_v_m_s=0.08))

    assert result.status == "no-safe-plan"
    assert result.recommendation is None
    assert result.alternatives
    assert result.warnings


def test_rejected_candidates_explain_missing_clearance() -> None:
    engine = ManeuverPlannerEngine()

    result = engine.plan(_protect_isro_conjunction(), _constraints(max_delta_v_m_s=0.08))

    assert any(
        "miss-distance-below-clearance-threshold" in candidate.rejection_reasons
        for candidate in result.alternatives
    )
    assert result.assumptions
