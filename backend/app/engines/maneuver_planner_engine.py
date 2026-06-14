from __future__ import annotations

from dataclasses import dataclass
from string import ascii_lowercase

from app.core.ids import ScenarioIds
from app.engines.collision_probability_engine import CollisionProbabilityEngine, PcInput
from app.models.common import RiskMetrics
from app.models.conjunction import ConjunctionDetail
from app.models.maneuver import ManeuverCandidate, ManeuverConstraints


@dataclass(frozen=True)
class PlannerResult:
    status: str
    recommendation: ManeuverCandidate | None
    alternatives: list[ManeuverCandidate]
    predicted_after: RiskMetrics
    candidate_count: int
    explanation: str
    assumptions: list[str]
    warnings: list[str]


@dataclass(frozen=True)
class CandidateDraft:
    burn_t_minus_tca_s: int
    direction: str
    delta_v_m_s: float
    predicted_risk: RiskMetrics
    miss_distance_gain_m: float
    pc_reduction_factor: float
    score: float
    status: str
    reason: str
    rejection_reasons: list[str]
    assumptions: list[str]


class ManeuverPlannerEngine:
    """Ranks small impulsive demo maneuvers against Pc and clearance constraints."""

    def __init__(self, pc_engine: CollisionProbabilityEngine | None = None) -> None:
        self._pc_engine = pc_engine or CollisionProbabilityEngine()
        self._lead_times_s = [14_400, 10_800, 7_200]
        self._delta_v_grid_m_s = [0.04, 0.08, 0.12, 0.20, 0.35, 0.50]
        self._directions = ["along-track-prograde"]
        self._lead_time_gain_factor = 4.5

    def plan(self, conjunction: ConjunctionDetail, constraints: ManeuverConstraints) -> PlannerResult:
        drafts = self.generate_candidates(conjunction, constraints)
        if not drafts:
            return PlannerResult(
                status="no-safe-plan",
                recommendation=None,
                alternatives=[],
                predicted_after=conjunction.risk,
                candidate_count=0,
                explanation=(
                    "No candidate was generated because the configured delta-v budget is below the smallest "
                    "Round 1 maneuver grid point."
                ),
                assumptions=self._assumptions(),
                warnings=["Delta-v budget is too small to evaluate any configured maneuver candidate."],
            )

        viable = [draft for draft in drafts if draft.status == "viable"]
        recommendation_draft = self.select_recommendation(viable)
        ranked_drafts = self._rank_drafts(drafts, recommendation_draft)
        recommendation, alternatives = self._assign_candidate_ids(conjunction.conjunction_id, recommendation_draft, ranked_drafts)

        predicted_after = recommendation.predicted_risk if recommendation is not None else ranked_drafts[0].predicted_risk
        status = "recommended" if recommendation is not None else "no-safe-plan"
        warnings: list[str] = []
        if recommendation is None:
            warnings.append(
                "No candidate met both the Pc threshold and minimum miss-distance constraint within the supplied delta-v budget."
            )

        return PlannerResult(
            status=status,
            recommendation=recommendation,
            alternatives=alternatives,
            predicted_after=predicted_after,
            candidate_count=len(drafts),
            explanation=self._explanation(conjunction, constraints, recommendation),
            assumptions=self._assumptions(),
            warnings=warnings,
        )

    def generate_candidates(self, conjunction: ConjunctionDetail, constraints: ManeuverConstraints) -> list[CandidateDraft]:
        drafts: list[CandidateDraft] = []
        for burn_t_minus_tca_s in self._lead_times_s:
            for direction in self._directions:
                if direction not in constraints.allowed_directions:
                    continue
                for delta_v_m_s in self._delta_v_grid_m_s:
                    if delta_v_m_s > constraints.max_delta_v_m_s:
                        continue
                    drafts.append(
                        self.score_candidate(
                            conjunction=conjunction,
                            constraints=constraints,
                            burn_t_minus_tca_s=burn_t_minus_tca_s,
                            direction=direction,
                            delta_v_m_s=delta_v_m_s,
                        )
                    )
        return drafts

    def score_candidate(
        self,
        conjunction: ConjunctionDetail,
        constraints: ManeuverConstraints,
        burn_t_minus_tca_s: int,
        direction: str,
        delta_v_m_s: float,
    ) -> CandidateDraft:
        before = conjunction.risk
        direction_sign = 1.0 if direction == "along-track-prograde" else -1.0
        raw_gain_m = direction_sign * delta_v_m_s * burn_t_minus_tca_s * self._lead_time_gain_factor
        after_encounter_x_m = max(0.0, conjunction.pc_estimate.encounter_x_m + raw_gain_m)
        pc_estimate = self._pc_engine.estimate_pc(
            PcInput(
                relative_position_m=[after_encounter_x_m, 0.0, 0.0],
                relative_velocity_vector_km_s=[0.0, 1.0, 0.0],
            ),
            conjunction.pc_estimate.covariance,
        )
        classification = self._pc_engine.classify_risk(pc_estimate.pc, after_encounter_x_m)
        predicted_risk = RiskMetrics(
            pc=pc_estimate.pc,
            miss_distance_m=after_encounter_x_m,
            relative_velocity_km_s=before.relative_velocity_km_s,
            severity=classification.severity,
        )
        rejection_reasons = self._rejection_reasons(before, predicted_risk, constraints)
        status = "viable" if not rejection_reasons else "rejected"
        pc_reduction_factor = self._pc_reduction_factor(before.pc, predicted_risk.pc)
        score = self._score_candidate(
            before=before,
            predicted=predicted_risk,
            constraints=constraints,
            delta_v_m_s=delta_v_m_s,
            pc_reduction_factor=pc_reduction_factor,
        )
        reason = self._candidate_reason(status, rejection_reasons, predicted_risk, constraints)

        return CandidateDraft(
            burn_t_minus_tca_s=burn_t_minus_tca_s,
            direction=direction,
            delta_v_m_s=delta_v_m_s,
            predicted_risk=predicted_risk,
            miss_distance_gain_m=predicted_risk.miss_distance_m - before.miss_distance_m,
            pc_reduction_factor=pc_reduction_factor,
            score=score,
            status=status,
            reason=reason,
            rejection_reasons=rejection_reasons,
            assumptions=[
                "Post-burn miss-distance gain uses a documented Round 1 along-track lead-time surrogate.",
                "Pc is recomputed with the same covariance model used for the pre-maneuver conjunction.",
            ],
        )

    def select_recommendation(self, viable: list[CandidateDraft]) -> CandidateDraft | None:
        if not viable:
            return None
        return sorted(
            viable,
            key=lambda draft: (
                draft.delta_v_m_s,
                -draft.burn_t_minus_tca_s,
                draft.predicted_risk.pc,
            ),
        )[0]

    def _rank_drafts(self, drafts: list[CandidateDraft], recommendation: CandidateDraft | None) -> list[CandidateDraft]:
        if recommendation is None:
            return sorted(
                drafts,
                key=lambda draft: (
                    len(draft.rejection_reasons),
                    -draft.score,
                    draft.delta_v_m_s,
                    -draft.burn_t_minus_tca_s,
                ),
            )

        return sorted(
            drafts,
            key=lambda draft: (
                0 if draft == recommendation else 1,
                0 if draft.status == "viable" else 1,
                draft.delta_v_m_s,
                -draft.score,
                -draft.burn_t_minus_tca_s,
            ),
        )

    def _assign_candidate_ids(
        self,
        conjunction_id: str,
        recommendation_draft: CandidateDraft | None,
        ranked_drafts: list[CandidateDraft],
    ) -> tuple[ManeuverCandidate | None, list[ManeuverCandidate]]:
        prefix = self._candidate_prefix(conjunction_id)
        candidates: list[ManeuverCandidate] = []
        for index, draft in enumerate(ranked_drafts[:5]):
            candidate_id = f"{prefix}-{ascii_lowercase[index]}"
            status = "recommended" if recommendation_draft is not None and draft == recommendation_draft else draft.status
            if status == "viable":
                status = "valid-alternative"
            candidates.append(self._to_candidate(candidate_id, draft, status))

        recommendation = candidates[0] if recommendation_draft is not None else None
        alternatives = candidates[1:] if recommendation is not None else candidates
        return recommendation, alternatives

    def _to_candidate(self, candidate_id: str, draft: CandidateDraft, status: str) -> ManeuverCandidate:
        return ManeuverCandidate(
            candidate_id=candidate_id,
            burn_t_minus_tca_s=draft.burn_t_minus_tca_s,
            direction=draft.direction,
            delta_v_m_s=draft.delta_v_m_s,
            score=draft.score,
            status=status,
            reason=draft.reason,
            predicted_risk=draft.predicted_risk,
            miss_distance_gain_m=draft.miss_distance_gain_m,
            pc_reduction_factor=draft.pc_reduction_factor,
            rejection_reasons=draft.rejection_reasons,
            assumptions=draft.assumptions,
        )

    def _rejection_reasons(
        self,
        before: RiskMetrics,
        predicted: RiskMetrics,
        constraints: ManeuverConstraints,
    ) -> list[str]:
        reasons: list[str] = []
        if predicted.pc >= before.pc:
            reasons.append("does-not-reduce-pc")
        if predicted.miss_distance_m <= before.miss_distance_m:
            reasons.append("does-not-improve-miss-distance")
        if predicted.pc > constraints.safety_pc_threshold:
            reasons.append("pc-above-threshold")
        if predicted.miss_distance_m < constraints.min_miss_distance_m:
            reasons.append("miss-distance-below-clearance-threshold")
        return reasons

    def _score_candidate(
        self,
        before: RiskMetrics,
        predicted: RiskMetrics,
        constraints: ManeuverConstraints,
        delta_v_m_s: float,
        pc_reduction_factor: float,
    ) -> float:
        pc_score = 1.0 if before.pc == 0 else min(1.0, max(0.0, pc_reduction_factor))
        clearance_score = min(1.0, predicted.miss_distance_m / constraints.min_miss_distance_m)
        fuel_score = max(0.0, 1.0 - (delta_v_m_s / constraints.max_delta_v_m_s))
        return round(0.55 * pc_score + 0.25 * clearance_score + 0.20 * fuel_score, 4)

    def _candidate_reason(
        self,
        status: str,
        rejection_reasons: list[str],
        predicted: RiskMetrics,
        constraints: ManeuverConstraints,
    ) -> str:
        if status == "viable":
            return (
                "Meets Pc and clearance thresholds while reducing primary conjunction risk; "
                f"predicted miss distance is {predicted.miss_distance_m:.1f} m."
            )
        if "miss-distance-below-clearance-threshold" in rejection_reasons:
            return (
                "Reduces Pc, but does not create enough miss-distance margin for the configured "
                f"{constraints.min_miss_distance_m:.0f} m clearance threshold."
            )
        if "pc-above-threshold" in rejection_reasons:
            return "Does not drive estimated Pc below the configured safety threshold."
        return "Rejected because it does not improve the primary conjunction risk enough."

    def _pc_reduction_factor(self, before_pc: float, after_pc: float) -> float:
        if before_pc <= 0:
            return 0.0
        return max(0.0, min(1.0, (before_pc - after_pc) / before_pc))

    def _candidate_prefix(self, conjunction_id: str) -> str:
        return ScenarioIds.from_conjunction_id(conjunction_id).candidate_prefix

    def _explanation(
        self,
        conjunction: ConjunctionDetail,
        constraints: ManeuverConstraints,
        recommendation: ManeuverCandidate | None,
    ) -> str:
        if recommendation is None:
            return (
                "No candidate inside the configured delta-v budget satisfies both the Pc threshold "
                f"({constraints.safety_pc_threshold:.1e}) and minimum miss distance "
                f"({constraints.min_miss_distance_m:.0f} m)."
            )
        return (
            f"Recommend a {recommendation.delta_v_m_s:.2f} m/s {recommendation.direction} burn "
            f"{recommendation.burn_t_minus_tca_s / 3600:.1f} hours before TCA. "
            f"In the Round 1 surrogate, miss distance increases from "
            f"{conjunction.risk.miss_distance_m:.1f} m to {recommendation.predicted_risk.miss_distance_m:.1f} m "
            f"and estimated Pc drops from {conjunction.risk.pc:.3e} to {recommendation.predicted_risk.pc:.3e}."
        )

    def _assumptions(self) -> list[str]:
        return [
            "Round 1 planner evaluates small impulsive along-track candidates only.",
            "Miss-distance gain is approximated as delta-v times lead time times a documented fixture gain factor.",
            "The selected maneuver is a simulation recommendation and still requires secondary screening.",
            "Final-round work should replace the surrogate with post-burn orbit propagation and multi-axis optimization.",
        ]
