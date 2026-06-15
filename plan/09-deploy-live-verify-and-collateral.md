# Plan 09 — Live-data completeness, deploy, verification & judge collateral

> **Audience:** the implementing agent. **Author:** mastermind plan — do exactly what each task says.
> **Precondition:** Plan 08 (including **Part 10 — clarity**) is **fully implemented, green, and merged**
> before this plan starts. Everything here runs **sequentially after** that work, in the order under §0.3.

---

## 0. Ground rules (read first)

### 0.1 Precondition & re-grounding (Part 10 is already merged)
This plan assumes Plan 08 / Part 10 is **done and merged**, so there is no parallel agent and no file-ownership
fence to respect. Before starting, re-ground against the **post-Part-10** code, because Part 10 changed the
surfaces these tasks lean on:
- `routes/sky/SkyToolbar.tsx` now collapses the advanced controls (incl. **Data source = Live**) behind a
  **"Filters"** disclosure (CLR-6). Task B's smoke script already opens Filters first — confirm the button
  label still matches `/filters/i` and the select label still reads `Data source`.
- The Sky source note (`meta.notes` from Task A) is rendered by the Part-10 Sky UI; Task A only changes the
  string, so no UI edit is needed.
- `FlowStepper` / `RouteIntro` now exist; the demo collateral (Task D) must show them.

Files this plan creates/edits: `frontend/src/routes/sky/liveCatalog.ts`, `frontend/src/routes/sky/useSkyCatalog.ts`,
a **new** `frontend/src/routes/sky/liveCatalog.test.ts`, a **new** `scripts/smoke-live.mjs`, a one-line
`frontend/package.json` script append, a **new** `DEPLOY.md`, and the existing `DEMO_SCRIPT.md` / `JUDGE_QA.md`.

### 0.2 Hard constraints
- **Do NOT push to GitHub and do NOT deploy to Netlify** without the owner's explicit go-ahead (Netlify
  credits are limited — we get essentially one clean deploy).
- Keep the suite green. Gate with §6 before declaring any task done.

### 0.3 Order of execution (linear; Part 10 already complete)
1. **Re-run the full gate** (§6) on the merged Part-10 tree to confirm a green baseline before you start.
2. **Task A** — live `active`-group fix (code + tests).
3. **Task B** — post-deploy smoke script.
4. **Task C** — deploy runbook (`DEPLOY.md`).
5. **Task D** — collateral / screenshots / demo script (UI is now final).
6. **Deploy (M2)** + run Task B against the live URL — **only on owner go-ahead** (one clean deploy).
7. **Task E** — stretch audit (optional).

---

## Task A — Live-data completeness: fix the dropped `active` group (the cache-guard) *(do first)*

### A.1 Problem (root cause, verified in code)
`frontend/src/routes/sky/liveCatalog.ts` fetches each CelesTrak group and **drops any group whose fetch
throws** (`fetchGroup` is wrapped in `.catch`, and `fetchText` throws on `!res.ok`). CelesTrak enforces a
**~2-hour cache guard**: when the same large query (notably `GROUP=active`, ~11k objects) is re-requested
too soon, CelesTrak responds with either a non-2xx status **or HTTP 200 whose body is not TLE** (a message
such as *"Please use the cached data that you already have…"*). Either way the current code silently drops
`active`, so the deployed "see EVERYTHING in orbit" view loses its largest set (the reported smoke test
loaded only ~3,340 of a possible ~12k and noted *"Skipped … active"*).

This is the #1 risk to the "live + real + everything" wow-factor. Fix = **detect the guard explicitly** and
**backfill from the committed offline bake** so the field is always complete, while still preferring live.

### A.2 Files
- `frontend/src/routes/sky/liveCatalog.ts` (edit)
- `frontend/src/routes/sky/useSkyCatalog.ts` (edit — pass offline backfill into the live fetch)
- `frontend/src/routes/sky/liveCatalog.test.ts` (new Vitest)
- (no change needed to `owners.ts` unless you also reorder groups — optional)

### A.3 Implementation

**Step A.3.1 — Treat a non-TLE / cache-guard body as a *soft* failure, not a hard drop.**
In `liveCatalog.ts`, replace the naive `fetchText` with a guarded version that recognizes the cache guard
and that validates the body actually contains TLEs:

