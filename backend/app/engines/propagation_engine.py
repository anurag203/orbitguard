from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sgp4.api import SGP4_ERRORS, Satrec, jday

from app.models.catalog import CatalogObject, TleRecord
from app.models.propagation import PropagationSeries, PropagationWarning, StateVector

logger = logging.getLogger("orbitguard.propagation")


@dataclass(frozen=True)
class TimeGrid:
    start: datetime
    end: datetime
    step_seconds: int
    times: list[datetime]


class PropagationEngine:
    def build_time_grid(self, start: datetime, end: datetime, step_seconds: int) -> TimeGrid:
        times: list[datetime] = []
        current = start
        step = timedelta(seconds=step_seconds)
        while current <= end:
            times.append(current)
            current += step

        if times[-1] != end:
            times.append(end)

        return TimeGrid(start=start, end=end, step_seconds=step_seconds, times=times)

    def propagate_object(self, obj: CatalogObject, times: list[datetime]) -> PropagationSeries:
        if obj.tle is None:
            return PropagationSeries(
                object_id=obj.object_id,
                name=obj.name,
                sample_count=0,
                status="missing-tle",
                states=[],
                warnings=[
                    PropagationWarning(
                        object_id=obj.object_id,
                        code="missing_tle",
                        message="Object has no TLE and cannot be propagated.",
                    )
                ],
            )

        try:
            satrec = self._satrec_from_tle(obj.tle)
        except (ValueError, IndexError) as exc:
            logger.warning("propagation.invalid_tle object=%s", obj.object_id)
            return PropagationSeries(
                object_id=obj.object_id,
                name=obj.name,
                sample_count=0,
                status="invalid-tle",
                states=[],
                warnings=[
                    PropagationWarning(
                        object_id=obj.object_id,
                        code="invalid_tle",
                        message=f"TLE could not be parsed: {exc}",
                    )
                ],
            )

        states: list[StateVector] = []
        warnings: list[PropagationWarning] = []
        for timestamp in times:
            error_code, position_km, velocity_km_s = self.state_at(satrec, timestamp)
            if error_code != 0:
                warnings.append(
                    PropagationWarning(
                        object_id=obj.object_id,
                        code=f"sgp4_error_{error_code}",
                        message=SGP4_ERRORS.get(error_code, "Unknown SGP4 propagation error."),
                        timestamp_utc=self.format_timestamp(timestamp),
                    )
                )
                continue

            states.append(
                StateVector(
                    timestamp_utc=self.format_timestamp(timestamp),
                    position_km=list(position_km),
                    velocity_km_s=list(velocity_km_s),
                )
            )

        status = "ok" if states and not warnings else "warning" if states else "failed"
        if warnings:
            logger.warning(
                "propagation.sgp4_warnings object=%s count=%s status=%s",
                obj.object_id,
                len(warnings),
                status,
            )
        return PropagationSeries(
            object_id=obj.object_id,
            name=obj.name,
            sample_count=len(states),
            status=status,
            states=states,
            warnings=warnings,
        )

    def propagate_batch(self, objects: list[CatalogObject], times: list[datetime]) -> list[PropagationSeries]:
        return [self.propagate_object(obj, times) for obj in objects]

    def state_at(self, satrec: Satrec, timestamp: datetime) -> tuple[int, tuple[float, float, float], tuple[float, float, float]]:
        timestamp = timestamp.astimezone(UTC)
        seconds = timestamp.second + timestamp.microsecond / 1_000_000
        jd, fraction = jday(
            timestamp.year,
            timestamp.month,
            timestamp.day,
            timestamp.hour,
            timestamp.minute,
            seconds,
        )
        return satrec.sgp4(jd, fraction)

    def _satrec_from_tle(self, tle: TleRecord) -> Satrec:
        return Satrec.twoline2rv(tle.line1, tle.line2)

    def format_timestamp(self, timestamp: datetime) -> str:
        return timestamp.astimezone(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
