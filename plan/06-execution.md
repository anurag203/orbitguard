# Plan 06 — Execution Waves (subagent partitioning)

Files are partitioned so parallel subagents never touch the same files.

## Wave 1 (parallel)
- **Tour fix** (orchestrator/self): `app/GuidedTour.tsx`, `app/AppShell.tsx`,
  `components/earth/EarthCanvas.tsx` (key-handler guard only), `e2e/tour.spec.ts`.
- **Subagent P — UI polish** (`plan/04`): owns `lib/format.ts`, new `lib/demoClock.ts`,
  `components/ui/Section.tsx`, `routes/threats/**`, `routes/report/**`, `routes/home/**`,
  `routes/learn/**`, `routes/system/**`. Must NOT touch `routes/sky/**`, `components/earth/**`,
  `app/**`, `lib/api.ts`.
- **Subagent S — Sky all-satellites** (`plan/03`): owns `components/earth/**`, `routes/sky/**`,
  `public/data/catalog-sky.json`, `scripts/fetch-sky-catalog.mjs`, adds `satellite.js`. Must NOT
  touch `lib/api.ts`, `app/**`, `routes/{threats,report,home,learn,system}/**`.
  - Coordination: EarthCanvas key-handler guard (Tour) vs Sky's EarthCanvas edits both touch
    `EarthCanvas.tsx`. To avoid a clash, **Tour does its EarthCanvas guard FIRST and commits**, then
    Sky rebases; OR Sky owns EarthCanvas and Tour's guard is folded into Sky's scope. **Decision:**
    Sky owns all `components/earth/**` edits; the Tour subtask hands Sky the exact key-guard snippet
    to include. Tour otherwise only edits `app/**` + the test.

## Wave 2 (after Wave 1 integrates & builds green)
- **Subagent N — Netlify static** (`plan/05`): owns `netlify.toml`, `scripts/snapshot-api.mjs`,
  `frontend/public/api-static/**`, `frontend/src/lib/api.ts` (adapter branch),
  `frontend/package.json` (scripts), `routes/sky/SkyRoute.tsx` live-toggle guard (coordinate w/ Sky:
  do after Sky lands).

## Wave 3 (self)
- Integration + verification: `tsc -b && vite build`, `vitest run`, full Playwright suite, fresh
  screenshots, bundle-size gate. Fix any cross-cutting issues.
- Dead-code quarantine (`src/api.ts`, `missionStore.ts`, `layout/TopNav.tsx`, `src/format.ts`,
  `ui/Primitives.tsx`) — last, low-risk.
- Commit + push.

## Guardrails for every subagent
- Keep Vitest + Playwright (a11y, visual no-overflow, journey, demo-gate) green.
- Respect reduced-motion + no-WebGL fallbacks.
- No secrets; follow existing design tokens (`theme.css`, `textStyles`, `cn`).
- Dev servers run at `127.0.0.1:5173` (frontend) and `127.0.0.1:8000` (backend).
