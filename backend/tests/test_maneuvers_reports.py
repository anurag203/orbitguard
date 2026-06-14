from __future__ import annotations

from fastapi.testclient import TestClient


def test_maneuver_plan_requires_conjunction_id(client: TestClient) -> None:
    response = client.post("/api/maneuvers/plan", json={})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_maneuver_plan_returns_recommendation(client: TestClient) -> None:
    response = client.post("/api/maneuvers/plan", json={"conjunction_id": "conj-protect-isro-001"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["plan_id"] == "maneuver-plan-protect-isro-001"
    assert payload["status"] == "recommended"
    assert payload["recommendation"]["candidate_id"] == "mnv-protect-isro-a"
    assert payload["recommendation"]["delta_v_m_s"] == 0.12
    assert payload["recommendation"]["predicted_risk"]["miss_distance_m"] >= 8_000
    assert payload["predicted_after"]["pc"] < payload["before"]["pc"]
    assert payload["requires_secondary_screening"] is True
    assert payload["candidate_count"] > 1
    assert payload["assumptions"]


def test_maneuver_plan_supports_2009_replay_fixture(client: TestClient) -> None:
    response = client.post("/api/maneuvers/plan", json={"conjunction_id": "conj-2009-replay-001"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["plan_id"] == "maneuver-plan-2009-replay-001"
    assert payload["recommendation"]["candidate_id"] == "mnv-2009-replay-a"
    assert payload["predicted_after"]["pc"] < payload["before"]["pc"]


def test_maneuver_plan_supports_kessler_sandbox_fixture(client: TestClient) -> None:
    response = client.post("/api/maneuvers/plan", json={"conjunction_id": "conj-kessler-sandbox-001"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["plan_id"] == "maneuver-plan-kessler-sandbox-001"
    assert payload["candidate_count"] > 1
    assert payload["predicted_after"]["miss_distance_m"] > payload["before"]["miss_distance_m"]


def test_maneuver_plan_can_return_no_safe_plan(client: TestClient) -> None:
    response = client.post(
        "/api/maneuvers/plan",
        json={"conjunction_id": "conj-protect-isro-001", "max_delta_v_m_s": 0.08},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "no-safe-plan"
    assert payload["recommendation"] is None
    assert payload["requires_secondary_screening"] is False
    assert payload["warnings"]


def test_apply_maneuver_returns_secondary_clear(client: TestClient) -> None:
    response = client.post(
        "/api/maneuvers/apply",
        json={"plan_id": "maneuver-plan-protect-isro-001", "candidate_id": "mnv-protect-isro-a"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["secondary_status"] == "clear"
    assert payload["secondary"]["status"] == "clear"
    assert payload["screened_object_count"] == 3
    assert payload["after"]["miss_distance_m"] > payload["before"]["miss_distance_m"]


def test_report_generation_and_retrieval(client: TestClient) -> None:
    create_response = client.post(
        "/api/reports",
        json={
            "scenario_run_id": "scenario-run-protect-isro-001",
            "conjunction_id": "conj-protect-isro-001",
            "plan_id": "maneuver-plan-protect-isro-001",
            "candidate_id": "mnv-protect-isro-a",
        },
    )

    assert create_response.status_code == 200
    report_id = create_response.json()["report_id"]

    get_response = client.get(f"/api/reports/{report_id}")
    assert get_response.status_code == 200
    payload = get_response.json()
    assert payload["report_id"] == report_id
    assert payload["briefing"]["headline"]
    assert payload["source_ids"]["candidate_id"] == "mnv-protect-isro-a"
    assert payload["sections"]
    assert payload["assumptions"]
