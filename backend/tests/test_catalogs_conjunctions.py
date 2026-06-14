from __future__ import annotations

from fastapi.testclient import TestClient


def test_catalogs_endpoint_returns_demo_snapshot(client: TestClient) -> None:
    response = client.get("/api/catalogs")

    assert response.status_code == 200
    catalogs = response.json()["catalogs"]
    by_id = {catalog["catalog_id"]: catalog for catalog in catalogs}
    assert {"demo-protect-isro", "demo-2009-replay", "demo-kessler-sandbox"} <= set(by_id)
    assert by_id["demo-protect-isro"]["object_count"] == 4
    assert by_id["demo-protect-isro"]["snapshot"] is True


def test_catalog_detail_returns_fixture_objects_and_watchlists(client: TestClient) -> None:
    response = client.get("/api/catalogs/demo-protect-isro")

    assert response.status_code == 200
    payload = response.json()
    assert payload["catalog"]["catalog_id"] == "demo-protect-isro"
    assert len(payload["objects"]) == 4
    assert payload["objects"][0]["tle"]["line1"].startswith("1 ")
    assert "protect-isro" in payload["watchlists"]


def test_missing_catalog_returns_structured_404(client: TestClient) -> None:
    response = client.get("/api/catalogs/missing-catalog")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "catalog_not_found"


def test_object_search_finds_isro_asset(client: TestClient) -> None:
    response = client.get("/api/objects/search", params={"q": "isro"})

    assert response.status_code == 200
    results = response.json()["results"]
    assert any(result["object_id"] == "isro-cartosat-2f" for result in results)


def test_object_search_finds_norad_id(client: TestClient) -> None:
    response = client.get("/api/objects/search", params={"q": "43111"})

    assert response.status_code == 200
    results = response.json()["results"]
    assert len(results) == 1
    assert results[0]["object_id"] == "isro-cartosat-2f"


def test_full_catalog_endpoint_supports_search_and_filters(client: TestClient) -> None:
    response = client.get(
        "/api/catalogs/full",
        params={"source": "fixture", "q": "isro", "owner": "isro", "orbit_class": "LEO", "limit": 20},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "offline-fixture"
    assert payload["returned_count"] >= 1
    assert all(result["owner"] == "ISRO" for result in payload["objects"])
    assert any(result["object_id"] == "isro-cartosat-2f" for result in payload["objects"])


def test_live_catalog_refresh_endpoint_returns_live_or_fallback_contract(client: TestClient, monkeypatch) -> None:
    def failing_fetcher(_url: str, _timeout: float) -> str:
        raise TimeoutError("offline in unit test")

    catalog = client.app.state.container.catalog
    catalog._live_snapshots.clear()
    monkeypatch.setattr(catalog, "_celestrak_fetcher", failing_fetcher)

    response = client.post("/api/catalogs/live/refresh", json={"group": "active", "limit": 5})

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "offline-fallback"
    assert payload["returned_count"] <= 5
    assert payload["catalog"]["object_count"] >= payload["returned_count"]
    assert payload["filters"]["group"] == "active"


def test_watchlist_returns_isro_assets(client: TestClient) -> None:
    response = client.get("/api/watchlists/protect-isro")

    assert response.status_code == 200
    payload = response.json()
    assert payload["watchlist_id"] == "protect-isro"
    assert {obj["owner"] for obj in payload["objects"]} == {"ISRO"}


def test_screening_returns_protect_isro_top_conjunction(client: TestClient) -> None:
    response = client.post("/api/conjunctions/screen", json={"scenario_id": "protect-isro", "step_seconds": 10})

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "sgp4-protagonist-vs-catalog"
    conjunctions = payload["conjunctions"]
    assert conjunctions[0]["conjunction_id"] == "conj-protect-isro-001"
    assert conjunctions[0]["risk"]["severity"] == "critical"
    assert conjunctions[0]["risk"]["miss_distance_m"] < 1_000
    assert conjunctions[0]["risk"]["pc"] > 0


def test_screening_returns_2009_replay_fixture_conjunction(client: TestClient) -> None:
    response = client.post("/api/conjunctions/screen", json={"scenario_id": "2009-replay", "step_seconds": 60})

    assert response.status_code == 200
    payload = response.json()
    conjunctions = payload["conjunctions"]
    assert conjunctions[0]["conjunction_id"] == "conj-2009-replay-001"
    assert conjunctions[0]["risk"]["severity"] == "critical"
    assert conjunctions[0]["secondary_object_id"] == "cosmos-2251-demo"


def test_screening_returns_kessler_sandbox_fixture_conjunction(client: TestClient) -> None:
    response = client.post("/api/conjunctions/screen", json={"scenario_id": "kessler-sandbox", "step_seconds": 60})

    assert response.status_code == 200
    payload = response.json()
    conjunctions = payload["conjunctions"]
    assert conjunctions[0]["conjunction_id"] == "conj-kessler-sandbox-001"
    assert conjunctions[0]["risk"]["severity"] == "warning"
    assert conjunctions[0]["secondary_object_id"] == "kessler-debris-cloud-demo"


def test_conjunction_detail_contains_assumptions(client: TestClient) -> None:
    response = client.get("/api/conjunctions/conj-protect-isro-001")

    assert response.status_code == 200
    payload = response.json()
    assert payload["conjunction_id"] == "conj-protect-isro-001"
    assert payload["assumptions"]
    assert payload["encounter_plane"]
    assert payload["pc_estimate"]["method"] == "2d-gaussian-small-hard-body-radius-approximation"
    assert payload["pc_estimate"]["covariance"]["model_id"] == "tle-demo-isotropic-300m"
    assert len(payload["relative_position_m"]) == 3
    assert len(payload["relative_velocity_vector_km_s"]) == 3


def test_final_round_fixture_detail_contains_warning_context(client: TestClient) -> None:
    response = client.get("/api/conjunctions/conj-2009-replay-001")

    assert response.status_code == 200
    payload = response.json()
    assert payload["pc_estimate"]["covariance"]["model_id"] == "historical-demo-isotropic-350m"
    assert payload["pc_estimate"]["warnings"]


def test_screening_can_return_no_candidates_for_strict_threshold(client: TestClient) -> None:
    response = client.post(
        "/api/conjunctions/screen",
        json={"scenario_id": "protect-isro", "step_seconds": 10, "coarse_threshold_m": 100},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["conjunctions"] == []
    assert "No conjunctions were found inside the configured screening threshold." in payload["warnings"]


def test_screening_defaults_to_protect_isro_context(client: TestClient) -> None:
    response = client.post("/api/conjunctions/screen", json={"step_seconds": 10})

    assert response.status_code == 200
    assert response.json()["conjunctions"][0]["conjunction_id"] == "conj-protect-isro-001"
