# OrbitGuard Running Decisions

This file is a quick decision log. Durable decisions should later become formal ADRs in `../decisions/`.

## Decisions

- Use OrbitGuard for the FAR AWAY 2026 Space & Aerospace theme.
- Optimize for a final-round-ready project, not only a Round 1 prototype.
- Use React + TypeScript for the frontend.
- Use FastAPI + Python for the backend and orbital computation modules.
- Treat "services" as logical modules inside one backend during the first implementation.
- Use Protect ISRO as the primary hero demo.
- Include 2009 Replay and Kessler Sandbox as supporting scenarios.
- Require a context file for every LLD.
- Require test architecture in both HLD and every LLD.
- Add `docs/` as the senior-engineer entrypoint for onboarding, project structure, engineering rules, feature-change process, and glossary.
- Add root `CONTRIBUTING.md` and `Makefile` so modification workflow and common commands are obvious.
- Add Docker Compose and backend Dockerfile for local service reproducibility.
- Add root `RULES.md` as the shortest mandatory workflow for engineers and agents.
- Store Round 1 deterministic catalog data under `data/catalogs/` and serve it through the backend, rather than keeping demo objects hardcoded in service code.
- Store deterministic scenario manifests under `data/scenarios/` and expected demo flows under `data/demo/expected-flows/`.
- Use `ORBITGUARD_PROJECT_ROOT` in Docker Compose and path auto-discovery locally so data fixtures resolve in both environments.
- Use the Python `sgp4` package for Round 1 TLE propagation and return state vectors in kilometers and kilometers per second.
- Keep the default propagation window deterministic for reproducible tests and demos.
- Implement Round 1 conjunction screening as protagonist-vs-catalog using SGP4 sampled state vectors, not all-pairs screening.
- Use a documented Round 1 Pc approximation: 2D Gaussian encounter-plane, `tle-demo-isotropic-300m`, 300 m x/y sigma, and 20 m hard-body radius.
- Implement Round 1 avoidance planning with a deterministic along-track candidate grid and a documented lead-time miss-distance surrogate; return `no-safe-plan` when fuel budget cannot satisfy both Pc and clearance constraints.
- Store Round 1 secondary screening results as deterministic fixtures and classify missing candidate-specific screening as warning/incomplete, never clear.
- Generate Round 1 reports from live service outputs with source IDs and deterministic templates; do not use static report text or ungrounded LLM output for the hero demo.
- Add backend demo readiness and replay endpoints so the Protect ISRO flow can be verified offline before the frontend is built.
- Build the mission console as a Vite/React/TypeScript app with a custom Three.js Earth scene, Vite API proxy, Node 22 frontend runtime, and Docker Compose frontend service.
- Use `make release-check` as the local Round 1 release gate and leave Docker Compose running afterward for immediate demo access.
