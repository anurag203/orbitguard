# Catalog Data Service LLD

## Purpose

Manage orbital object data, local TLE snapshots, metadata, ISRO watchlists, and deterministic scenario fixtures.

## Responsibilities

- Load committed TLE snapshots.
- Provide catalog metadata to the backend.
- Support object search and filtering.
- Maintain curated watchlists, especially ISRO assets.
- Provide stable object IDs for scenario and report traceability.
- Support live refresh from public CelesTrak TLE sources with explicit offline fallback.

## Non-Responsibilities

- Do not propagate or screen objects.
- Do not infer collision risk.
- Do not depend on live data for deterministic scenarios.

## Implementation Plan

- Store raw snapshots under `data/catalogs/`.
- Create loaders for TLE text files and scenario fixture JSON.
- Normalize each object into a catalog object record.
- Add metadata fields when known: name, NORAD ID, category, owner, orbit class, source catalog, and tags.
- Provide in-memory lookup by object ID, NORAD ID, and normalized name.
- Add refresh script design but keep demo snapshots committed.
- Validate committed JSON fixtures before serving them.
- Expose watchlists through the backend for scenario and frontend use.
- Parse CelesTrak name/line1/line2 TLE triplets on demand.
- Cache live refresh results in memory for the current backend process.
- Provide a full-catalog workbench endpoint that supports source, search, owner, type, orbit class, group, and limit filters.
- Return `offline-fallback` when live refresh fails so the demo never depends on network availability.

## Data Flow

Snapshot files are loaded at backend startup or on first request, normalized into catalog records, and returned to propagation/scenario modules by ID or catalog selection.

## APIs / Interfaces

- `list_catalogs()`
- `load_catalog(catalog_id)`
- `search_objects(query, filters)`
- `get_object(object_id)`
- `get_watchlist(watchlist_id)`
- `load_scenario_fixture(scenario_id)`
- `refresh_live_catalog(group, limit)`
- `full_catalog(source, query, owner, object_type, orbit_class, limit, group)`

Round 1 API exposure:

- `GET /api/catalogs`
- `GET /api/catalogs/{catalog_id}`
- `GET /api/catalogs/full`
- `POST /api/catalogs/live/refresh`
- `GET /api/objects/search`
- `GET /api/watchlists/{watchlist_id}`

## Data Models

- `CatalogSummary`
- `CatalogObject`
- `TleRecord`
- `ObjectMetadata`
- `Watchlist`
- `ScenarioFixtureRef`
- `CatalogSnapshot`
- `CatalogDetailResponse`
- `WatchlistResponse`
- `CatalogRefreshRequest`
- `CatalogWorkbenchResponse`

## Algorithms / Logic

- Parse TLE records in two-line and optional name-plus-two-line format.
- Validate line checksums when practical.
- Derive orbit class from mean motion/altitude approximation when metadata is missing.
- Normalize names for search.
- For CelesTrak live mode, parse triplets into `celestrak-{norad_id}` stable IDs, tag records with `live-tle`, and estimate orbit class from mean motion.
- For full-catalog filtering, apply query, owner, object type, and orbit class filters before returning the capped result set.

## Error Handling

- Reject malformed TLE records with line number and catalog ID.
- Continue loading valid records when noncritical metadata is missing.
- Return empty search results rather than failing for no matches.
- Surface missing required scenario fixture as a startup/demo-blocking error.
- Return structured `offline-fallback` catalog response if CelesTrak fetch or parsing fails.

## Performance Considerations

- Cache parsed catalogs in memory.
- Avoid reparsing files for every request.
- Keep search index lightweight and deterministic.
- Keep live CelesTrak refresh capped by request limit to avoid overwhelming the UI.

## Security / Safety Considerations

- Only load files from known data directories.
- Do not allow arbitrary file paths from API requests.
- Clearly label stale snapshots.
- Treat live CelesTrak data as situational-awareness input only because public TLEs do not include covariance.

## Test Architecture

- Unit tests for TLE parsing and normalization.
- Fixture tests for required scenario catalogs.
- Search/filter tests.
- Offline fallback tests.
- Live CelesTrak parser tests with mocked TLE text.

## Test Cases

- Valid TLE snapshot loads expected object count.
- Malformed TLE fixture returns parse error.
- ISRO watchlist returns at least one protected asset in scenario data.
- Search by NORAD ID returns the expected object.
- Offline scenario fixture loads without network.
- Live CelesTrak refresh parses sample TLE triplets.
- Live CelesTrak network failure returns fixture fallback.
- Full catalog endpoint applies search/filter parameters.

## Demo Acceptance Criteria

- Protect ISRO fixture loads deterministically.
- Object names and IDs display correctly in UI.
- Missing live refresh does not affect demo.
- Full Catalog workbench can search fixtures and trigger live TLE refresh/fallback.

## Final-Round Extensions

- Add catalog versioning.
- Add richer ownership and mission metadata.
- Add object-group analytics.
- Persist live refresh snapshots to timestamped files for post-demo audit.

## Context File Reference

`../context/03-catalog-data-service-context.md`
