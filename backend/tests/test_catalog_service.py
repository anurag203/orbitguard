from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.errors import OrbitGuardError
from app.services.catalog_service import CatalogService


def write_fixture(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def valid_fixture() -> dict:
    return {
        "catalog": {
            "catalog_id": "unit-test-catalog",
            "name": "Unit Test Catalog",
            "source": "test",
            "source_url": None,
            "fetched_at_utc": "2026-06-13T00:00:00Z",
            "object_count": 1,
            "snapshot": True,
            "notes": "test fixture",
        },
        "objects": [
            {
                "object_id": "test-object",
                "name": "TEST OBJECT",
                "norad_id": "12345",
                "owner": "Test",
                "object_type": "satellite",
                "orbit_class": "LEO",
                "source_catalog": "unit-test-catalog",
                "tags": ["test"],
                "tle": {
                    "line1": "1 12345U 26001A   26164.12500000  .00000100  00000+0  10000-4 0  9991",
                    "line2": "2 12345  98.0000 140.0000 0015000 100.0000 260.0000 14.20000000123458",
                },
            }
        ],
        "watchlists": {"test-watchlist": ["test-object"]},
    }


def test_fixture_backed_service_loads_catalog(tmp_path: Path) -> None:
    write_fixture(tmp_path / "catalog.json", valid_fixture())
    service = CatalogService(catalog_dir=tmp_path)

    catalog = service.load_catalog("unit-test-catalog")

    assert catalog.catalog.catalog_id == "unit-test-catalog"
    assert catalog.objects[0].object_id == "test-object"
    assert service.get_watchlist("test-watchlist").objects[0].object_id == "test-object"


def test_fixture_object_count_mismatch_is_rejected(tmp_path: Path) -> None:
    payload = valid_fixture()
    payload["catalog"]["object_count"] = 2
    write_fixture(tmp_path / "catalog.json", payload)
    service = CatalogService(catalog_dir=tmp_path)

    with pytest.raises(OrbitGuardError) as exc_info:
        service.list_catalogs()

    assert exc_info.value.code == "catalog_object_count_mismatch"


def test_fixture_tle_norad_mismatch_is_rejected(tmp_path: Path) -> None:
    payload = valid_fixture()
    payload["objects"][0]["tle"]["line2"] = "2 54321  98.0000 140.0000 0015000 100.0000 260.0000 14.20000000123458"
    write_fixture(tmp_path / "catalog.json", payload)
    service = CatalogService(catalog_dir=tmp_path)

    with pytest.raises(OrbitGuardError) as exc_info:
        service.list_catalogs()

    assert exc_info.value.code == "catalog_tle_norad_mismatch"


def test_fixture_watchlist_unknown_object_is_rejected(tmp_path: Path) -> None:
    payload = valid_fixture()
    payload["watchlists"] = {"broken": ["missing-object"]}
    write_fixture(tmp_path / "catalog.json", payload)
    service = CatalogService(catalog_dir=tmp_path)

    with pytest.raises(OrbitGuardError) as exc_info:
        service.list_catalogs()

    assert exc_info.value.code == "catalog_watchlist_invalid"


def test_live_celestrak_refresh_parses_tle_triplets(tmp_path: Path) -> None:
    write_fixture(tmp_path / "catalog.json", valid_fixture())
    sample_tle = "\n".join(
        [
            "ISS (ZARYA)",
            "1 25544U 98067A   26164.50000000  .00016717  00000+0  30563-3 0  9991",
            "2 25544  51.6416 222.8824 0006703 130.5360 325.0288 15.50000000450000",
            "NOAA 19",
            "1 33591U 09005A   26164.25000000  .00000100  00000+0  10000-4 0  9991",
            "2 33591  99.1944 203.9210 0014000 250.0000 110.0000 14.12400000123451",
        ]
    )
    service = CatalogService(catalog_dir=tmp_path, celestrak_fetcher=lambda _url, _timeout: sample_tle)

    response = service.refresh_live_catalog(group="active", limit=10)

    assert response.mode == "live-celestrak"
    assert response.catalog.snapshot is False
    assert response.total_count == 2
    assert response.objects[0].object_id == "celestrak-25544"
    assert response.objects[0].orbit_class == "LEO"
    assert response.warnings == []


def test_live_celestrak_refresh_falls_back_to_fixtures(tmp_path: Path) -> None:
    write_fixture(tmp_path / "catalog.json", valid_fixture())

    def failing_fetcher(_url: str, _timeout: float) -> str:
        raise TimeoutError("network unavailable")

    service = CatalogService(catalog_dir=tmp_path, celestrak_fetcher=failing_fetcher)

    response = service.refresh_live_catalog(group="active", limit=5)

    assert response.mode == "offline-fallback"
    assert response.source == "Committed fixtures"
    assert response.objects[0].object_id == "test-object"
    assert response.warnings


def test_full_catalog_filters_fixture_union(tmp_path: Path) -> None:
    write_fixture(tmp_path / "catalog.json", valid_fixture())
    service = CatalogService(catalog_dir=tmp_path)

    response = service.full_catalog(query="12345", orbit_class="LEO", limit=10)

    assert response.mode == "offline-fixture"
    assert response.total_count == 1
    assert response.objects[0].name == "TEST OBJECT"
