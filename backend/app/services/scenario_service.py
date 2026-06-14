from __future__ import annotations

import json
import logging
from pathlib import Path

from pydantic import ValidationError

from app.core.errors import OrbitGuardError
from app.core.paths import project_root
from app.models.scenario import ScenarioEvent, ScenarioListResponse, ScenarioManifest, ScenarioRunRequest, ScenarioRunResponse, ScenarioSummary
from app.services.catalog_service import CatalogService


PROJECT_ROOT = project_root()
DEFAULT_SCENARIO_DIR = PROJECT_ROOT / "data" / "scenarios"

logger = logging.getLogger("orbitguard.scenario")


class ScenarioService:
    def __init__(self, catalog_service: CatalogService | None = None, scenario_dir: Path | None = None) -> None:
        self._catalog_service = catalog_service or CatalogService()
        self._scenario_dir = scenario_dir or DEFAULT_SCENARIO_DIR
        self._manifests: dict[str, ScenarioManifest] | None = None

    def list_scenarios(self) -> ScenarioListResponse:
        manifests = sorted(
            self._load_manifests().values(),
            key=lambda manifest: (not manifest.hero, manifest.title),
        )
        return ScenarioListResponse(
            scenarios=[
                ScenarioSummary(
                    scenario_id=manifest.scenario_id,
                    title=manifest.title,
                    mode=manifest.mode,
                    status=manifest.status,
                    hero=manifest.hero,
                    description=manifest.description,
                )
                for manifest in manifests
            ]
        )

    def run_scenario(self, scenario_id: str, request: ScenarioRunRequest) -> ScenarioRunResponse:
        manifest = self._get_manifest(scenario_id)
        mode = "offline-fixture" if request.deterministic else "live-requested-fixture-fallback"
        protected_object = self._catalog_service.get_object(manifest.protected_object_id)
        if protected_object is None:
            raise OrbitGuardError(
                500,
                "scenario_protected_object_missing",
                f"Scenario '{scenario_id}' is missing protected object '{manifest.protected_object_id}'.",
            )

        self._catalog_service.load_catalog(manifest.catalog_id)

        return ScenarioRunResponse(
            scenario_id=manifest.scenario_id,
            run_id=manifest.run_id,
            mode=mode,
            status=manifest.status,
            catalog_id=manifest.catalog_id,
            protected_object=protected_object,
            top_conjunction_id=manifest.top_conjunction_id,
            labels=manifest.labels,
            events=manifest.events,
            expected_outcome=manifest.expected_outcome,
            demo_beats=manifest.demo_beats,
            summary=manifest.summary,
        )

    def reset_scenario(self, scenario_id: str) -> ScenarioRunResponse:
        return self.run_scenario(scenario_id, ScenarioRunRequest(deterministic=True))

    def get_scenario_event_timeline(self, scenario_id: str) -> list[ScenarioEvent]:
        return self._get_manifest(scenario_id).events

    def find_by_top_conjunction(self, conjunction_id: str) -> ScenarioManifest | None:
        return next(
            (
                manifest
                for manifest in self._load_manifests().values()
                if manifest.top_conjunction_id == conjunction_id
            ),
            None,
        )

    def _load_manifests(self) -> dict[str, ScenarioManifest]:
        if self._manifests is not None:
            return self._manifests

        if not self._scenario_dir.exists():
            raise OrbitGuardError(
                500,
                "scenario_directory_missing",
                "Scenario fixture directory is missing.",
                {"directory": self._scenario_dir.name},
            )

        manifests: dict[str, ScenarioManifest] = {}
        for path in sorted(self._scenario_dir.glob("*.json")):
            manifest = self._load_manifest_file(path)
            manifests[manifest.scenario_id] = manifest

        if not manifests:
            raise OrbitGuardError(500, "scenario_fixtures_missing", "No scenario fixture files were found.")

        self._manifests = manifests
        logger.info("scenario.fixtures_loaded count=%s", len(manifests))
        return manifests

    def _load_manifest_file(self, path: Path) -> ScenarioManifest:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            manifest = ScenarioManifest.model_validate(data)
        except json.JSONDecodeError as exc:
            raise OrbitGuardError(
                500,
                "scenario_fixture_invalid_json",
                f"Scenario fixture '{path.name}' is not valid JSON.",
                {"line": exc.lineno, "column": exc.colno},
            ) from exc
        except ValidationError as exc:
            raise OrbitGuardError(
                500,
                "scenario_fixture_invalid_schema",
                f"Scenario fixture '{path.name}' does not match the expected schema.",
                {"errors": exc.errors()},
            ) from exc

        self._validate_manifest(manifest, path.name)
        return manifest

    def _validate_manifest(self, manifest: ScenarioManifest, file_name: str) -> None:
        if not manifest.events:
            raise OrbitGuardError(
                500,
                "scenario_timeline_empty",
                f"Scenario '{manifest.scenario_id}' has no timeline events.",
                {"file": file_name},
            )

        offsets = [event.timestamp_offset_s for event in manifest.events]
        if offsets != sorted(offsets):
            raise OrbitGuardError(
                500,
                "scenario_timeline_not_sorted",
                f"Scenario '{manifest.scenario_id}' timeline events must be sorted by timestamp offset.",
                {"file": file_name},
            )

    def _get_manifest(self, scenario_id: str) -> ScenarioManifest:
        manifest = self._load_manifests().get(scenario_id)
        if manifest is None:
            raise OrbitGuardError(404, "scenario_not_found", f"Scenario '{scenario_id}' was not found.")
        return manifest
