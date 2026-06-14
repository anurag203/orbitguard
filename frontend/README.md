# OrbitGuard Frontend

React/Vite/TypeScript mission console for the Protect ISRO demo flow.

## Commands

```bash
npm install
npm test
npm run build
npm run dev -- --port 5173
```

Use Node 22 (`.nvmrc`) for local frontend work. The Vite dev server proxies `/api` to the backend. In Docker Compose, `ORBITGUARD_API_PROXY_TARGET` points the proxy at the backend service.

## Current Scope

- React Router product routes: `/`, `/mission`, `/catalog`, `/risk`, `/avoidance`, `/reports`, `/system`, and `/learn`.
- Three.js Earth scene with space background, orbit trails, visible satellite/debris models, corrected wheel zoom, and reset controls.
- Shared mission state for scenario, catalog, conjunction, maneuver, secondary screening, and report workflows.
- Beginner-readable route copy with raw technical evidence behind disclosures.

## Demo Path

1. Open `http://localhost:5173`.
2. Open `Mission` and click `Plan avoidance`.
3. Open `Avoidance`, run the burn scan, and click `Apply recommendation`.
4. Open `Reports` and click `Generate briefing`.
5. Export Markdown.
