# FastAPI Backend LLD

## Purpose

Expose a stable API layer that orchestrates OrbitGuard's data, science, scenario, maneuver, and reporting modules.

## Responsibilities

- Provide HTTP endpoints for the frontend.
- Validate requests and normalize errors.
- Route calls to catalog, propagation, screening, Pc, maneuver, secondary screening, scenario, and reporting modules.
- Keep scenario responses deterministic.
- Provide health and readiness checks.

## Non-Responsibilities

- Do not implement UI state.
- Do not store user accounts or personal data.
- Do not split into distributed microservices during the first build.

## Implementation Plan

- Create one FastAPI app with routers grouped by domain.
- Use Pydantic models for all request and response contracts.
- Add a service layer so routers do not contain algorithm logic.
- Add deterministic fixture loading for scenario endpoints.
- Add structured error responses with `code`, `message`, and optional `details`.
- Add CORS only for known local/frontend origins during development.

## Data Flow

Requests enter routers, are validated by Pydantic, call domain services, receive typed results, and return JSON responses consumed by the frontend.

## APIs / Interfaces

- `GET /api/health`
- `GET /api/catalogs`
- `GET /api/catalogs/{catalog_id}`
- `GET /api/objects/search`
- `GET /api/watchlists/{watchlist_id}`
- `POST /api/propagate`
- `POST /api/conjunctions/screen`
- `GET /api/conjunctions/{id}`
- `GET /api/scenarios`
- `POST /api/scenarios/{id}/run`
- `POST /api/scenarios/{id}/reset`
- `GET /api/scenarios/{id}/timeline`
- `POST /api/maneuvers/plan`
- `POST /api/maneuvers/apply`
- `POST /api/reports`
- `GET /api/reports/{id}`

## Data Models

- `ApiError`
- `CatalogRequest`
- `PropagationRequest`
- `ScreeningRequest`
- `ScenarioRunRequest`
- `ManeuverPlanRequest`
- `ManeuverApplyRequest`
- `ReportRequest`

## Algorithms / Logic

- Route orchestration only.
- Use dependency injection or factory functions for service instances.
- Cache immutable fixture/catalog metadata in memory.
- Attach scenario run IDs to result objects for report traceability.

## Error Handling

- Return 400 for invalid request parameters.
- Return 404 for missing scenario/catalog/object IDs.
- Return 422 for scientifically invalid inputs such as impossible time windows.
- Return 500 only for unexpected internal failures.

## Performance Considerations

- Avoid recomputing deterministic scenario fixtures unnecessarily.
- Keep heavy propagation/screening in service modules.
- Add request timing logs for major endpoints.

## Security / Safety Considerations

- No auth for local hackathon MVP.
- No user data persistence.
- Do not expose filesystem paths in errors.
- Clamp request sizes and time windows.

## Test Architecture

- API contract tests using FastAPI test client.
- Router tests with mocked service outputs.
- Integration tests for scenario-to-maneuver flow.
- Error response tests for malformed requests.

## Test Cases

- `/api/health` returns ok.
- Scenario list returns all required scenarios.
- Unknown scenario ID returns 404.
- Protect ISRO run returns deterministic conjunction IDs.
- Maneuver plan validates missing conjunction ID.
- Report generation returns a retrievable report ID.

## Demo Acceptance Criteria

- Backend starts from a clean environment.
- Health check passes before demo.
- Protect ISRO API flow completes without live data.
- API errors are user-recoverable and do not crash the frontend.

## Final-Round Extensions

- Add background job queue for large screening jobs.
- Add OpenAPI documentation polish.
- Add optional auth for hosted demos.
- Add persisted report storage.

## Context File Reference

`../context/02-fastapi-backend-context.md`
