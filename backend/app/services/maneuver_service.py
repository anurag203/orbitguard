from __future__ import annotations

import logging

from app.core.errors import OrbitGuardError
from app.core.ids import ScenarioIds
from app.engines.maneuver_planner_engine import ManeuverPlannerEngine
from app.models.maneuver import (
    ManeuverApplyRequest,
    ManeuverApplyResponse,
    ManeuverConstraints,
    ManeuverPlanRequest,
    ManeuverPlanResponse,
)
from app.services.conjunction_service import ConjunctionService
from app.services.secondary_risk_service import SecondaryRiskService

logger = logging.getLogger("orbitguard.maneuver")


class ManeuverService:
    def __init__(
        self,
        conjunction_service: ConjunctionService | None = None,
        planner: ManeuverPlannerEngine | None = None,
        secondary_risk_service: SecondaryRiskService | None = None,
    ) -> None:
        self._conjunction_service = conjunction_service or ConjunctionService()
        self._planner = planner or ManeuverPlannerEngine()
        self._secondary_risk_service = secondary_risk_service or SecondaryRiskService()
        # plan_id -> (conjunction_id, plan). Survives across requests because the
        # container makes ManeuverService a process-lifetime singleton.
        self._plans: dict[str, tuple[str, ManeuverPlanResponse]] = {}

    def plan(self, request: ManeuverPlanRequest) -> ManeuverPlanResponse:
        conjunction = self._conjunction_service.get_detail(request.conjunction_id)
        constraints = ManeuverConstraints(
            max_delta_v_m_s=request.max_delta_v_m_s,
            safety_pc_threshold=request.safety_pc_threshold,
            min_miss_distance_m=request.min_miss_distance_m,
            allowed_directions=["along-track-prograde"],
        )
        planner_result = self._planner.plan(conjunction, constraints)

        response = ManeuverPlanResponse(
            plan_id=self._plan_id_for_conjunction(request.conjunction_id),
            conjunction_id=request.conjunction_id,
            status=planner_result.status,
            recommendation=planner_result.recommendation,
            alternatives=planner_result.alternatives,
            before=conjunction.risk,
            predicted_after=planner_result.predicted_after,
            requires_secondary_screening=planner_result.recommendation is not None,
            explanation=planner_result.explanation,
            candidate_count=planner_result.candidate_count,
            constraints=constraints,
            assumptions=planner_result.assumptions,
            warnings=planner_result.warnings,
        )
        self._plans[response.plan_id] = (request.conjunction_id, response)
        logger.info(
            "maneuver.plan conjunction=%s plan=%s recommended=%s",
            request.conjunction_id,
            response.plan_id,
            response.recommendation is not None,
        )
        return response

    def apply(self, request: ManeuverApplyRequest) -> ManeuverApplyResponse:
        # 1) Resolve the plan: prefer a previously-computed plan, otherwise rebuild it
        #    deterministically from the plan_id (no Protect-ISRO literal).
        cached = self._plans.get(request.plan_id)
        if cached is not None:
            _, plan = cached
        else:
            conjunction_id = ScenarioIds.from_plan_id(request.plan_id).conjunction_id
            try:
                plan = self.plan(ManeuverPlanRequest(conjunction_id=conjunction_id))
            except OrbitGuardError as exc:
                # An unresolvable conjunction for this plan_id means the plan does not exist.
                if exc.code == "conjunction_not_found":
                    raise OrbitGuardError(
                        404, "plan_not_found", f"Maneuver plan '{request.plan_id}' was not found."
                    ) from exc
                raise
            if plan.plan_id != request.plan_id:
                raise OrbitGuardError(
                    404, "plan_not_found", f"Maneuver plan '{request.plan_id}' was not found."
                )

        # 2) Same guards as before, but the candidate is validated against the ACTUAL
        #    recommendation for whichever scenario this plan belongs to.
        if plan.recommendation is None:
            raise OrbitGuardError(
                409,
                "plan_has_no_recommendation",
                "Cannot apply a maneuver because the current plan has no safe recommendation.",
            )
        if request.candidate_id != plan.recommendation.candidate_id:
            raise OrbitGuardError(
                422,
                "candidate_not_recommended",
                "The selected candidate is not the recommended maneuver for this plan.",
            )
        secondary = self._secondary_risk_service.screen(plan, plan.recommendation)
        logger.info(
            "maneuver.apply plan=%s candidate=%s secondary=%s",
            request.plan_id,
            request.candidate_id,
            secondary.status,
        )

        return ManeuverApplyResponse(
            plan_id=request.plan_id,
            candidate_id=request.candidate_id,
            before=plan.before,
            after=plan.predicted_after,
            secondary_status=secondary.status,
            secondary_summary=secondary.summary,
            screened_object_count=secondary.screened_object_count,
            secondary=secondary,
        )

    def _plan_id_for_conjunction(self, conjunction_id: str) -> str:
        return ScenarioIds.from_conjunction_id(conjunction_id).plan_id
