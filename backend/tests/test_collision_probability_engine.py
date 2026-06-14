from __future__ import annotations

import pytest

from app.core.errors import OrbitGuardError
from app.engines.collision_probability_engine import CollisionProbabilityEngine, PcInput
from app.models.risk import CovarianceModel


def test_pc_is_bounded_between_zero_and_one() -> None:
    engine = CollisionProbabilityEngine()

    estimate = engine.estimate_pc(PcInput(relative_position_m=[500.0, 0.0, 0.0], relative_velocity_vector_km_s=[0.0, 1.0, 0.0]))

    assert 0 <= estimate.pc <= 1
    assert estimate.covariance.model_id == "tle-demo-isotropic-300m"
    assert estimate.assumptions


def test_pc_decreases_with_larger_miss_distance() -> None:
    engine = CollisionProbabilityEngine()

    close = engine.estimate_pc(PcInput(relative_position_m=[500.0, 0.0, 0.0], relative_velocity_vector_km_s=[0.0, 1.0, 0.0]))
    far = engine.estimate_pc(PcInput(relative_position_m=[5_000.0, 0.0, 0.0], relative_velocity_vector_km_s=[0.0, 1.0, 0.0]))

    assert close.pc > far.pc


def test_larger_covariance_increases_uncertainty_for_far_fixture() -> None:
    small_cov = CovarianceModel(
        model_id="small",
        sigma_x_m=100.0,
        sigma_y_m=100.0,
        hard_body_radius_m=20.0,
        source="test",
    )
    large_cov = CovarianceModel(
        model_id="large",
        sigma_x_m=500.0,
        sigma_y_m=500.0,
        hard_body_radius_m=20.0,
        source="test",
    )
    engine = CollisionProbabilityEngine()
    pc_input = PcInput(relative_position_m=[800.0, 0.0, 0.0], relative_velocity_vector_km_s=[0.0, 1.0, 0.0])

    assert engine.estimate_pc(pc_input, large_cov).pc > engine.estimate_pc(pc_input, small_cov).pc


def test_invalid_covariance_is_rejected() -> None:
    bad_cov = CovarianceModel.model_construct(
        model_id="bad",
        sigma_x_m=0.0,
        sigma_y_m=300.0,
        hard_body_radius_m=20.0,
        source="test",
        notes=[],
    )
    engine = CollisionProbabilityEngine()

    with pytest.raises(OrbitGuardError) as exc_info:
        engine.estimate_pc(
            PcInput(relative_position_m=[500.0, 0.0, 0.0], relative_velocity_vector_km_s=[0.0, 1.0, 0.0]),
            bad_cov,
        )

    assert exc_info.value.code == "pc_invalid_covariance"


def test_degenerate_relative_velocity_uses_fallback_warning() -> None:
    engine = CollisionProbabilityEngine()

    estimate = engine.estimate_pc(PcInput(relative_position_m=[500.0, 20.0, 0.0], relative_velocity_vector_km_s=[0.0, 0.0, 0.0]))

    assert estimate.warnings
    assert estimate.encounter_x_m == 500.0
    assert estimate.encounter_y_m == 20.0
