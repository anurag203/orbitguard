# OrbitGuard Deploy Runbook

This repo gets one clean production deploy. Do every local check first, deploy once, then use Netlify rollback instead of spending another build on a small nit.

## Pre-flight

Run from `frontend/` unless noted. All checks must pass before deploy:

```bash
npx tsc -b
npm test
npx playwright test
VITE_STATIC_API=1 npx playwright test
npm run build && npm run size
VITE_STATIC_API=1 npm run build && npm run size
npm run lhci
npm audit --omit=dev && npm audit
git status --short
git branch --show-current
```

Required state:

- `git status --short` shows only intentional deploy changes.
- Current branch is `main`.
- No deploy or GitHub push happens until the owner explicitly approves it.
- Record the current good Netlify deploy id before deploying so rollback is instant.

## What Deploys

- Static SPA from `frontend/dist`.
- Netlify builds with `VITE_STATIC_API=1` from `netlify.toml`, so the app reads committed `frontend/public/api-static/**` data instead of a backend.
- The Netlify build base is `frontend`, publish directory is `dist`.
- The CelesTrak proxy is the edge function at `frontend/netlify/edge-functions/celestrak.ts` (the default location for `base = "frontend"`, declared via `[build] edge_functions`).
- `netlify.toml` routes `/celestrak/*` to that edge function.
- No FastAPI backend, serverless API, database, or worker service deploys.

## Deploy Method

Pick one path only.

### GitHub-connected Netlify site

1. Confirm owner approval to push and deploy.
2. Push `main` to GitHub.
3. Let Netlify auto-build the site. One push means one build.

### Netlify CLI without a GitHub push

1. Confirm owner approval to deploy.
2. From repo root, run:

```bash
netlify deploy --build --prod
```

3. Log in first with `netlify login` if the CLI asks.
4. Keep the command at repo root. `netlify.toml` already sets `base = "frontend"`.

## Verify Immediately

Finish these within about three minutes of the production URL going live:

```bash
SMOKE_URL=<deploy-url> npm run smoke:live
```

Then manually check:

- `/` has the pinned Earth hero and no zoom controls.
- `/sky` first paint is clean with FlowStepper, RouteIntro, and collapsed Filters.
- `/sky` -> Filters -> Data source = Live shows thousands of objects.
- Sky source note either confirms current live TLEs or states that CelesTrak rate-limited a group and the baked snapshot backfilled it.
- `/threats` shows the ranked list.
- `/avoidance` supports plan, apply, and double-check.
- `/report` renders the document view.
- `/system` shows the Pro methodology view.

## Rollback

Use Netlify rollback instead of re-deploying:

1. Netlify dashboard -> Deploys.
2. Select the last known-good deploy id recorded during pre-flight.
3. Choose Publish deploy.
4. Re-run `SMOKE_URL=<deploy-url> npm run smoke:live`.

## Cost Notes

- Every Netlify build consumes build minutes.
- Edge functions consume invocations, but the CelesTrak proxy is CDN-cached: GP/TLE responses for 1 hour and SATCAT responses for 24 hours.
- Keep production to one deploy. Use rollback for immediate recovery.
