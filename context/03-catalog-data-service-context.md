# Catalog Data Service Context

## Current Status

Tested with live-refresh/fallback support.

## LLD Reference

`../architecture/03-catalog-data-service-lld.md`

## Implementation Scope

Implement TLE snapshot loading, object normalization, catalog metadata, object search, watchlists, scenario fixture loading, full-catalog filtering, and live CelesTrak refresh with offline fallback.

## Files Expected To Be Created Or Modified

- Backend catalog service module. Updated.
- Data fixture folders. Created `data/catalogs/`.
- Catalog parsing tests. Added.
- Live refresh endpoint and full catalog API. Added.

## Completed Work

- 2026-06-13: Context file created.
- 2026-06-13: Implemented fixture-backed catalog loading, catalog detail API, watchlist API, TLE/NORAD validation, object-count validation, watchlist validation, Protect ISRO fixture JSON, data folder docs, API tests, and unit tests for invalid fixtures.
- 2026-06-13: Added live CelesTrak TLE refresh mode, CelesTrak TLE triplet parsing, orbit-class estimation from mean motion, in-memory live snapshot cache, explicit offline fixture fallback, `GET /api/catalogs/full`, `POST /api/catalogs/live/refresh`, and unit/API coverage for search/filter/live/fallback behavior.

## Current Working Point

Catalog Data Service implementation is complete for the final-product local baseline. It supports deterministic fixtures for judging and live CelesTrak refresh when network access is available.

## Next Step

Submission packaging is next. Optional future work can persist live snapshots to timestamped files.

## Commands Run

- Backend skeleton created an initial in-memory `CatalogService` with `CARTOSAT-2F` and a demo debris object. Replaced by fixture-backed loading.
- `make test-backend` - 22 passed, 1 Starlette/httpx deprecation warning.
- Docker Compose smoke later passed during Scenario Engine work for health and Protect ISRO scenario.
- `PYTHONPATH=backend .venv/bin/pytest backend/tests/test_catalog_service.py backend/tests/test_catalogs_conjunctions.py -q` -> 22 passed, 1 warning after live catalog work.
- `PYTHONPATH=backend .venv/bin/pytest backend/tests -q` -> 74 passed, 1 warning.

## Tests Run

- Backend pytest API/unit suite: 74 passed.
- Catalog targeted suite: 22 passed.

## Decisions Made

- Demo snapshots must be local and deterministic.
- Catalog fixtures live in `data/catalogs/`.
- `demo-protect-isro.json` is deterministic demo data and must not be described as a live operational warning.
- Watchlists are loaded from catalog fixtures and exposed through `/api/watchlists/{watchlist_id}`.
- Live CelesTrak refresh is allowed for situational-awareness theater, but deterministic scenario flows never depend on it.
- Failed live refresh returns an explicit `offline-fallback` response instead of blocking the demo.

## Blockers / Risks

- Live CelesTrak data has no public covariance, so it is not used as an authoritative collision-warning source.
- Optional future work can add persisted snapshot versioning and richer ownership metadata.

## Demo Readiness

Protect ISRO catalog fixture loads reliably with named ISRO assets, scenario debris object, TLE records, watchlist API, full-catalog filtering, and a live CelesTrak refresh/fallback endpoint for the final demo.
