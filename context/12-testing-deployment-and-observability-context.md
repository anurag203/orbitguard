# Testing, Deployment, and Observability Context

## Current Status

Implemented and release-check verified with committed Playwright E2E.

## LLD Reference

`../architecture/12-testing-deployment-and-observability-lld.md`

## Implementation Scope

Implement test commands, Docker Compose development setup, smoke tests, logs, health checks, and submission readiness workflow.

## Files Expected To Be Created Or Modified

- `../scripts/README.md`
- `../scripts/release_check.sh`
- `../Makefile`
- `../docker-compose.yml`
- `../.dockerignore`
- `../frontend/e2e/orbitguard.e2e.mjs`
- `../frontend/scripts/website-smoke.mjs`
- `../architecture/12-testing-deployment-and-observability-lld.md`
- `../execution/TESTING_CHECKLIST.md`
- `../execution/SUBMISSION_CHECKLIST.md`

## Completed Work

- 2026-06-13: Context file created.
- 2026-06-13: Implemented `make release-check` with backend tests, frontend tests, frontend build, frontend audit, direct demo replay, Docker Compose build/start, and Docker Compose demo status/replay smoke checks.
- 2026-06-13: Added committed Playwright-core E2E coverage for Full Catalog search, live TLE refresh/fallback, cinematic replay, 2009 Replay, Kessler Sandbox, Protect ISRO apply/report/export, desktop overflow, and mobile overflow. Release gate now runs `npm run test:e2e`.

## Current Working Point

Testing/deployment implementation is complete for the final-product local release gate. Docker Compose is currently running the app at `http://localhost:5173`.

## Next Step

Prepare the submission artifacts: GitHub repository, short demo video, and optional slide deck/screenshots.

## Commands Run

- `make test-backend`
- `cd frontend && npm test`
- `cd frontend && npm run build`
- `cd frontend && npm audit --omit=dev && npm audit`
- `docker compose up -d --build`
- `curl http://localhost:5173/api/demo/status`
- `cd frontend && npm run test:e2e`
- `make release-check` -> passed.

## Tests Run

- Backend test suite: 74 passed, 1 warning.
- Frontend formatter tests: 2 passed.
- Frontend build: passed.
- Playwright E2E: passed.
- Docker Compose smoke: passed.
- Release gate: passed.

## Decisions Made

- Protect ISRO demo acceptance is a release blocker.
- Docker Compose now runs both backend and frontend.
- Frontend uses Node 22 in `.nvmrc` and Docker.
- Release check leaves Docker Compose running so the local demo remains available after verification.
- E2E is a committed release artifact under `frontend/e2e/`, while `frontend/scripts/website-smoke.mjs` remains as a compatibility shim.

## Blockers / Risks

- No code blocker for the local demo. Remaining risks are submission artifacts, recording quality, and optional hosted deployment.

## Demo Readiness

`make release-check` passed. Docker Compose serves the app at `http://localhost:5173`, demo status is ready, Protect ISRO replay passes, and Playwright E2E verifies the primary website workflows.
