from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.services.demo_service import DemoService


def test_demo_status_ready_when_required_fixtures_exist() -> None:
    status = DemoService().status()

    assert status.status == "ready"
    assert status.offline_mode is True
    assert status.default_flow_id == "protect-isro-round1"
    assert status.missing_required_count == 0
    assert all(check.status == "pass" for check in status.checks)


def test_demo_status_not_ready_when_required_fixtures_are_missing(tmp_path: Path) -> None:
    status = DemoService(root=tmp_path).status()

    assert status.status == "not-ready"
    assert status.missing_required_count > 0
    assert all(not check.detail.startswith("/") for check in status.checks)


def test_expected_demo_flow_loads_protect_isro_ids() -> None:
    flow = DemoService().expected_flow()

    assert flow.flow_id == "protect-isro-round1"
    assert flow.expected_top_conjunction_id == "conj-protect-isro-001"
    assert flow.expected_candidate_id == "mnv-protect-isro-a"
    assert "generate-report" in flow.steps


def test_demo_replay_matches_expected_backend_outputs() -> None:
    replay = DemoService().replay()

    assert replay.status == "passed"
    assert replay.checks
    assert all(check.status == "pass" for check in replay.checks)


def test_demo_api_status_and_replay(client: TestClient) -> None:
    status_response = client.get("/api/demo/status")
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "ready"

    replay_response = client.post("/api/demo/replay/protect-isro-round1")
    assert replay_response.status_code == 200
    assert replay_response.json()["status"] == "passed"
