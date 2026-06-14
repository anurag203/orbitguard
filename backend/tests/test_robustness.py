from __future__ import annotations

import logging

from fastapi.testclient import TestClient

from app.dependencies import get_demo_service
from app.main import create_app
from app.services.demo_service import DemoService


def test_unhandled_exception_returns_structured_500() -> None:
    app = create_app()

    @app.get("/api/_boom")
    def _boom() -> None:
        raise RuntimeError("kaboom")

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/api/_boom")

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "internal_error"
    assert "kaboom" not in response.text  # real error is logged, never leaked


def test_ready_endpoint_reports_ready_on_real_tree(client: TestClient) -> None:
    response = client.get("/api/ready")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ready"
    assert payload["missing_required_count"] == 0


def test_ready_endpoint_reports_not_ready_when_fixtures_missing(tmp_path) -> None:
    app = create_app()
    app.dependency_overrides[get_demo_service] = lambda: DemoService(root=tmp_path)
    client = TestClient(app)

    response = client.get("/api/ready")

    assert response.status_code == 503
    payload = response.json()
    assert payload["status"] != "ready"
    assert payload["missing_required_count"] > 0


def test_generalized_apply_2009_replay(client: TestClient) -> None:
    response = client.post(
        "/api/maneuvers/apply",
        json={"plan_id": "maneuver-plan-2009-replay-001", "candidate_id": "mnv-2009-replay-a"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["plan_id"] == "maneuver-plan-2009-replay-001"
    assert payload["candidate_id"] == "mnv-2009-replay-a"
    assert payload["secondary_status"] in {"clear", "warning"}


def test_generalized_apply_kessler_increases_miss_distance(client: TestClient) -> None:
    response = client.post(
        "/api/maneuvers/apply",
        json={"plan_id": "maneuver-plan-kessler-sandbox-001", "candidate_id": "mnv-kessler-sandbox-a"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["after"]["miss_distance_m"] > payload["before"]["miss_distance_m"]


def test_apply_rejects_wrong_candidate_and_unknown_plan(client: TestClient) -> None:
    wrong_candidate = client.post(
        "/api/maneuvers/apply",
        json={"plan_id": "maneuver-plan-protect-isro-001", "candidate_id": "mnv-protect-isro-zzz"},
    )
    assert wrong_candidate.status_code == 422
    assert wrong_candidate.json()["error"]["code"] == "candidate_not_recommended"

    unknown_plan = client.post(
        "/api/maneuvers/apply",
        json={"plan_id": "maneuver-plan-does-not-exist-001", "candidate_id": "mnv-anything-a"},
    )
    assert unknown_plan.status_code == 404
    assert unknown_plan.json()["error"]["code"] == "plan_not_found"


def test_generalized_report_for_2009_and_kessler(client: TestClient) -> None:
    cases = [
        (
            "conj-2009-replay-001",
            "maneuver-plan-2009-replay-001",
            "mnv-2009-replay-a",
            "report-2009-replay-001",
            "2009 Iridium-Cosmos Replay",
        ),
        (
            "conj-kessler-sandbox-001",
            "maneuver-plan-kessler-sandbox-001",
            "mnv-kessler-sandbox-a",
            "report-kessler-sandbox-001",
            "Kessler Sandbox",
        ),
    ]
    for conjunction_id, plan_id, candidate_id, expected_report_id, title_fragment in cases:
        created = client.post(
            "/api/reports",
            json={
                "scenario_run_id": "scenario-run-demo",
                "conjunction_id": conjunction_id,
                "plan_id": plan_id,
                "candidate_id": candidate_id,
            },
        )
        assert created.status_code == 200
        assert created.json()["report_id"] == expected_report_id

        fetched = client.get(f"/api/reports/{expected_report_id}")
        assert fetched.status_code == 200
        assert title_fragment in fetched.json()["title"]


def test_dynamic_conjunction_get_after_screen(client: TestClient) -> None:
    screen = client.post(
        "/api/conjunctions/screen",
        json={"scenario_id": "protect-isro", "step_seconds": 10},
    )
    assert screen.status_code == 200
    conjunction_id = screen.json()["conjunctions"][0]["conjunction_id"]

    detail = client.get(f"/api/conjunctions/{conjunction_id}")
    assert detail.status_code == 200
    payload = detail.json()
    assert payload["conjunction_id"] == conjunction_id
    assert payload["pc_estimate"]
    assert len(payload["relative_position_m"]) == 3


def test_computation_mode_reports_sgp4_and_fixture_fallback(client: TestClient) -> None:
    sgp4 = client.post(
        "/api/conjunctions/screen",
        json={"scenario_id": "protect-isro", "step_seconds": 10},
    )
    assert sgp4.status_code == 200
    assert sgp4.json()["computation_mode"] == "sgp4"

    fallback = client.post(
        "/api/conjunctions/screen",
        json={"scenario_id": "kessler-sandbox", "step_seconds": 60},
    )
    assert fallback.status_code == 200
    assert fallback.json()["computation_mode"] == "fixture-fallback"


def test_boundary_logging_emits_orbitguard_info(client: TestClient, caplog) -> None:
    # The "orbitguard" logger sets propagate=False, so attach caplog's handler directly
    # to it to capture the boundary log records emitted by the child service loggers.
    orbit_logger = logging.getLogger("orbitguard")
    previous_level = orbit_logger.level
    orbit_logger.addHandler(caplog.handler)
    orbit_logger.setLevel(logging.INFO)
    try:
        response = client.post(
            "/api/conjunctions/screen",
            json={"scenario_id": "protect-isro", "step_seconds": 10},
        )
        assert response.status_code == 200
    finally:
        orbit_logger.removeHandler(caplog.handler)
        orbit_logger.setLevel(previous_level)

    assert any(
        record.name.startswith("orbitguard") and record.levelno == logging.INFO
        for record in caplog.records
    )
