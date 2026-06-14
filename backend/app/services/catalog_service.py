from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.request
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

from pydantic import ValidationError

from app.core.config import settings
from app.core.errors import OrbitGuardError
from app.core.paths import project_root
from app.models.catalog import (
    CatalogDetailResponse,
    CatalogListResponse,
    CatalogObject,
    CatalogSummary,
    CatalogSnapshot,
    CatalogWorkbenchResponse,
    ObjectSearchResponse,
    TleRecord,
    WatchlistResponse,
)


PROJECT_ROOT = project_root()
DEFAULT_CATALOG_DIR = PROJECT_ROOT / "data" / "catalogs"
CELESTRAK_GROUP_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=tle"

logger = logging.getLogger("orbitguard.catalog")


class CatalogService:
    def __init__(
        self,
        catalog_dir: Path | None = None,
        celestrak_fetcher: Callable[[str, float], str] | None = None,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self._catalog_dir = catalog_dir or DEFAULT_CATALOG_DIR
        self._snapshots: dict[str, CatalogSnapshot] | None = None
        self._live_snapshots: dict[str, CatalogSnapshot] = {}
        self._celestrak_fetcher = celestrak_fetcher or self._fetch_url
        # Injectable clock keeps live-fetch timestamps deterministic in tests;
        # offline/fixture mode is already deterministic, so the hero demo is unaffected.
        self._clock = clock or (lambda: datetime.now(UTC))

    def list_catalogs(self) -> CatalogListResponse:
        snapshots = self._load_snapshots()
        return CatalogListResponse(catalogs=[snapshot.catalog for snapshot in snapshots.values()])

    def load_catalog(self, catalog_id: str) -> CatalogDetailResponse:
        snapshot = self._get_snapshot(catalog_id)
        return CatalogDetailResponse(catalog=snapshot.catalog, objects=snapshot.objects, watchlists=snapshot.watchlists)

    def search_objects(self, query: str) -> ObjectSearchResponse:
        normalized = query.strip().lower()
        objects = self._all_objects()
        if not normalized:
            return ObjectSearchResponse(query=query, results=objects)

        results = [
            obj
            for obj in objects
            if self._matches_query(obj, normalized)
        ]
        return ObjectSearchResponse(query=query, results=results)

    def refresh_live_catalog(self, group: str = "active", limit: int = 120) -> CatalogWorkbenchResponse:
        group_id = self._normalize_celestrak_group(group)
        source_url = CELESTRAK_GROUP_URL.format(group=group_id)
        warnings: list[str] = []

        try:
            text = self._celestrak_fetcher(source_url, settings.celestrak_timeout_s)
            snapshot = self._snapshot_from_celestrak_tle(group_id, text, limit)
            self._live_snapshots[group_id] = snapshot
            objects = snapshot.objects[:limit]
            logger.info(
                "catalog.celestrak_fetch group=%s returned=%s",
                group_id,
                len(snapshot.objects),
            )
            return CatalogWorkbenchResponse(
                mode="live-celestrak",
                source="CelesTrak",
                source_url=source_url,
                fetched_at_utc=snapshot.catalog.fetched_at_utc,
                catalog=snapshot.catalog,
                objects=objects,
                total_count=len(snapshot.objects),
                returned_count=len(objects),
                filters={"source": "live", "group": group_id, "limit": limit},
                warnings=warnings,
            )
        except (OSError, urllib.error.URLError, TimeoutError, ValueError) as exc:
            fallback = self._fixture_full_snapshot()
            objects = fallback.objects[:limit]
            warnings.append(
                f"Live CelesTrak refresh failed, using committed offline fixtures instead: {type(exc).__name__}."
            )
            logger.warning(
                "catalog.celestrak_fallback group=%s reason=%s",
                group_id,
                type(exc).__name__,
            )
            return CatalogWorkbenchResponse(
                mode="offline-fallback",
                source="Committed fixtures",
                source_url=source_url,
                fetched_at_utc=fallback.catalog.fetched_at_utc,
                catalog=fallback.catalog,
                objects=objects,
                total_count=len(fallback.objects),
                returned_count=len(objects),
                filters={"source": "live", "group": group_id, "limit": limit},
                warnings=warnings,
            )

    def full_catalog(
        self,
        source: str = "fixture",
        query: str = "",
        owner: str = "",
        object_type: str = "",
        orbit_class: str = "",
        limit: int = 80,
        group: str = "active",
    ) -> CatalogWorkbenchResponse:
        if source == "live":
            group_id = self._normalize_celestrak_group(group)
            snapshot = self._live_snapshots.get(group_id)
            warnings: list[str] = []
            if snapshot is None:
                refreshed = self.refresh_live_catalog(group=group_id, limit=max(limit, 120))
                if refreshed.mode != "live-celestrak":
                    return self._filtered_workbench_response(
                        mode=refreshed.mode,
                        source=refreshed.source,
                        source_url=refreshed.source_url,
                        fetched_at_utc=refreshed.fetched_at_utc,
                        catalog=refreshed.catalog,
                        objects=refreshed.objects,
                        query=query,
                        owner=owner,
                        object_type=object_type,
                        orbit_class=orbit_class,
                        limit=limit,
                        group=group_id,
                        warnings=refreshed.warnings,
                    )
                snapshot = self._live_snapshots[group_id]
            return self._filtered_workbench_response(
                mode="live-celestrak",
                source="CelesTrak",
                source_url=CELESTRAK_GROUP_URL.format(group=group_id),
                fetched_at_utc=snapshot.catalog.fetched_at_utc,
                catalog=snapshot.catalog,
                objects=snapshot.objects,
                query=query,
                owner=owner,
                object_type=object_type,
                orbit_class=orbit_class,
                limit=limit,
                group=group_id,
                warnings=warnings,
            )

        if source != "fixture":
            raise OrbitGuardError(400, "catalog_source_invalid", "Catalog source must be 'fixture' or 'live'.")

        snapshot = self._fixture_full_snapshot()
        return self._filtered_workbench_response(
            mode="offline-fixture",
            source="Committed fixtures",
            source_url=snapshot.catalog.source_url,
            fetched_at_utc=snapshot.catalog.fetched_at_utc,
            catalog=snapshot.catalog,
            objects=snapshot.objects,
            query=query,
            owner=owner,
            object_type=object_type,
            orbit_class=orbit_class,
            limit=limit,
            group=None,
            warnings=[],
        )

    def get_object(self, object_id: str) -> CatalogObject | None:
        return next((obj for obj in self._all_objects() if obj.object_id == object_id), None)

    def get_watchlist(self, watchlist_id: str) -> WatchlistResponse:
        snapshots = self._load_snapshots()
        object_ids: list[str] = []
        for snapshot in snapshots.values():
            object_ids.extend(snapshot.watchlists.get(watchlist_id, []))

        if not object_ids:
            raise OrbitGuardError(404, "watchlist_not_found", f"Watchlist '{watchlist_id}' was not found.")

        objects_by_id = {obj.object_id: obj for obj in self._all_objects()}
        objects = [objects_by_id[object_id] for object_id in object_ids if object_id in objects_by_id]
        return WatchlistResponse(watchlist_id=watchlist_id, objects=objects)

    def _load_snapshots(self) -> dict[str, CatalogSnapshot]:
        if self._snapshots is not None:
            return self._snapshots

        if not self._catalog_dir.exists():
            raise OrbitGuardError(
                500,
                "catalog_directory_missing",
                "Catalog fixture directory is missing.",
                {"directory": str(self._catalog_dir.name)},
            )

        snapshots: dict[str, CatalogSnapshot] = {}
        for path in sorted(self._catalog_dir.glob("*.json")):
            snapshot = self._load_snapshot_file(path)
            snapshots[snapshot.catalog.catalog_id] = snapshot

        if not snapshots:
            raise OrbitGuardError(500, "catalog_fixtures_missing", "No catalog fixture files were found.")

        self._snapshots = snapshots
        logger.info("catalog.fixtures_loaded count=%s", len(snapshots))
        return snapshots

    def _load_snapshot_file(self, path: Path) -> CatalogSnapshot:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            snapshot = CatalogSnapshot.model_validate(data)
        except json.JSONDecodeError as exc:
            raise OrbitGuardError(
                500,
                "catalog_fixture_invalid_json",
                f"Catalog fixture '{path.name}' is not valid JSON.",
                {"line": exc.lineno, "column": exc.colno},
            ) from exc
        except ValidationError as exc:
            raise OrbitGuardError(
                500,
                "catalog_fixture_invalid_schema",
                f"Catalog fixture '{path.name}' does not match the expected schema.",
                {"errors": exc.errors()},
            ) from exc

        self._validate_snapshot(snapshot, path.name)
        return snapshot

    def _validate_snapshot(self, snapshot: CatalogSnapshot, file_name: str) -> None:
        actual_count = len(snapshot.objects)
        if snapshot.catalog.object_count != actual_count:
            raise OrbitGuardError(
                500,
                "catalog_object_count_mismatch",
                f"Catalog '{snapshot.catalog.catalog_id}' object count does not match fixture contents.",
                {"file": file_name, "declared": snapshot.catalog.object_count, "actual": actual_count},
            )

        seen_ids: set[str] = set()
        for index, obj in enumerate(snapshot.objects, start=1):
            if obj.object_id in seen_ids:
                raise OrbitGuardError(
                    500,
                    "catalog_duplicate_object_id",
                    f"Catalog '{snapshot.catalog.catalog_id}' contains duplicate object ID '{obj.object_id}'.",
                    {"file": file_name, "object_index": index},
                )
            seen_ids.add(obj.object_id)
            self._validate_tle(snapshot.catalog.catalog_id, obj, index)

        known_ids = {obj.object_id for obj in snapshot.objects}
        for watchlist_id, object_ids in snapshot.watchlists.items():
            missing_ids = [object_id for object_id in object_ids if object_id not in known_ids]
            if missing_ids:
                raise OrbitGuardError(
                    500,
                    "catalog_watchlist_invalid",
                    f"Watchlist '{watchlist_id}' references unknown object IDs.",
                    {"catalog_id": snapshot.catalog.catalog_id, "missing_object_ids": missing_ids},
                )

    def _validate_tle(self, catalog_id: str, obj: CatalogObject, object_index: int) -> None:
        if obj.tle is None:
            return

        if not obj.tle.line1.startswith("1 ") or not obj.tle.line2.startswith("2 "):
            raise OrbitGuardError(
                500,
                "catalog_tle_invalid",
                f"Object '{obj.object_id}' has malformed TLE lines.",
                {"catalog_id": catalog_id, "object_index": object_index},
            )

        line1_norad = obj.tle.line1[2:7].strip()
        line2_norad = obj.tle.line2[2:7].strip()
        if obj.norad_id and (line1_norad != obj.norad_id or line2_norad != obj.norad_id):
            raise OrbitGuardError(
                500,
                "catalog_tle_norad_mismatch",
                f"Object '{obj.object_id}' TLE NORAD IDs do not match object metadata.",
                {
                    "catalog_id": catalog_id,
                    "object_index": object_index,
                    "metadata_norad_id": obj.norad_id,
                    "line1_norad_id": line1_norad,
                    "line2_norad_id": line2_norad,
                },
            )

    def _get_snapshot(self, catalog_id: str) -> CatalogSnapshot:
        snapshots = self._load_snapshots()
        snapshot = snapshots.get(catalog_id)
        if snapshot is None:
            raise OrbitGuardError(404, "catalog_not_found", f"Catalog '{catalog_id}' was not found.")
        return snapshot

    def _all_objects(self) -> list[CatalogObject]:
        objects: list[CatalogObject] = []
        for snapshot in self._load_snapshots().values():
            objects.extend(snapshot.objects)
        return sorted(objects, key=lambda obj: obj.name)

    def _matches_query(self, obj: CatalogObject, normalized: str) -> bool:
        searchable_values = [
            obj.name,
            obj.norad_id or "",
            obj.owner or "",
            obj.object_type,
            obj.orbit_class or "",
            obj.source_catalog or "",
            *obj.tags,
        ]
        return any(normalized in value.lower() for value in searchable_values)

    def _fetch_url(self, url: str, timeout: float) -> str:
        request = urllib.request.Request(url, headers={"User-Agent": "OrbitGuard-Hackathon/1.0"})
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read().decode("utf-8")

    def _normalize_celestrak_group(self, group: str) -> str:
        normalized = group.strip().lower()
        if not re.fullmatch(r"[a-z0-9_-]{1,48}", normalized):
            raise OrbitGuardError(400, "celestrak_group_invalid", "CelesTrak group contains unsupported characters.")
        return normalized

    def _snapshot_from_celestrak_tle(self, group: str, text: str, limit: int) -> CatalogSnapshot:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        objects: list[CatalogObject] = []
        index = 0
        while index + 2 < len(lines) and len(objects) < limit:
            name = lines[index]
            line1 = lines[index + 1]
            line2 = lines[index + 2]
            if name.startswith(("1 ", "2 ")) or not line1.startswith("1 ") or not line2.startswith("2 "):
                index += 1
                continue

            clean_name = name[2:].strip() if name.startswith("0 ") else name
            norad_id = line1[2:7].strip()
            objects.append(
                CatalogObject(
                    object_id=f"celestrak-{norad_id}",
                    name=clean_name,
                    norad_id=norad_id,
                    owner=None,
                    object_type="satellite",
                    orbit_class=self._estimate_orbit_class(line2),
                    source_catalog=f"celestrak-{group}",
                    tags=["celestrak", group, "live-tle"],
                    tle=TleRecord(line1=line1, line2=line2),
                )
            )
            index += 3

        if not objects:
            raise ValueError("CelesTrak response did not contain parseable TLE triplets.")

        fetched_at = self._clock().replace(microsecond=0).isoformat().replace("+00:00", "Z")
        catalog = CatalogSummary(
            catalog_id=f"celestrak-{group}",
            name=f"CelesTrak {group.upper()} Live TLE",
            source="CelesTrak GP",
            source_url=CELESTRAK_GROUP_URL.format(group=group),
            fetched_at_utc=fetched_at,
            object_count=len(objects),
            snapshot=False,
            notes="Live TLE refresh. Use for situational awareness only; no operational covariance is included.",
        )
        snapshot = CatalogSnapshot(catalog=catalog, objects=objects, watchlists={})
        self._validate_snapshot(snapshot, "celestrak-live-response")
        return snapshot

    def _estimate_orbit_class(self, line2: str) -> str | None:
        try:
            mean_motion = float(line2[52:63])
        except ValueError:
            return None
        if mean_motion >= 11.25:
            return "LEO"
        if 0.9 <= mean_motion <= 1.1:
            return "GEO"
        if 1.1 < mean_motion < 11.25:
            return "MEO"
        return "HEO"

    def _fixture_full_snapshot(self) -> CatalogSnapshot:
        snapshots = self._load_snapshots()
        objects: list[CatalogObject] = []
        fetched_at_values: list[str] = []
        for snapshot in snapshots.values():
            objects.extend(snapshot.objects)
            if snapshot.catalog.fetched_at_utc:
                fetched_at_values.append(snapshot.catalog.fetched_at_utc)

        catalog = CatalogSummary(
            catalog_id="fixture-full-catalog",
            name="OrbitGuard Offline Catalog Union",
            source="Committed fixtures",
            source_url=None,
            fetched_at_utc=max(fetched_at_values) if fetched_at_values else None,
            object_count=len(objects),
            snapshot=True,
            notes="Union of committed scenario catalogs used for deterministic judging and offline replay.",
        )
        return CatalogSnapshot(catalog=catalog, objects=sorted(objects, key=lambda obj: obj.name), watchlists={})

    def _filtered_workbench_response(
        self,
        *,
        mode: str,
        source: str,
        source_url: str | None,
        fetched_at_utc: str | None,
        catalog: CatalogSummary,
        objects: list[CatalogObject],
        query: str,
        owner: str,
        object_type: str,
        orbit_class: str,
        limit: int,
        group: str | None,
        warnings: list[str],
    ) -> CatalogWorkbenchResponse:
        filtered = self._filter_objects(objects, query=query, owner=owner, object_type=object_type, orbit_class=orbit_class)
        returned = filtered[:limit]
        return CatalogWorkbenchResponse(
            mode=mode,
            source=source,
            source_url=source_url,
            fetched_at_utc=fetched_at_utc,
            catalog=catalog.model_copy(update={"object_count": len(objects)}),
            objects=returned,
            total_count=len(filtered),
            returned_count=len(returned),
            filters={
                "source": "live" if mode == "live-celestrak" else "fixture",
                "group": group,
                "query": query or None,
                "owner": owner or None,
                "object_type": object_type or None,
                "orbit_class": orbit_class or None,
                "limit": limit,
            },
            warnings=warnings,
        )

    def _filter_objects(
        self,
        objects: list[CatalogObject],
        *,
        query: str,
        owner: str,
        object_type: str,
        orbit_class: str,
    ) -> list[CatalogObject]:
        normalized_query = query.strip().lower()
        normalized_owner = owner.strip().lower()
        normalized_type = object_type.strip().lower()
        normalized_orbit = orbit_class.strip().lower()
        filtered = []
        for obj in sorted(objects, key=lambda item: item.name):
            if normalized_query and not self._matches_query(obj, normalized_query):
                continue
            if normalized_owner and normalized_owner not in (obj.owner or "").lower():
                continue
            if normalized_type and normalized_type != obj.object_type.lower():
                continue
            if normalized_orbit and normalized_orbit != (obj.orbit_class or "").lower():
                continue
            filtered.append(obj)
        return filtered
