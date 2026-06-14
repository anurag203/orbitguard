from __future__ import annotations

import math

from fastapi.testclient import TestClient


def test_propagation_returns_state_vectors_for_catalog_object(client: TestClient) -> None:
    response = client.post("/api/propagate", json={"object_ids": ["isro-cartosat-2f"], "step_seconds": 60})

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "sgp4"
    assert payload["start_time_utc"] == "2026-06-13T00:00:00Z"
    assert payload["end_time_utc"] == "2026-06-13T00:10:00Z"
    assert payload["series"][0]["object_id"] == "isro-cartosat-2f"
    assert payload["series"][0]["status"] == "ok"
    assert payload["series"][0]["sample_count"] == 11
    first_state = payload["series"][0]["states"][0]
    assert len(first_state["position_km"]) == 3
    assert len(first_state["velocity_km_s"]) == 3
    assert all(math.isfinite(value) for value in first_state["position_km"])
    assert all(math.isfinite(value) for value in first_state["velocity_km_s"])


def test_propagation_accepts_explicit_time_window(client: TestClient) -> None:
    response = client.post(
        "/api/propagate",
        json={
            "object_ids": ["isro-cartosat-2f", "debris-demo-001"],
            "start_time_utc": "2026-06-13T00:00:00Z",
            "end_time_utc": "2026-06-13T00:02:00Z",
            "step_seconds": 60,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["series"]) == 2
    assert {series["sample_count"] for series in payload["series"]} == {3}


def test_propagation_unknown_object_returns_warning(client: TestClient) -> None:
    response = client.post("/api/propagate", json={"object_ids": ["missing-object"]})

    assert response.status_code == 200
    payload = response.json()
    assert payload["series"] == []
    assert "missing-object: object not found in catalog fixtures." in payload["warnings"]


def test_propagation_invalid_time_window_returns_422(client: TestClient) -> None:
    response = client.post(
        "/api/propagate",
        json={
            "object_ids": ["isro-cartosat-2f"],
            "start_time_utc": "2026-06-13T00:10:00Z",
            "end_time_utc": "2026-06-13T00:00:00Z",
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "propagation_invalid_time_window"


def test_propagation_excessive_time_grid_returns_422(client: TestClient) -> None:
    response = client.post(
        "/api/propagate",
        json={
            "object_ids": ["isro-cartosat-2f"],
            "start_time_utc": "2026-06-13T00:00:00Z",
            "end_time_utc": "2026-06-14T00:00:00Z",
            "step_seconds": 60,
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "propagation_time_grid_too_large"
