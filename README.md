# OrbitGuard

**Autonomous collision-avoidance copilot for satellite operators.**

OrbitGuard is being built for FAR AWAY 2026 under the **Space & Aerospace** theme. It is designed as a final-round-ready project, not a throwaway Round 1 prototype: a mission-control system that tracks orbital objects, detects conjunctions, estimates risk, recommends an avoidance maneuver, checks that the maneuver does not create secondary danger, and explains the decision in an audit-ready way.

## Core Thesis

Most space-traffic tools warn operators that an object may pass close to another object. OrbitGuard focuses on the next step: **what should the operator do now?**

OrbitGuard will demonstrate:

- Real orbital data ingestion from TLE snapshots.
- 3D Earth visualization for satellites, debris, risk arcs, and selected orbits.
- Conjunction screening and risk ranking.
- Collision probability estimation with documented assumptions.
- Avoidance maneuver planning.
- Secondary conjunction screening after the maneuver.
- Grounded AI-style mission briefings and maneuver reports.
- Deterministic demo scenarios, including Protect ISRO, 2009 Replay, and Kessler Sandbox.

## Documentation Map

- [RULES.md](RULES.md): mandatory rules before modifying or adding code.
- [CONTRIBUTING.md](CONTRIBUTING.md): required workflow before modifying code.
- [docs/](docs/): senior-engineer onboarding, project rules, feature-change process, and glossary.
- [ORBITGUARD_REQUIREMENTS.md](ORBITGUARD_REQUIREMENTS.md): product requirements and final-round feature vision.
- [HLD.md](HLD.md): high-level system design, testing architecture, and handoff strategy.
- [architecture/](architecture/): low-level design documents for each major feature/service.
- [context/](context/): execution context files used to resume work after interruptions.
- [METHODOLOGY.md](METHODOLOGY.md): science, assumptions, and credibility notes.
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md): Round 1 video and live-demo story.
- [FINAL_ROUND_ROADMAP.md](FINAL_ROUND_ROADMAP.md): how the same project deepens after Round 1.

## Build Strategy

OrbitGuard will be implemented as a modular full-stack app:

- React + TypeScript frontend.
- FastAPI + Python backend.
- Python orbital computation modules using SGP4-compatible libraries.
- Deterministic local scenario fixtures for demo reliability.
- Docker Compose for local execution.

Logical modules are documented like services, but the first implementation should keep them inside one backend and one frontend for speed, reliability, and hackathon demo safety.

## Current Commands

```bash
make setup-backend
make setup-frontend
make test-backend
make test-frontend
make build-frontend
make run-backend
make run-frontend
make release-check
```

## Run The Full Mission Console

```bash
make docker-run
```

Then open `http://localhost:5173`.

Useful backend demo checks:

```bash
curl http://localhost:5173/api/demo/status
curl -X POST http://localhost:5173/api/demo/replay/protect-isro-round1
```

## Visual Assets

- The mission-console Earth uses NASA Blue Marble: Next Generation with topography and bathymetry, committed at `frontend/public/textures/earth-blue-marble-june-5400x2700.jpg` so the demo remains offline-safe.

## Tagline

**Don't just see the risk. Clear it.**
