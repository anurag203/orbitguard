from __future__ import annotations

import json
from pathlib import Path

from pydantic import ValidationError

from app.core.errors import OrbitGuardError
from app.core.ids import ScenarioIds
from app.core.paths import project_root
from app.engines.secondary_risk_engine import SecondaryRiskEngine
from app.models.maneuver import ManeuverCandidate, ManeuverPlanResponse
from app.models.secondary import SecondaryFixture, SecondaryRiskResult


PROJECT_ROOT = project_root()
DEFAULT_SECONDARY_FIXTURE_DIR = PROJECT_ROOT / "data" / "secondary-screening"


class SecondaryRiskService:
    def __init__(
        self,
        fixture_dir: Path | None = None,
        engine: SecondaryRiskEngine | None = None,
    ) -> None:
        self._fixture_dir = fixture_dir or DEFAULT_SECONDARY_FIXTURE_DIR
        self._engine = engine or SecondaryRiskEngine()
        self._fixtures: dict[str, SecondaryFixture] | None = None

    def screen(self, plan: ManeuverPlanResponse, candidate: ManeuverCandidate) -> SecondaryRiskResult:
        fixture = self._fixture_for_plan(plan)
        if fixture is None:
            return self._engine.classify(candidate, None)

        return self._engine.classify(candidate, fixture.results.get(candidate.candidate_id))

    def _fixture_for_plan(self, plan: ManeuverPlanResponse) -> SecondaryFixture | None:
        return self._load_fixtures().get(self._scenario_id_for_plan(plan.plan_id))

    def _load_fixtures(self) -> dict[str, SecondaryFixture]:
        if self._fixtures is not None:
            return self._fixtures
        if not self._fixture_dir.exists():
            self._fixtures = {}
            return self._fixtures

        fixtures: dict[str, SecondaryFixture] = {}
        for path in sorted(self._fixture_dir.glob("*.json")):
            fixture = self._load_fixture(path)
            fixtures[fixture.scenario_id] = fixture

        self._fixtures = fixtures
        return fixtures

    def _load_fixture(self, path: Path) -> SecondaryFixture:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return SecondaryFixture.model_validate(data)
        except json.JSONDecodeError as exc:
            raise OrbitGuardError(
                500,
                "secondary_fixture_invalid_json",
                f"Secondary-risk fixture '{path.name}' is not valid JSON.",
                {"line": exc.lineno, "column": exc.colno},
            ) from exc
        except ValidationError as exc:
            raise OrbitGuardError(
                500,
                "secondary_fixture_invalid_schema",
                f"Secondary-risk fixture '{path.name}' does not match the expected schema.",
                {"errors": exc.errors()},
            ) from exc

    def _scenario_id_for_plan(self, plan_id: str) -> str:
        return ScenarioIds.from_plan_id(plan_id).slug
