from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.core.errors import OrbitGuardError
from app.engines.propagation_engine import PropagationEngine
from app.models.catalog import CatalogObject
from app.models.propagation import PropagationRequest, PropagationResponse
from app.services.catalog_service import CatalogService


DEFAULT_START_TIME = datetime(2026, 6, 13, 0, 0, 0, tzinfo=UTC)
DEFAULT_WINDOW_SECONDS = 600
MAX_TIME_GRID_SAMPLES = 720


class PropagationService:
    def __init__(self, catalog_service: CatalogService | None = None, engine: PropagationEngine | None = None) -> None:
        self._catalog_service = catalog_service or CatalogService()
        self._engine = engine or PropagationEngine()

    def propagate(self, request: PropagationRequest) -> PropagationResponse:
        start, end = self._resolve_time_window(request)
        time_grid = self._engine.build_time_grid(start, end, request.step_seconds)
        if len(time_grid.times) > MAX_TIME_GRID_SAMPLES:
            raise OrbitGuardError(
                422,
                "propagation_time_grid_too_large",
                "Propagation request creates too many samples.",
                {
                    "sample_count": len(time_grid.times),
                    "max_samples": MAX_TIME_GRID_SAMPLES,
                    "step_seconds": request.step_seconds,
                },
            )

        objects, warnings = self._resolve_objects(request.object_ids)
        series = self._engine.propagate_batch(objects, time_grid.times)
        warnings.extend(
            f"{warning.object_id}: {warning.message}"
            for item in series
            for warning in item.warnings
        )

        return PropagationResponse(
            mode="sgp4",
            start_time_utc=self._engine.format_timestamp(start),
            end_time_utc=self._engine.format_timestamp(end),
            step_seconds=request.step_seconds,
            series=series,
            warnings=warnings,
        )

    def _resolve_time_window(self, request: PropagationRequest) -> tuple[datetime, datetime]:
        start = self._parse_time(request.start_time_utc) if request.start_time_utc else DEFAULT_START_TIME
        end = self._parse_time(request.end_time_utc) if request.end_time_utc else start + timedelta(seconds=DEFAULT_WINDOW_SECONDS)

        if end < start:
            raise OrbitGuardError(
                422,
                "propagation_invalid_time_window",
                "end_time_utc must be greater than or equal to start_time_utc.",
            )

        return start, end

    def _parse_time(self, value: str) -> datetime:
        try:
            normalized = value.replace("Z", "+00:00")
            parsed = datetime.fromisoformat(normalized)
        except ValueError as exc:
            raise OrbitGuardError(
                422,
                "propagation_invalid_timestamp",
                "Timestamp must be valid ISO 8601, for example 2026-06-13T00:00:00Z.",
                {"value": value},
            ) from exc

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)

        return parsed.astimezone(UTC)

    def _resolve_objects(self, object_ids: list[str]) -> tuple[list[CatalogObject], list[str]]:
        objects: list[CatalogObject] = []
        warnings: list[str] = []
        for object_id in object_ids:
            obj = self._catalog_service.get_object(object_id)
            if obj is None:
                warnings.append(f"{object_id}: object not found in catalog fixtures.")
                continue
            objects.append(obj)

        if not object_ids:
            warnings.append("No object_ids were provided; propagation returned no series.")

        return objects, warnings