```ts
class CacheGuardError extends Error {
  constructor(public readonly group: string) {
    super(`CelesTrak cache guard / non-TLE response for "${group}"`);
    this.name = "CacheGuardError";
  }
}

// CelesTrak returns these (verbatim-ish) when it wants you to use cached data.
const GUARD_HINTS = [/use the cached data/i, /please wait/i, /max(imum)? number of requests/i, /invalid query/i];

function looksLikeTle(text: string): boolean {
  // At least one valid "1 …/2 …" line pair.
  return /\n?1 \d{5}/.test(text) && /\n2 \d{5}/.test(text);
}

async function fetchTleGuarded(url: string, group: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal, headers: { Accept: "text/plain" } });
  const text = res.ok ? await res.text() : "";
  if (!res.ok || GUARD_HINTS.some((re) => re.test(text)) || !looksLikeTle(text)) {
    throw new CacheGuardError(group);
  }
  return text;
}
```
Use `fetchTleGuarded(tleUrl, group, signal)` inside `fetchGroup` instead of `fetchText(tleUrl, signal)`.
(Leave the SATCAT JSON fetch as-is — it already `.catch(() => [])`.)

**Step A.3.2 — Backfill missing/!short live results from the offline bake.**
Change `fetchLiveCatalog` to accept an optional `backfill` provider and merge it in (live wins on duplicate
NORAD id). Backfill triggers when a group was skipped **or** the total live count is implausibly low.

```ts
const MIN_HEALTHY_LIVE = 6_000; // active alone is ~11k; below this we know a big group was guarded

export type LiveCatalogOptions = {
  groups?: readonly string[];
  signal?: AbortSignal;
  /** Provides the baked offline catalog to backfill cache-guarded groups (keeps the field complete). */
  backfill?: (signal?: AbortSignal) => Promise<SkyCatalogResult>;
};

// …after building `objects` and `skipped` from the live groups…
let backfilled = 0;
if (options.backfill && (skipped.length > 0 || objects.length < MIN_HEALTHY_LIVE)) {
  try {
    const offline = await options.backfill(options.signal);
    for (const entry of offline.objects) {
      const norad = entry.noradId ?? entry.id;
      if (!norad || seen.has(norad)) continue;
      seen.add(norad);
      objects.push({ ...entry, source: entry.source ?? "offline" });
      backfilled += 1;
      if (objects.length >= MAX_LIVE_OBJECTS) break;
    }
  } catch {
    /* offline backfill is best-effort; ignore */
  }
}
```
Then extend the returned `meta.notes` to be honest about it:
```ts
notes:
  "Current public TLEs from CelesTrak; situational awareness only, no operational covariance."
  + (skipped.length ? ` CelesTrak rate-limited: ${skipped.join(", ")}.` : "")
  + (backfilled ? ` Backfilled ${backfilled.toLocaleString()} objects from the baked snapshot to stay complete.` : "")
```

**Step A.3.3 — Wire the backfill from `useSkyCatalog.ts`.**
`fetchOfflineSkyCatalog` already exists in that file. Pass it as the backfill provider:
```ts
queryFn: ({ signal }) =>
  source === "live"
    ? fetchLiveCatalog({ signal, backfill: fetchOfflineSkyCatalog })
    : fetchOfflineSkyCatalog(signal),
```

**Step A.3.4 — (Resilience) bump React Query retry for transient 429s.**
In `useSkyCatalog`, change `retry: 1` → `retry: source === "live" ? 2 : 1`. Leave `staleTime`/`gcTime` as-is
(1h/24h live) so we lean on the cache and stay polite to CelesTrak.

### A.4 Acceptance
- Unit (`liveCatalog.test.ts`): mock `fetch` so `GROUP=active` returns a 200 body of *"Please use the cached
  data…"* (and/or a 403), other groups return small valid TLE blobs, and `backfill` returns 5,000 baked
  objects. Assert: (a) no throw, (b) `result.objects.length` ≥ 5,000 (backfill kicked in), (c)
  `result.meta.notes` mentions both the rate-limit and the backfill, (d) no duplicate NORAD ids.
- A second test: all live groups return valid TLEs and total ≥ `MIN_HEALTHY_LIVE` → backfill is **not**
  invoked (live-only path), `notes` has no backfill text.
- Manual (dev, with proxy): `/sky` → open Filters → Data source = **Live** → count chip shows thousands even
  if `active` is currently cache-guarded; the source note explains it.

---

## Task B — Post-deploy live smoke test (`scripts/smoke-live.mjs`)

### B.1 Purpose
A one-command check to run **immediately after** the single Netlify deploy, so we spend our one deploy with
confidence. Uses the already-installed Playwright. Read-only; never writes/pushes.

