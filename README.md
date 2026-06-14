# OrbitGuard

**Autonomous collision-avoidance copilot for satellite operators.**

> Don't just see the risk. Clear it.

OrbitGuard spots when two objects in orbit are about to get dangerously close — then shows the **one small move** that avoids a crash, and proves the new path is safe. Built for FAR AWAY 2026 (Space & Aerospace theme).

Most space-traffic tools warn you that two objects *may* pass close. OrbitGuard focuses on the next step: **what should the operator do now?** It tracks orbital objects, screens for conjunctions, estimates collision risk, plans an avoidance maneuver, re-screens to confirm the maneuver doesn't create *new* danger, and explains the whole decision in plain language anyone can follow.

---

## Quickstart

### Option A — Docker (recommended; one command, nothing else to install)

Prerequisite: a running Docker engine (Docker Desktop, or Colima: `colima start`).

```bash
docker compose up --build
```

Then open **http://localhost:8080**.

- Frontend (built SPA, served by nginx): http://localhost:8080
- Backend API (proxied at `/api`, also direct): http://localhost:8000
- The backend waits to report healthy before the frontend starts; stop with `Ctrl-C` or `docker compose down`.

### Option B — Native (best for development, fast hot-reload)

```bash
make setup-backend     # create venv + install backend deps
make setup-frontend    # npm install
make run-backend       # FastAPI on http://localhost:8000
make run-frontend      # Vite dev server on http://localhost:5173
```

Then open **http://localhost:5173** (the Vite dev server proxies `/api` to the backend).

---

## What you'll see

A clean, minimal, **separately-routed** experience — designed so someone with zero space background can follow along, with a **Simple / Pro** toggle for technical depth and an opt-in guided **Tour**.

| Route | What it does |
|---|---|
| `/` Home | Cinematic 3D Earth + the one-sentence pitch and a single call to action. |
| `/sky` | Explore what's in orbit — an interactive Blue Marble globe (drag, zoom) with glowing, risk-colored objects; click any object for a plain-language explainer. |
| `/threats` | A calm ranked list of close approaches, each read as a sentence (who, from what, when, how bad). |
| `/threats/:id` | One close approach explained in depth, with a focused mini-globe. |
| `/avoidance` | The hero moment: plan a maneuver and watch risk collapse **red → green**, double-checked against secondary collisions. |
| `/report` | A printable, exportable mission briefing / audit report. |
| `/learn` | Plain-English explainer with analogies and a glossary — no jargon required. |
| `/system` | "Under the hood" — the real pipeline, the math, and honest limitations, for engineers. |

Deterministic demo scenarios: **Protect ISRO** (hero), **2009 Iridium–Cosmos Replay**, and **Kessler Sandbox** — all runnable fully offline.

---

## Architecture

- **Frontend:** React + TypeScript + Vite, Tailwind CSS v4 ("Neon Noir" design system), React Query (server state), Three.js via React Three Fiber (the 3D Earth: starfield, atmosphere, bloom, natural drag-to-orbit).
- **Backend:** FastAPI + Python with SGP4 propagation. Hardened with a dependency-injection container, a single consistent error envelope, structured logging + request-id middleware, env-driven settings (`pydantic-settings`), and split liveness (`/api/health`) vs readiness (`/api/ready`).
- **Compute modules:** catalog, orbit propagation, conjunction screening, collision probability, maneuver planner, secondary screening, scenarios, reporting.
- **Demo safety:** deterministic local fixtures; the Protect ISRO flow is byte-for-byte reproducible with no network.
- **Packaging:** multi-stage frontend image (built SPA on non-root nginx with an `/api` proxy) + hardened non-root backend image with a healthcheck, wired by a health-gated `docker compose` stack.

---

## Useful commands

```bash
# Tests / quality
make test-backend      # pytest (84 passing)
make test-frontend     # vitest unit + component + hook tests
make build-frontend    # type-check + production build
make release-check     # full local gate

# Docker
make docker-run        # docker compose up
make docker-build      # build both images
make docker-stop       # docker compose down
```

Quick API checks (Docker; via the nginx proxy on 8080):

```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/demo/status
curl -X POST http://localhost:8080/api/demo/replay/protect-isro-round1
```

---

## Documentation map

- [redesign/](redesign/): the full redesign plan — vision, design language, information architecture, component library, 3D scene, backend robustness, per-route specs, testing & acceptance, and the execution roadmap.
- [RULES.md](RULES.md) · [CONTRIBUTING.md](CONTRIBUTING.md): rules and workflow before modifying code.
- [docs/](docs/): onboarding, feature-change process, glossary.
- [ORBITGUARD_REQUIREMENTS.md](ORBITGUARD_REQUIREMENTS.md): product requirements and feature vision.
- [HLD.md](HLD.md): high-level system design and testing architecture.
- [architecture/](architecture/): low-level design per feature/service.
- [METHODOLOGY.md](METHODOLOGY.md): science, assumptions, and credibility notes.
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md): the live-demo story.

## Visual assets

- The Earth uses NASA Blue Marble: Next Generation (topography + bathymetry), committed at `frontend/public/textures/earth-blue-marble-june-5400x2700.jpg` so the demo stays offline-safe.

---

**Don't just see the risk. Clear it.**
