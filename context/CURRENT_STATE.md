# OrbitGuard Current State

## Project Status

Local final-product baseline has a production-grade Home pass, focused Command Deck navigation, global Mission Sync feedback strip, redesigned Mission cockpit, production Catalog object browser with guided mission lenses, production Risk Board with selectable triage playbook, production Predictor/Avoidance burn-scan simulator, production Reports briefing desk with tabbed review console and judge storyboard, production System technical command center with selectable pipeline-stage inspector, production Learn training simulator, and polished Mission Director guided-demo presenter rail on top of the modular frontend redesign. Backend skeleton, senior-engineer onboarding structure, fixture-backed and live-refresh-capable Catalog Data Service, fixture-backed Scenario Engine, SGP4 Orbit Propagation Engine, Conjunction Screening Engine, Collision Probability Engine, Avoidance Maneuver Planner, Secondary Risk Screening, AI Briefing/Reporting, backend Demo Mode/Offline Replay, modular React Router frontend, Zustand mission store, focused routes (`/`, `/mission`, `/catalog`, `/risk`, `/avoidance`, `/reports`, `/system`, `/learn`), full-bleed cinematic Home with rotating Earth background, raw-placeholder-free Home readiness/status copy, modern primary nav with Mission/Catalog/Predictor/Briefing/System tabs, Intel dropdown for Risk/Learn, compact grouped mobile drawer, top-nav Start Demo control, fixed Mission Director rail with Command/Source/Rank/Simulate/Brief scenes, Mission Sync stage strip with Source/Detect/Dodge/Brief state, mission-specific busy labels, Mission route cockpit with first-viewport action briefing, Catalog source status, source-sync state, signal strip, guided All Objects/Protected ISRO/Debris Threats/LEO Corridor lenses, polished filter console, active filter chips, source-mode toggle, graceful no-results states, selectable object rows, raw-placeholder-free object metadata, operator-reading object inspector, mini orbit preview, proof chips, tags, lineage, collapsed TLE evidence, Risk command hero, focused threat summary, scenario comparison cards, designed sync fallback, selectable severity lanes, lane-specific playbook, risk radar visual, operator-ready threat queue, Predictor target briefing, dominant Earth burn lab, simulation pre-flight panel, inspectable burn-sequence runbook, raw-placeholder-free queued candidate state, before/after risk-collapse board, candidate cards, secondary-screening assurance panel, Reports command hero, briefing queue state, Situation/Decision/Safety/Submission storyboard, Summary/Evidence/Assumptions/Export review modes, evidence chain, mission dossier, source IDs, assumptions, export unlock state, System readiness sync, selectable decision pipeline controls, stage interface/evidence/test inspector, validation proof band, engine cards, architecture evidence, Learn command hero, 30-second mission model, selectable training-stage simulator, active lesson briefing, judge-signal panel, readiness checks, glossary, route jumps, rebuilt space-background Earth scene, corrected wheel zoom, visible satellite/debris models, updated Playwright E2E coverage, and Vite-verified desktop/mobile visual QA are complete.

## Active Module

Final cross-route production UI polish and release verification are active.

## Last Completed Module

Backend robustness refactor (doc `redesign/08-backend-robustness.md`, all phases 0-6): introduced a single shared service container wired through a FastAPI `lifespan` + `Depends` (fixing fragmented per-route service instances and the previously-unshared `_live_snapshots` / `_reports` caches); added a global `Exception` handler that returns the same `{"error": {...}}` `ApiError` envelope (`code="internal_error"`) while logging the real error server-side; configured structured stdlib logging (`app/core/logging_config.py`, plain text default, `ORBITGUARD_JSON_LOGS` for JSON) plus a request-id middleware (`app/core/middleware.py`); migrated `config.py` to `pydantic-settings` with identical defaults and a wired `celestrak_timeout_s`; de-hardcoded the pipeline via `app/core/ids.py` `ScenarioIds` so maneuver apply, report creation, and conjunction GET work for ALL scenarios (Protect ISRO, 2009 Replay, Kessler) — Protect ISRO replay stays byte-for-byte deterministic and fully offline; added `computation_mode` (`"sgp4" | "fixture-fallback"`) to `ScreeningResponse`; cached screenings in the shared `ConjunctionService` for dynamic `GET /conjunctions/{id}`; split `/health` (liveness) from new `/ready` (readiness, 503 when fixtures missing); narrowed the broad `except` in `propagation_engine.py` and removed confirmed dead code (`PROTECT_ISRO_RISK`, `classify_severity`, `status_for_severity`, `load_scenario_fixture`); added service-boundary logging and 10 new pytest tests. Suite: 84 passed (74 prior + 10 new). Scope limited to `backend/`; no frontend/redesign/data changes.

### Previously Completed

Reports storyboard polish pass: upgraded `/reports` with a four-chapter Situation/Decision/Safety/Submission presentation path, chapter switching before and after generation, export-ready proof state, E2E storyboard coverage, and desktop/mobile Reports screenshots with no horizontal overflow.

## Current Blocker

Docker build is temporarily blocked by Docker Hub metadata timeout for `node:22-alpine` / `python:3.12-slim`. App code is verified through Vite, frontend build, unit tests, and Playwright E2E on `http://127.0.0.1:5174`.

## Next Recommended Action

Continue with final cross-route micro-polish, presentation recording, and release verification. Retry Docker/release-check after Docker Hub metadata access recovers.

## Current Build Phase

Current frontend baseline has a cleaner modular architecture plus a production-grade cinematic Home route, polished Command Deck navigation, global Mission Sync feedback, redesigned Mission cockpit, production Catalog browser/filter console with guided mission lenses, production Risk Board with selectable triage playbook, production Predictor/Avoidance burn simulator with a five-stage operator runbook, production Reports briefing desk with a four-chapter judge storyboard and tabbed review console, production System technical command center with selectable pipeline-stage inspector, production Learn training simulator, and a fixed Mission Director rail for judge-facing walkthroughs. The latest pass is verified with Reports storyboard chapter switching, generated submission-ready state, desktop/mobile no-overflow layouts, and screenshots at `artifacts/visual-qa/reports-storyboard-polish.png`, `artifacts/visual-qa/reports-storyboard-polish-ready.png`, `artifacts/visual-qa/reports-storyboard-polish-mobile.png`, `artifacts/visual-qa/reports-storyboard-polish-viewport.png`, `artifacts/visual-qa/reports-storyboard-polish-ready-viewport.png`, and `artifacts/visual-qa/reports-storyboard-polish-mobile-viewport.png`. Last full release gate predates the latest Home/nav/Mission/Catalog/Risk/Predictor/Reports/System/Learn/Mission Director/Mission Sync/Catalog filter-console/Avoidance pre-flight/Mission action-briefing/Reports queue/Catalog source/System readiness/Home shell/Learn simulator/Reports review-console/System stage-inspector/Catalog mission-lens/Risk playbook/Avoidance burn-sequence/Reports storyboard Vite passes; current UI work is verified with `npm run build`, `npm test`, and E2E against the Vite dev server because Docker metadata fetch is timing out.

## Important Links

- Requirements: `../ORBITGUARD_REQUIREMENTS.md`
- HLD: `../HLD.md`
- Engineering guide: `../docs/README.md`
- Architecture LLDs: `../architecture/`
- Build order: `../execution/ROUND1_BUILD_ORDER.md`
- Testing checklist: `../execution/TESTING_CHECKLIST.md`

## Last Updated

2026-06-14
