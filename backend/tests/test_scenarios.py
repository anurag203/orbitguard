from __future__ import annotations

from fastapi.testclient import TestClient


def test_scenario_list_contains_required_scenarios(client: TestClient) -> None:
    response = client.get("/api/scenarios")

    assert response.status_code == 200
    scenario_ids = {scenario["scenario_id"] for scenario in response.json()["scenarios"]}
    assert {"protect-isro", "2009-replay", "kessler-sandbox"} <= scenario_ids


def test_protect_isro_run_is_deterministic(client: TestClient) -> None:
    response = client.post("/api/scenarios/protect-isro/run", json={"deterministic": True})

    assert response.status_code == 200
    payload = response.json()
    assert payload["scenario_id"] == "protect-isro"
    assert payload["run_id"] == "scenario-run-protect-isro-001"
    assert payload["top_conjunction_id"] == "conj-protect-isro-001"
    assert payload["catalog_id"] == "demo-protect-isro"
    assert payload["protected_object"]["owner"] == "ISRO"
    assert "deterministic" in payload["labels"]
    assert payload["expected_outcome"]["recommended_candidate_id"] == "mnv-protect-isro-a"
    assert payload["demo_beats"]


def test_2009_replay_run_returns_historical_context(client: TestClient) -> None:
    response = client.post("/api/scenarios/2009-replay/run", json={})

    assert response.status_code == 200
    payload = response.json()
    assert payload["scenario_id"] == "2009-replay"
    assert payload["catalog_id"] == "demo-2009-replay"
    assert payload["protected_object"]["object_id"] == "iridium-33-demo"
    assert "historical-context" in payload["labels"]


def test_kessler_sandbox_run_returns_debris_growth_timeline(client: TestClient) -> None:
    response = client.post("/api/scenarios/kessler-sandbox/run", json={})

    assert response.status_code == 200
    payload = response.json()
    assert payload["scenario_id"] == "kessler-sandbox"
    assert payload["catalog_id"] == "demo-kessler-sandbox"
    assert any(event["title"] == "Debris injection" for event in payload["events"])
    assert "simulated-debris-growth" in payload["labels"]


def test_unknown_scenario_returns_structured_404(client: TestClient) -> None:
    response = client.post("/api/scenarios/not-real/run", json={})

    assert response.status_code == 404
    payload = response.json()
    assert payload["error"]["code"] == "scenario_not_found"


def test_reset_returns_same_deterministic_run(client: TestClient) -> None:
    response = client.post("/api/scenarios/protect-isro/reset")

    assert response.status_code == 200
    assert response.json()["run_id"] == "scenario-run-protect-isro-001"


def test_timeline_endpoint_returns_sorted_events(client: TestClient) -> None:
    response = client.get("/api/scenarios/protect-isro/timeline")

    assert response.status_code == 200
    offsets = [event["timestamp_offset_s"] for event in response.json()]
    assert offsets == sorted(offsets)