### B.2 Files
- `scripts/smoke-live.mjs` (new)
- `frontend/package.json` — append one script (see B.4); if it conflicts at merge, the integrator adds it.

### B.3 Implementation — create `scripts/smoke-live.mjs`
```js
// Post-deploy smoke test against a LIVE OrbitGuard URL. Read-only.
// Usage: SMOKE_URL=https://orbitguard-faraway.netlify.app node scripts/smoke-live.mjs
import { chromium } from "playwright";

const BASE = (process.env.SMOKE_URL ?? "https://orbitguard-faraway.netlify.app").replace(/\/$/, "");
const ROUTES = ["/", "/sky", "/threats", "/avoidance", "/report", "/learn", "/system"];
const BENIGN = [/React DevTools/i, /Download the React/i, /three-mesh-bvh/i, /\[vite\]/i, /Lit is in dev mode/i];
const fails = [];
const ok = (label) => console.log(`  ✓ ${label}`);
const bad = (label, detail) => { fails.push(`${label}${detail ? ` — ${detail}` : ""}`); console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`); };

// 1) Edge proxy serves CelesTrak (ISS by catalog number).
console.log("Edge /celestrak proxy:");
try {
  const res = await fetch(`${BASE}/celestrak/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle`);
  const text = await res.text();
  res.ok && /\n?1 25544/.test(text) ? ok("returns ISS TLE") : bad("edge proxy did not return ISS TLE", `status ${res.status}`);
} catch (e) { bad("edge proxy fetch threw", String(e)); }

// 2) Every route loads cleanly (content + no fatal/console errors).
const browser = await chromium.launch();
for (const path of ROUTES) {
  console.log(`Route ${path}:`);
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !BENIGN.some((re) => re.test(m.text()))) errs.push(`console: ${m.text()}`); });
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 30_000 });
    const text = (await page.locator("main#main").innerText().catch(() => "")).trim();
    text.length > 30 ? ok("has content") : bad(`${path} has no meaningful content`);
    errs.length === 0 ? ok("no errors") : bad(`${path} logged errors`, errs.join(" | "));
  } catch (e) { bad(`${path} failed to load`, String(e)); }
  await page.close();
}

// 3) Live Sky loads thousands of objects.
console.log("Sky live catalog:");
const sky = await browser.newPage();
try {
  await sky.goto(`${BASE}/sky`, { waitUntil: "networkidle", timeout: 30_000 });
  const filters = sky.getByRole("button", { name: /filters/i });
  if (await filters.count()) await filters.first().click().catch(() => {});
  await sky.getByLabel(/data source/i).selectOption("live").catch(() => {});
  const chip = sky.getByTestId("sky-count-chip");
  await chip.waitFor({ timeout: 30_000 });
  const n = Number(((await chip.textContent()) ?? "").match(/[\d,]+/)?.[0]?.replace(/,/g, "") ?? "0");
  n > 1000 ? ok(`live field rendered ${n} objects`) : bad("live field too small", `${n} objects`);
} catch (e) { bad("live Sky check failed", String(e)); }
await sky.close();
await browser.close();

