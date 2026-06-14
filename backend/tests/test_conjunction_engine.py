from __future__ import annotations

from app.engines.conjunction_engine import ConjunctionEngine, ScreeningConfig
from app.models.propagation import PropagationSeries, StateVector


def state(timestamp: str, position_km: list[float], velocity_km_s: list[float] | None = None) -> StateVector:
    return StateVector(
        timestamp_utc=timestamp,
        position_km=position_km,
        velocity_km_s=velocity_km_s or [0.0, 0.0, 0.0],
    )


def series(object_id: str, states: list[StateVector]) -> PropagationSeries:
    return PropagationSeries(
        object_id=object_id,
        name=object_id,
        sample_count=len(states),
        status="ok",
        states=states,
        warnings=[],
    )


def test_screening_ranks_closest_candidate_first() -> None:
    engine = ConjunctionEngine()
    primary = series(
        "primary",
        [state("2026-06-13T00:00:00Z", [0, 0, 0]), state("2026-06-13T00:01:00Z", [0, 0, 0])],
    )
    close = series(
        "close",
        [state("2026-06-13T00:00:00Z", [0.0005, 0, 0]), state("2026-06-13T00:01:00Z", [0.0005, 0, 0])],
    )
    far = series(
        "far",
        [state("2026-06-13T00:00:00Z", [4, 0, 0]), state("2026-06-13T00:01:00Z", [4, 0, 0])],
    )

    results = engine.screen_protagonist(primary, [far, close], ScreeningConfig(coarse_threshold_m=10_000))

    assert [item.secondary_object_id for item in results] == ["close", "far"]
    assert results[0].risk.severity == "critical"
    assert results[1].risk.severity == "warning"


def test_screening_ignores_candidates_outside_threshold() -> None:
    engine = ConjunctionEngine()
    primary = series("primary", [state("2026-06-13T00:00:00Z", [0, 0, 0])])
    far = series("far", [state("2026-06-13T00:00:00Z", [100, 0, 0])])

    results = engine.screen_protagonist(primary, [far], ScreeningConfig(coarse_threshold_m=1_000))

    assert results == []


def test_refine_tca_returns_none_without_common_timestamps() -> None:
    engine = ConjunctionEngine()
    primary = series("primary", [state("2026-06-13T00:00:00Z", [0, 0, 0])])
    secondary = series("secondary", [state("2026-06-13T00:01:00Z", [0, 0, 0])])

    assert engine.refine_tca(primary, secondary) is None


def test_screening_detail_includes_pc_estimate() -> None:
    engine = ConjunctionEngine()
    primary = series("primary", [state("2026-06-13T00:00:00Z", [0, 0, 0], [0, 0, 0])])
    secondary = series("secondary", [state("2026-06-13T00:00:00Z", [0.5, 0, 0], [0, 0.001, 0])])

    results = engine.screen_protagonist(primary, [secondary], ScreeningConfig(coarse_threshold_m=1_000))

    assert results[0].pc_estimate.pc == results[0].risk.pc
    assert results[0].pc_estimate.method == "2d-gaussian-small-hard-body-radius-approximation"
    assert results[0].pc_estimate.covariance.hard_body_radius_m == 20.0
