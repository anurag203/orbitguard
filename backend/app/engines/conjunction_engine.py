from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from math import sqrt

from app.engines.collision_probability_engine import CollisionProbabilityEngine, PcInput
from app.models.common import RiskMetrics
from app.models.conjunction import ConjunctionDetail, ConjunctionSummary, EncounterPlanePoint
from app.models.propagation import PropagationSeries, StateVector


@dataclass(frozen=True)
class ScreeningConfig:
    coarse_threshold_m: float = 50_000.0
    critical_m: float = 1_000.0
    warning_m: float = 5_000.0
    watch_m: float = 25_000.0


@dataclass(frozen=True)
class TcaResult:
    timestamp_utc: str
    miss_distance_m: float
    relative_velocity_km_s: float
    relative_position_m: list[float]
    relative_velocity_vector_km_s: list[float]


class ConjunctionEngine:
    def __init__(self, pc_engine: CollisionProbabilityEngine | None = None) -> None:
        self._pc_engine = pc_engine or CollisionProbabilityEngine()

    def screen_protagonist(
        self,
        protagonist_series: PropagationSeries,
        catalog_series: list[PropagationSeries],
        config: ScreeningConfig,
    ) -> list[ConjunctionDetail]:
        candidates: list[ConjunctionDetail] = []
        for secondary_series in catalog_series:
            if protagonist_series.status not in {"ok", "warning"} or secondary_series.status not in {"ok", "warning"}:
                continue
            if not protagonist_series.states or not secondary_series.states:
                continue

            tca = self.refine_tca(protagonist_series, secondary_series)
            if tca is None or tca.miss_distance_m > config.coarse_threshold_m:
                continue

            conjunction_id = self._conjunction_id(protagonist_series.object_id, secondary_series.object_id)
            pc_estimate = self._pc_engine.estimate_pc(
                PcInput(
                    relative_position_m=tca.relative_position_m,
                    relative_velocity_vector_km_s=tca.relative_velocity_vector_km_s,
                )
            )
            classification = self._pc_engine.classify_risk(pc_estimate.pc, tca.miss_distance_m)
            risk = RiskMetrics(
                pc=pc_estimate.pc,
                miss_distance_m=tca.miss_distance_m,
                relative_velocity_km_s=tca.relative_velocity_km_s,
                severity=classification.severity,
            )
            candidates.append(
                ConjunctionDetail(
                    conjunction_id=conjunction_id,
                    primary_object_id=protagonist_series.object_id,
                    secondary_object_id=secondary_series.object_id,
                    tca_utc=tca.timestamp_utc,
                    risk=risk,
                    status=classification.status,
                    relative_position_m=tca.relative_position_m,
                    relative_velocity_vector_km_s=tca.relative_velocity_vector_km_s,
                    encounter_plane=[
                        EncounterPlanePoint(x_m=0.0, y_m=0.0, label="protected-object"),
                        EncounterPlanePoint(
                            x_m=tca.relative_position_m[0],
                            y_m=tca.relative_position_m[1],
                            label="secondary-object",
                        ),
                    ],
                    pc_estimate=pc_estimate,
                    assumptions=[
                        "Conjunction screening uses sampled SGP4 state vectors from committed fixture TLEs.",
                        "Pc is estimated by the Collision Probability Engine using documented covariance assumptions.",
                        "Scenario events may include clearly labeled simulated conjunction geometry for demo reliability.",
                        *pc_estimate.assumptions,
                        *pc_estimate.covariance.notes,
                    ],
                )
            )

        return self.rank_conjunctions(candidates)

    def refine_tca(self, primary: PropagationSeries, secondary: PropagationSeries) -> TcaResult | None:
        primary_by_time = {state.timestamp_utc: state for state in primary.states}
        common_pairs = [
            (primary_by_time[state.timestamp_utc], state)
            for state in secondary.states
            if state.timestamp_utc in primary_by_time
        ]
        if not common_pairs:
            return None

        best: TcaResult | None = None
        for primary_state, secondary_state in common_pairs:
            candidate = self._state_pair_to_tca(primary_state, secondary_state)
            if best is None or candidate.miss_distance_m < best.miss_distance_m:
                best = candidate
        return best

    def rank_conjunctions(self, candidates: list[ConjunctionDetail]) -> list[ConjunctionDetail]:
        severity_rank = {"critical": 0, "warning": 1, "watch": 2, "nominal": 3}
        return sorted(
            candidates,
            key=lambda item: (
                severity_rank.get(item.risk.severity, 99),
                item.risk.miss_distance_m,
                self._timestamp_sort_key(item.tca_utc),
            ),
        )

    def summary_from_detail(self, detail: ConjunctionDetail) -> ConjunctionSummary:
        return ConjunctionSummary(
            conjunction_id=detail.conjunction_id,
            primary_object_id=detail.primary_object_id,
            secondary_object_id=detail.secondary_object_id,
            tca_utc=detail.tca_utc,
            risk=detail.risk,
            status=detail.status,
        )

    def _state_pair_to_tca(self, primary: StateVector, secondary: StateVector) -> TcaResult:
        relative_position_km = [
            secondary.position_km[index] - primary.position_km[index]
            for index in range(3)
        ]
        relative_velocity_km_s = [
            secondary.velocity_km_s[index] - primary.velocity_km_s[index]
            for index in range(3)
        ]
        miss_distance_m = sqrt(sum(component * component for component in relative_position_km)) * 1_000.0
        relative_velocity = sqrt(sum(component * component for component in relative_velocity_km_s))
        return TcaResult(
            timestamp_utc=primary.timestamp_utc,
            miss_distance_m=miss_distance_m,
            relative_velocity_km_s=relative_velocity,
            relative_position_m=[component * 1_000.0 for component in relative_position_km],
            relative_velocity_vector_km_s=relative_velocity_km_s,
        )

    def _conjunction_id(self, primary_object_id: str, secondary_object_id: str) -> str:
        known_ids = {
            ("isro-cartosat-2f", "debris-demo-001"): "conj-protect-isro-001",
            ("iridium-33-demo", "cosmos-2251-demo"): "conj-2009-replay-001",
            ("kessler-policy-sat-demo", "kessler-debris-cloud-demo"): "conj-kessler-sandbox-001",
        }
        return known_ids.get((primary_object_id, secondary_object_id), f"conj-{primary_object_id}-{secondary_object_id}")

    def _timestamp_sort_key(self, timestamp_utc: str) -> datetime:
        return datetime.fromisoformat(timestamp_utc.replace("Z", "+00:00"))
