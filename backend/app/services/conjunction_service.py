from __future__ import annotations

import logging
from dataclasses import dataclass

from app.core.errors import OrbitGuardError
from app.engines.conjunction_engine import ConjunctionEngine, ScreeningConfig
from app.models.common import RiskMetrics
from app.models.conjunction import ConjunctionDetail, EncounterPlanePoint, ScreeningRequest, ScreeningResponse
from app.models.propagation import PropagationRequest
from app.models.risk import CovarianceModel, PcEstimate
from app.models.scenario import ScenarioRunRequest
from app.services.catalog_service import CatalogService
from app.services.propagation_service import PropagationService
from app.services.scenario_service import ScenarioService

logger = logging.getLogger("orbitguard.conjunction")


FINAL_ROUND_CONJUNCTION_FIXTURES: dict[str, ConjunctionDetail] = {
    "conj-2009-replay-001": ConjunctionDetail(
        conjunction_id="conj-2009-replay-001",
        primary_object_id="iridium-33-demo",
        secondary_object_id="cosmos-2251-demo",
        tca_utc="2026-02-10T16:56:00Z",
        risk=RiskMetrics(
            pc=0.000412,
            miss_distance_m=742.5,
            relative_velocity_km_s=11.7,
            severity="critical",
        ),
        status="requires-copilot-review",
        relative_position_m=[742.5, 0.0, 0.0],
        relative_velocity_vector_km_s=[0.0, 11.7, 0.0],
        encounter_plane=[
            EncounterPlanePoint(x_m=0.0, y_m=0.0, label="iridium-33-demo"),
            EncounterPlanePoint(x_m=742.5, y_m=0.0, label="cosmos-2251-demo"),
        ],
        pc_estimate=PcEstimate(
            pc=0.000412,
            method="fixture-backed-2d-gaussian-small-hard-body-radius-approximation",
            encounter_x_m=742.5,
            encounter_y_m=0.0,
            covariance=CovarianceModel(
                model_id="historical-demo-isotropic-350m",
                sigma_x_m=350.0,
                sigma_y_m=350.0,
                hard_body_radius_m=18.0,
                source="committed final-round replay fixture",
                notes=[
                    "Fixture is designed for stable historical what-if storytelling.",
                    "It is not a reconstruction of operational CDM covariance for the 2009 event.",
                ],
            ),
            assumptions=[
                "2009 Replay uses deterministic fixture geometry because public TLEs alone do not reproduce a clean demo TCA.",
                "Pc is illustrative and bounded by the documented covariance surrogate.",
            ],
            warnings=["Historical replay is educational and not an operational reconstruction."],
        ),
        assumptions=[
            "This conjunction is a deterministic final-round fixture attached to the Iridium-Cosmos replay mode.",
            "The scenario demonstrates alert-to-action workflow on a historically meaningful event.",
        ],
    ),
    "conj-kessler-sandbox-001": ConjunctionDetail(
        conjunction_id="conj-kessler-sandbox-001",
        primary_object_id="kessler-policy-sat-demo",
        secondary_object_id="kessler-debris-cloud-demo",
        tca_utc="2026-06-13T02:30:00Z",
        risk=RiskMetrics(
            pc=0.0000076,
            miss_distance_m=4860.0,
            relative_velocity_km_s=7.2,
            severity="warning",
        ),
        status="monitor-closely",
        relative_position_m=[4860.0, 0.0, 0.0],
        relative_velocity_vector_km_s=[0.0, 7.2, 0.0],
        encounter_plane=[
            EncounterPlanePoint(x_m=0.0, y_m=0.0, label="policy-sat"),
            EncounterPlanePoint(x_m=4860.0, y_m=0.0, label="debris-cloud"),
        ],
        pc_estimate=PcEstimate(
            pc=0.0000076,
            method="fixture-backed-2d-gaussian-small-hard-body-radius-approximation",
            encounter_x_m=4860.0,
            encounter_y_m=0.0,
            covariance=CovarianceModel(
                model_id="kessler-demo-shell-900m",
                sigma_x_m=900.0,
                sigma_y_m=900.0,
                hard_body_radius_m=12.0,
                source="committed final-round education fixture",
                notes=[
                    "Fixture models aggregate pressure from a debris cloud, not one tracked operational object.",
                    "Final-round science may replace this with Monte Carlo shell growth simulation.",
                ],
            ),
            assumptions=[
                "Kessler Sandbox uses a deterministic warning-band event to demonstrate debris-growth pressure.",
                "Pc is illustrative for education mode and not operational tasking advice.",
            ],
            warnings=["Education mode is a policy simulator, not a spacecraft maneuver recommendation."],
        ),
        assumptions=[
            "This conjunction is a deterministic final-round fixture attached to the Kessler Sandbox mode.",
            "The scenario demonstrates how debris pressure changes operator workload.",
        ],
    ),
}


@dataclass(frozen=True)
class ScreeningContext:
    catalog_id: str
    protected_object_id: str
    scenario_id: str | None = None
    expected_top_conjunction_id: str | None = None


