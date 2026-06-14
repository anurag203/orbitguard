from __future__ import annotations

from dataclasses import dataclass
from math import exp, isfinite, sqrt

from app.core.errors import OrbitGuardError
from app.models.risk import CovarianceModel, PcEstimate, RiskClassification


@dataclass(frozen=True)
class PcInput:
    relative_position_m: list[float]
    relative_velocity_vector_km_s: list[float]


class CollisionProbabilityEngine:
    def __init__(self, covariance: CovarianceModel | None = None) -> None:
        self.default_covariance = covariance or CovarianceModel(
            model_id="tle-demo-isotropic-300m",
            sigma_x_m=300.0,
            sigma_y_m=300.0,
            hard_body_radius_m=20.0,
            source="Round 1 documented TLE covariance assumption",
            notes=[
                "TLEs do not include covariance, so OrbitGuard uses a representative combined encounter-plane uncertainty.",
                "Pc is an educational decision-support estimate, not an operational collision assessment.",
            ],
        )

    def estimate_pc(self, pc_input: PcInput, covariance: CovarianceModel | None = None) -> PcEstimate:
        model = covariance or self.default_covariance
        self._validate_covariance(model)

        encounter_x_m, encounter_y_m, warnings = self.build_encounter_plane(pc_input)
        exponent = -0.5 * (
            (encounter_x_m / model.sigma_x_m) ** 2
            + (encounter_y_m / model.sigma_y_m) ** 2
        )
        small_circle_scale = (model.hard_body_radius_m**2) / (2.0 * model.sigma_x_m * model.sigma_y_m)
        pc = small_circle_scale * exp(exponent)
        pc = max(0.0, min(1.0, pc))

        assumptions = [
            "Estimated Pc uses a simplified 2D encounter-plane Gaussian approximation.",
            "Covariance is assumed because public TLEs do not provide object covariance.",
            "Hard-body radius is a configurable demo assumption.",
            "This value is for transparent hackathon decision support, not operational command authority.",
        ]
        return PcEstimate(
            pc=pc,
            method="2d-gaussian-small-hard-body-radius-approximation",
            encounter_x_m=encounter_x_m,
            encounter_y_m=encounter_y_m,
            covariance=model,
            assumptions=assumptions,
            warnings=warnings,
        )

    def build_encounter_plane(self, pc_input: PcInput) -> tuple[float, float, list[str]]:
        self._validate_vector("relative_position_m", pc_input.relative_position_m)
        self._validate_vector("relative_velocity_vector_km_s", pc_input.relative_velocity_vector_km_s)

        position = pc_input.relative_position_m
        velocity = pc_input.relative_velocity_vector_km_s
        velocity_norm = self._norm(velocity)
        warnings: list[str] = []

        if velocity_norm <= 1e-12:
            warnings.append("Relative velocity is degenerate; encounter-plane axes fall back to inertial x/y components.")
            return position[0], position[1], warnings

        velocity_unit = [component / velocity_norm for component in velocity]
        along_velocity_m = self._dot(position, velocity_unit)
        perpendicular = [
            position[index] - along_velocity_m * velocity_unit[index]
            for index in range(3)
        ]
        perpendicular_norm = self._norm(perpendicular)

        if perpendicular_norm <= 1e-9:
            warnings.append("Relative position is nearly parallel to relative velocity; encounter-plane y component is set to zero.")
            return 0.0, 0.0, warnings

        return perpendicular_norm, 0.0, warnings

    def classify_risk(self, pc: float, miss_distance_m: float) -> RiskClassification:
        if pc >= 1e-4 or miss_distance_m <= 1_000:
            return RiskClassification(severity="critical", status="requires-copilot-review", reasons=["Pc or miss distance exceeds critical threshold."])
        if pc >= 1e-5 or miss_distance_m <= 5_000:
            return RiskClassification(severity="warning", status="monitor-closely", reasons=["Pc or miss distance exceeds warning threshold."])
        if pc >= 1e-6 or miss_distance_m <= 25_000:
            return RiskClassification(severity="watch", status="watch", reasons=["Pc or miss distance exceeds watch threshold."])
        return RiskClassification(severity="nominal", status="screened", reasons=["Pc and miss distance are below watch thresholds."])

    def _validate_covariance(self, model: CovarianceModel) -> None:
        values = [model.sigma_x_m, model.sigma_y_m, model.hard_body_radius_m]
        if any(not isfinite(value) or value <= 0 for value in values):
            raise OrbitGuardError(
                422,
                "pc_invalid_covariance",
                "Covariance sigmas and hard-body radius must be positive finite values.",
            )

    def _validate_vector(self, name: str, value: list[float]) -> None:
        if len(value) != 3 or any(not isfinite(component) for component in value):
            raise OrbitGuardError(
                422,
                "pc_invalid_vector",
                f"{name} must contain exactly three finite numeric components.",
            )

    def _norm(self, value: list[float]) -> float:
        return sqrt(sum(component * component for component in value))

    def _dot(self, left: list[float], right: list[float]) -> float:
        return sum(left[index] * right[index] for index in range(3))
