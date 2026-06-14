# Testing, Deployment, and Observability LLD

## Purpose

Define the project-wide quality gate so OrbitGuard remains buildable, testable, demo-ready, and final-round credible.

## Responsibilities

- Define test layers and commands.
- Define local Docker Compose development.
- Define CI readiness.
- Define logging and observability expectations.
- Define submission readiness checks.

## Non-Responsibilities

- Do not implement domain science.
- Do not replace module-specific tests.
- Do not require heavyweight production infrastructure for Round 1.

## Implementation Plan

- Add backend test suite with pytest.
- Add frontend tests with component tests and Playwright.
- Add lint/typecheck commands.
- Add Docker Compose for frontend/backend.
- Add smoke test script for demo readiness.
- Add simple structured logs for backend requests and domain warnings.

Current implementation:

- `Makefile` exposes backend tests, frontend tests, frontend build, Docker Compose, and release gate commands.
- `scripts/release_check.sh` runs the local release gate.
- Docker Compose runs backend and frontend together.
- Frontend proxy reaches backend through local Vite or Docker service networking.
- `frontend/e2e/orbitguard.e2e.mjs` is the committed Playwright-core E2E suite.
- `frontend/scripts/website-smoke.mjs` remains as a compatibility shim that invokes the E2E suite.

## Data Flow

Tests execute module units, API flows, scenario flows, UI flows, and final demo acceptance. Observability captures request timing and module warnings for debugging.

## APIs / Interfaces

- `GET /api/health`
- `GET /api/demo/status`
- CLI commands:
  - backend tests
  - frontend tests
  - E2E tests
  - demo smoke test
  - build

Current release command:

- `make release-check`

## Data Models

- `HealthStatus`
- `DemoReadinessStatus`
- `TestRunSummary`
- `PerformanceMetric`

## Algorithms / Logic

- Fail fast on missing fixtures.
- Treat scenario determinism failures as release blockers.
- Treat failed Protect ISRO demo test as submission blocker.
- Keep Docker Compose running after release check so the local demo remains open at `http://localhost:5173`.

## Error Handling

- Test commands should print actionable failure names.
- Demo smoke test should identify missing system component.
- Build failures must block submission checklist completion.

## Performance Considerations

- Keep core tests fast enough to run frequently.
- Separate slow E2E/performance tests from unit tests.
- Track basic endpoint timings.

## Security / Safety Considerations

- Keep secrets out of repo.
- No user data collection.
- Avoid logging raw local paths in user-facing responses.

## Test Architecture

- Backend: pytest unit and API tests.
- Frontend: component tests and Playwright.
- Integration: scenario API and maneuver pipeline tests.
- Scientific validation: deterministic fixtures and numeric sanity checks.
- Demo acceptance: clean-clone, offline, Protect ISRO flow.

Implemented release gate:

- Backend pytest suite.
- Frontend Vitest suite.
- Frontend production build/typecheck.
- Frontend npm audit.
- Direct backend demo status/replay assertions.
- Docker Compose status/replay smoke through the frontend proxy.
- Playwright E2E through Docker-served frontend for catalog, cinematic, scenario, report export, desktop, and mobile flows.

## Test Cases

- Backend unit suite passes.
- Frontend build succeeds.
- API health check succeeds.
- Protect ISRO scenario test passes.
- Demo smoke test passes without network.
- Playwright E2E suite passes against the Docker-served website.
- Submission checklist links to passing evidence.

Current evidence:

- `make release-check` passed on 2026-06-13.
- Backend tests: 64 passed, 1 warning.
- Backend tests after final-product upgrade: 74 passed, 1 warning.
- Frontend tests: 2 passed.
- Frontend audit: 0 vulnerabilities.
- Docker Compose demo status: ready.
- Docker Compose demo replay: passed.
- Playwright E2E: passed.

## Demo Acceptance Criteria

- One command can start the local demo.
- One checklist proves demo readiness.
- Logs help diagnose failures quickly.

## Final-Round Extensions

- Add GitHub Actions CI.
- Add performance dashboards.
- Add hosted deployment health checks.
- Add release tags and reproducible build artifacts.
- Add scheduled live catalog refresh monitor for a hosted deployment.

## Context File Reference

`../context/12-testing-deployment-and-observability-context.md`