class ConjunctionService:
    def __init__(
        self,
        catalog_service: CatalogService | None = None,
        propagation_service: PropagationService | None = None,
        scenario_service: ScenarioService | None = None,
        engine: ConjunctionEngine | None = None,
    ) -> None:
        self._catalog_service = catalog_service or CatalogService()
        self._propagation_service = propagation_service or PropagationService(self._catalog_service)
        self._scenario_service = scenario_service or ScenarioService(self._catalog_service)
        self._engine = engine or ConjunctionEngine()
        self._screened_details: dict[str, ConjunctionDetail] = {}

    def screen(self, request: ScreeningRequest) -> ScreeningResponse:
        context = self._resolve_context(request)
        catalog = self._catalog_service.load_catalog(context.catalog_id)
        protected_object = self._catalog_service.get_object(context.protected_object_id)
        if protected_object is None:
            raise OrbitGuardError(
                404,
                "protected_object_not_found",
                f"Protected object '{context.protected_object_id}' was not found.",
            )

        secondary_ids = [
            obj.object_id
            for obj in catalog.objects
            if obj.object_id != protected_object.object_id
        ]
        object_ids = [protected_object.object_id, *secondary_ids]
        propagation = self._propagation_service.propagate(
            PropagationRequest(
                object_ids=object_ids,
                start_time_utc=request.start_time_utc,
                end_time_utc=request.end_time_utc,
                step_seconds=request.step_seconds,
            )
        )

        series_by_id = {series.object_id: series for series in propagation.series}
        protagonist_series = series_by_id.get(protected_object.object_id)
        if protagonist_series is None or not protagonist_series.states:
            raise OrbitGuardError(
                422,
                "protected_object_not_propagated",
                f"Protected object '{protected_object.object_id}' did not produce propagation states.",
            )

        secondary_series = [
            series
            for object_id, series in series_by_id.items()
            if object_id != protected_object.object_id
        ]

        details = self._engine.screen_protagonist(
            protagonist_series,
            secondary_series,
            ScreeningConfig(coarse_threshold_m=request.coarse_threshold_m),
        )
        used_fixture = False
        if not details and context.expected_top_conjunction_id:
            fixture = FINAL_ROUND_CONJUNCTION_FIXTURES.get(context.expected_top_conjunction_id)
            if fixture and fixture.risk.miss_distance_m <= request.coarse_threshold_m:
                details = [fixture]
                used_fixture = True
        details = details[: request.max_results]

        for detail in details:
            self._screened_details[detail.conjunction_id] = detail

        warnings = list(propagation.warnings)
        if not details:
            warnings.append("No conjunctions were found inside the configured screening threshold.")

        computation_mode = "fixture-fallback" if used_fixture else "sgp4"
        logger.info(
            "conjunction.screen scenario=%s count=%s computation_mode=%s",
            context.scenario_id,
            len(details),
            computation_mode,
        )
        return ScreeningResponse(
            mode="sgp4-protagonist-vs-catalog",
            computation_mode=computation_mode,
            conjunctions=[self._engine.summary_from_detail(detail) for detail in details],
            warnings=warnings,
        )

    def get_detail(self, conjunction_id: str) -> ConjunctionDetail:
        cached = self._screened_details.get(conjunction_id)
        if cached is not None:
            return cached

        request = self._request_for_known_conjunction(conjunction_id)
        if request is None:
            raise OrbitGuardError(404, "conjunction_not_found", f"Conjunction '{conjunction_id}' was not found.")

        context = self._resolve_context(request)
        catalog = self._catalog_service.load_catalog(context.catalog_id)
        protected_object = self._catalog_service.get_object(context.protected_object_id)
        if protected_object is None:
            raise OrbitGuardError(
                404,
                "protected_object_not_found",
                f"Protected object '{context.protected_object_id}' was not found.",
            )

        propagation = self._propagation_service.propagate(
            PropagationRequest(
                object_ids=[
                    protected_object.object_id,
                    *[obj.object_id for obj in catalog.objects if obj.object_id != protected_object.object_id],
                ],
                start_time_utc=request.start_time_utc,
                end_time_utc=request.end_time_utc,
                step_seconds=request.step_seconds,
            )
        )
        series_by_id = {series.object_id: series for series in propagation.series}
        protagonist_series = series_by_id.get(protected_object.object_id)
        if protagonist_series is None:
            raise OrbitGuardError(404, "conjunction_not_found", f"Conjunction '{conjunction_id}' was not found.")

        details = self._engine.screen_protagonist(
            protagonist_series,
            [series for object_id, series in series_by_id.items() if object_id != protected_object.object_id],
            ScreeningConfig(coarse_threshold_m=request.coarse_threshold_m),
        )
        for detail in details:
            if detail.conjunction_id == conjunction_id:
                self._screened_details[conjunction_id] = detail
                return detail

        fixture = FINAL_ROUND_CONJUNCTION_FIXTURES.get(conjunction_id)
        if fixture:
            self._screened_details[conjunction_id] = fixture
            return fixture

        raise OrbitGuardError(404, "conjunction_not_found", f"Conjunction '{conjunction_id}' was not found.")

    def _resolve_context(self, request: ScreeningRequest) -> ScreeningContext:
        if request.scenario_id:
            scenario = self._scenario_service.run_scenario(request.scenario_id, request=ScenarioRunRequest(deterministic=True))
            return ScreeningContext(
                catalog_id=scenario.catalog_id,
                protected_object_id=scenario.protected_object.object_id,
                scenario_id=scenario.scenario_id,
                expected_top_conjunction_id=scenario.top_conjunction_id,
            )

        if request.catalog_id and request.protected_object_id:
            return ScreeningContext(catalog_id=request.catalog_id, protected_object_id=request.protected_object_id)

        return ScreeningContext(catalog_id="demo-protect-isro", protected_object_id="isro-cartosat-2f", scenario_id="protect-isro")

    def _request_for_known_conjunction(self, conjunction_id: str) -> ScreeningRequest | None:
        known = {
            "conj-protect-isro-001": ScreeningRequest(scenario_id="protect-isro", step_seconds=10),
            "conj-2009-replay-001": ScreeningRequest(scenario_id="2009-replay", step_seconds=60),
            "conj-kessler-sandbox-001": ScreeningRequest(scenario_id="kessler-sandbox", step_seconds=60),
        }
        return known.get(conjunction_id)