console.log(`\n${fails.length ? `❌ ${fails.length} check(s) failed` : "✅ all live smoke checks passed"} (${BASE})`);
process.exit(fails.length ? 1 : 0);
```

### B.4 `frontend/package.json` (append to "scripts")
```json
"smoke:live": "node ../scripts/smoke-live.mjs"
```
(If `playwright` is only resolvable from `frontend/node_modules`, run the script with that cwd, or import
`@playwright/test`'s chromium. The `smoke:live` script above runs from `frontend/` so Playwright resolves.)

### B.5 Acceptance
- `SMOKE_URL=<deploy-url> npm run smoke:live` prints a per-check ✓/✗ list and exits non-zero on any failure.
- Run only **after** the deploy. Do not run during Part 10 work (the `data source` label / `Filters` button
  must exist; the script already tries to open Filters and degrades gracefully).

---

## Task C — One-deploy Netlify runbook (`DEPLOY.md`)

### C.1 Purpose
Make the single deploy a checklist, not a guess. Create `DEPLOY.md` at repo root with the content below.

### C.2 `DEPLOY.md` contents (author it; adapt URLs as needed)
- **Pre-flight (local, all must pass — see Plan 09 §6):** `npx tsc -b`; `npm test`; full Playwright;
  `VITE_STATIC_API=1` Playwright; `npm run build && npm run size` in both default and `VITE_STATIC_API=1`;
  `npm run lhci`; `git status` clean; on `main`.
- **What deploys:** static SPA from `frontend/dist` (built with `VITE_STATIC_API=1`, per `netlify.toml`
  `[build].command`), plus the **edge function** in `netlify/edge-functions/celestrak.ts` (auto-deployed;
  routed by `netlify.toml [[edge_functions]] path = "/celestrak/*"`). No backend, no serverless.
- **Deploy method (pick ONE — we get one clean spend):**
  - *If the GitHub repo is connected to the Netlify site:* push `main` → Netlify auto-builds. (One push = one build.)
  - *If not connected / to avoid a GitHub push:* `netlify deploy --build --prod` via Netlify CLI from repo root
    (`base="frontend"` is already in `netlify.toml`). Requires `netlify login` once.
- **Immediately after deploy — verify (≤3 min):**
  1. `SMOKE_URL=<deploy-url> npm run smoke:live` → all ✓.
  2. Manual: `/` hero Earth pinned + no zoom controls; `/sky` clean first paint (FlowStepper + collapsed
     Filters from Part 10); open Filters → Data source = Live → thousands of objects + honest source note;
     `/threats` ranked list; `/avoidance` plan→apply→double-check; `/report` document.
  3. Confirm `active` either loads live **or** the source note shows the cache-guard backfill (Task A).
- **Rollback (instant, no rebuild):** Netlify dashboard → **Deploys** → select the last good deploy →
  **Publish deploy**. (Document the current good deploy id before deploying.)
- **Cost notes:** each build consumes build minutes; edge functions consume invocations (cheap, CDN-cached
  1h for GP / 24h for SATCAT). Keep to **one** deploy; use Rollback instead of re-deploying on a UI nit.

### C.3 Acceptance
- `DEPLOY.md` exists, is self-contained, and a first-timer could deploy + verify + roll back from it alone.

---

## Task D — Judge collateral & demo

### D.1 Scope
Screenshots and the demo script must show the **final, merged** UX: FlowStepper, RouteIntro headers, plain
language, collapsed Sky filters, and live data. (Part 10 is already merged, so this is just "capture the
final product".)

### D.2 Steps
1. **Re-capture screenshots** (reuse the existing `frontend/e2e/_polish-shots.mjs` / `demo-shots/` approach)
   for: home hero (pinned Earth), `/sky` clean first paint, `/sky` Filters open + Live, `/sky` object panel,
   `/threats` ranked list, `/threats/:id`, `/avoidance` before/after + double-check, `/report`, `/system` (Pro).
2. **Rewrite `DEMO_SCRIPT.md`** as a ~2.5-min beat sheet aligned to See → Spot → Solve → Prove, calling out
   the FlowStepper ("Step 2 of 4"), plain-language toggle, and **live** Sky. Each beat: timestamp · on-screen
   action · one-sentence narration.
3. **Refresh `JUDGE_QA.md`**: ensure answers match the shipped behavior (live data via edge proxy + SATCAT,
   offline backfill for cache-guarded groups, Pc/secondary-screening honesty, static deploy model).
4. Keep all numbers consistent with the deterministic fixtures (no invented figures).

### D.3 Acceptance
- A reader can run the demo end-to-end from `DEMO_SCRIPT.md` against the live site in ≤3 min, and every claim
  in `JUDGE_QA.md` is backed by the running app.

---

## Task E — Optional stretch audit (any time, read-only)
Confirm Plan 07 P2 leftovers and report status (do not implement unless asked): ISRO watchlist UI,
full-catalog screening mode, richer Pc/covariance controls (note: `frontend/src/components/PcSensitivityControls.tsx`
already exists — verify it's wired), judge methodology cheat-sheet. Produce a short status list; defer build.

---

## 6. Master gate checklist (run before declaring A/B/C done; D is doc-only)
- `npx tsc -b` — clean
- `npm test` — all pass (includes new `liveCatalog.test.ts`)
- Full Playwright — all pass
- `VITE_STATIC_API=1` Playwright — pass
- `npm run build && npm run size` — pass (default **and** `VITE_STATIC_API=1`)
- `npm run lhci` — pass
- `npm audit --omit=dev && npm audit` — 0 vulnerabilities
- **No push, no deploy** until owner go-ahead.

## 7. Notes
- This plan is **sequential** and assumes Part 10 is merged and green — there is no parallel agent to
  coordinate with. Start by re-confirming the green baseline (§0.3 step 1), then proceed A → B → C → D → deploy.
- The only behavioral code change is Task A (data layer); B/C/D are a script, a doc, and collateral.
- Deploy is the single irreversible/credit-spending step — keep it last and gated on owner go-ahead.
