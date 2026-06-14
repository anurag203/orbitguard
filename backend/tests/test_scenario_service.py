from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.errors import OrbitGuardError
from app.models.scenario import ScenarioRunRequest
from app.services.scenario_service import ScenarioService


def manifest() -> dict:
    return {
        "scenario_id": "unit-scenario",
        "title": "Unit Scenario",
        "mode": "offline-fixture",
        "status": "test",
        "hero": False,
        "description": "test scenario",
        "catalog_id": "demo-protect-isro",
        "protected_object_id": "isro-cartosat-2f",
        "run_id": "unit-run-001",
        "top_conjunction_id": "unit-conjunction-001",
        "labels": ["deterministic"],
        "summary": "test summary",
        "events": [
            {
                "timestamp_offset_s": 0,
                "title": "Start",
                "description": "Start event",
                "focus": "isro-cartosat-2f"
            }
        ],
        "expected_outcome": {
            "primary_object_id": "isro-cartosat-2f",
            "secondary_object_id": "debris-demo-001",
            "plan_id": "unit-plan",
            "recommended_candidate_id": "unit-candidate",
            "secondary_status": "clear"
        },
        "demo_beats": ["Start"]
    }


def write_manifest(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_scenario_service_loads_manifest_from_fixture(tmp_path: Path) -> None:
    write_manifest(tmp_path / "unit-scenario.json", manifest())
    service = ScenarioService(scenario_dir=tmp_path)

    scenarios = service.list_scenarios().scenarios

    assert scenarios[0].scenario_id == "unit-scenario"


def test_scenario_service_rejects_empty_timeline(tmp_path: Path) -> None:
    payload = manifest()
    payload["events"] = []
    write_manifest(tmp_path / "unit-scenario.json", payload)
    service = ScenarioService(scenario_dir=tmp_path)

    with pytest.raises(OrbitGuardError) as exc_info:
        service.list_scenarios()

    assert exc_info.value.code == "scenario_timeline_empty"


def test_scenario_service_rejects_unsorted_timeline(tmp_path: Path) -> None:
    payload = manifest()
    payload["events"] = [
        {
            "timestamp_offset_s": 20,
            "title": "Second",
            "description": "Second event"
        },
        {
            "timestamp_offset_s": 10,
            "title": "First",
            "description": "First event"
        }
    ]
    write_manifest(tmp_path / "unit-scenario.json", payload)
    service = ScenarioService(scenario_dir=tmp_path)

    with pytest.raises(OrbitGuardError) as exc_info:
        service.list_scenarios()

    assert exc_info.value.code == "scenario_timeline_not_sorted"


def test_scenario_run_fails_when_protected_object_missing(tmp_path: Path) -> None:
    payload = manifest()
    payload["protected_object_id"] = "missing-object"
    write_manifest(tmp_path / "unit-scenario.json", payload)
    service = ScenarioService(scenario_dir=tmp_path)

    with pytest.raises(OrbitGuardError) as exc_info:
        service.run_scenario("unit-scenario", ScenarioRunRequest(deterministic=True))

    assert exc_info.value.code == "scenario_protected_object_missing"
