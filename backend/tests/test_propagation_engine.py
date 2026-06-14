from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.engines.propagation_engine import PropagationEngine
from app.models.catalog import CatalogObject, TleRecord
from app.services.catalog_service import CatalogService


def test_time_grid_includes_end_when_step_does_not_land_exactly() -> None:
    engine = PropagationEngine()
    start = datetime(2026, 6, 13, 0, 0, 0, tzinfo=UTC)
    end = start + timedelta(seconds=125)

    grid = engine.build_time_grid(start, end, 60)

    assert [engine.format_timestamp(item) for item in grid.times] == [
        "2026-06-13T00:00:00Z",
        "2026-06-13T00:01:00Z",
        "2026-06-13T00:02:00Z",
        "2026-06-13T00:02:05Z",
    ]


def test_engine_propagates_valid_catalog_tle() -> None:
    engine = PropagationEngine()
    obj = CatalogService().get_object("isro-cartosat-2f")
    assert obj is not None
    times = [datetime(2026, 6, 13, 0, 0, 0, tzinfo=UTC)]

    series = engine.propagate_object(obj, times)

    assert series.status == "ok"
    assert series.sample_count == 1
    assert series.states[0].timestamp_utc == "2026-06-13T00:00:00Z"
    assert len(series.states[0].position_km) == 3
    assert len(series.states[0].velocity_km_s) == 3


def test_engine_returns_object_warning_for_missing_tle() -> None:
    engine = PropagationEngine()
    obj = CatalogObject(
        object_id="no-tle",
        name="No TLE",
        object_type="satellite",
    )

    series = engine.propagate_object(obj, [datetime(2026, 6, 13, 0, 0, 0, tzinfo=UTC)])

    assert series.status == "missing-tle"
    assert series.sample_count == 0
    assert series.warnings[0].code == "missing_tle"


def test_engine_returns_warning_for_invalid_tle() -> None:
    engine = PropagationEngine()
    obj = CatalogObject(
        object_id="bad-tle",
        name="Bad TLE",
        object_type="satellite",
        tle=TleRecord(line1="bad", line2="tle"),
    )

    series = engine.propagate_object(obj, [datetime(2026, 6, 13, 0, 0, 0, tzinfo=UTC)])

    assert series.status in {"invalid-tle", "failed"}
    assert series.sample_count == 0
    assert series.warnings
