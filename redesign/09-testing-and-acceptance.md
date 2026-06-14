# 09 — Testing & Acceptance

> Owner: Agent F. Obeys docs 01–04 (the constitution). This doc defines **how we prove the
> OrbitGuard redesign works** — the test layers, the per-screen acceptance checklists, the
> 3-minute demo gate, the performance budgets, and the regression protection that keeps the green
> baseline green.
>
> **Verified baseline (2026-06-14):** `npm run build` ✅ (single bundle, to be code-split per doc 04),
> `npm test` ✅ (`vitest`, `frontend/src/format.test.ts`), `npm run test:e2e` ✅ (bespoke Playwright
> node script `frontend/e2e/orbitguard.e2e.mjs`, old routes), `pytest` ✅ **74 passed**.
> `make release-check` exists (`./scripts/release_check.sh`).

---

## 1. Testing philosophy for a hackathon

We are not building a bank. We are building a **3-minute "wow"** for judges, backed by an API that
survives the network tab. Tests exist to protect exactly two things: **the demo-critical path** and
**visible quality**. Everything else is optional polish.

Five rules:

1. **Protect the demo path first.** The ordered journey *Home → Sky → Threats → Threat detail →
   Avoidance → Report* (doc 03 §1) and the offline, deterministic **Protect ISRO** flow (doc 01 §1,
   README principle #6) get the most and the strictest tests. A test for a corner of `/system` is
   worth less than one assertion on the risk red→green moment.
2. **Keep the green baseline green at every step.** The refactor is incremental on a working build
   (doc 04 §7, doc 08 §12). The gate `build ✅ · vitest ✅ · e2e ✅ · pytest (74+) ✅` must pass after
   **every** route conversion and **every** backend phase. A red baseline blocks the next change.
3. **Tests are gates, not bureaucracy.** A test earns its place by catching a regression a judge
   would see (reversed drag, jargon in Simple mode, a 500 with the wrong body, a broken export). We
   do **not** chase coverage numbers or unit-test trivial getters. Prefer a few high-signal E2E +
   acceptance checks over hundreds of brittle unit tests.
4. **Test the contract, not the implementation.** Assert on accessible names, plain-language copy,
   `role`/`aria`, and the documented test hooks (Appendix A) — not on Tailwind classes or DOM shape
   that churn during the redesign.
5. **Honesty is testable.** Doc 01 §7 ("be honest about the science") and doc 08 §7
   (`computation_mode`) mean we assert that fixture/offline results *say so* — we test that we never
   fake precision.

> **Anti-goal (matches doc 01 §7):** no flaky always-green theater. A test that can't fail for a
> real reason is deleted.

---

## 2. Test layers & tools

| Layer | Tool | Scope | Speed / when |
|---|---|---|---|
| Unit | **Vitest** | `lib/format.ts`, `lib/terms.ts`, pure helpers | ms · every save / pre-commit |
| Component | **Vitest + @testing-library/react** | `components/ui/*`, key `domain/*` widgets | ms · every save / pre-commit |
| Data hooks | **Vitest + React Query + mocked `api`** | `features/use*` loading/error/success | ms · every save |
| E2E | **@playwright/test** (migrated) | full journey on the new routes, demo, Simple/Pro, scenarios | ~1–2 min · pre-push / CI |
| 3D smoke | **@playwright/test** | canvas mounts, **drag direction**, zoom, reduced-motion fallback | seconds · pre-push / CI |
| Backend | **pytest** | 74 existing + doc 08 §11 new tests | seconds · every change |
| Accessibility | **@axe-core/playwright** | axe per route + focus/keyboard/tooltip-on-focus | seconds · CI |
| Visual QA | **Playwright screenshots** | per route @ 1440 + 390 + a light audit checklist | seconds · CI / manual review |

### 2.0 Dependencies to add (frontend `devDependencies`)

```jsonc
// frontend/package.json — add (use the package manager to pin latest compatible)
"@playwright/test",            // replaces the bespoke e2e/orbitguard.e2e.mjs runner
"@testing-library/react",
"@testing-library/user-event",
"@testing-library/jest-dom",
"jsdom",                        // vitest DOM environment for component tests
"@axe-core/playwright"         // accessibility assertions inside Playwright
```

Scripts (extend the existing ones, keep names backward-compatible where the Makefile depends on them):

```jsonc
// frontend/package.json "scripts"
"test": "vitest run",                       // unit + component + hooks (jsdom)
"test:watch": "vitest",
"test:e2e": "playwright test",              // was: node e2e/orbitguard.e2e.mjs
"test:a11y": "playwright test --grep @a11y",
"test:visual": "playwright test --grep @visual"
```

Backend needs **no new test deps** (doc 08 §12.1): `pytest` + `httpx`/`TestClient` already present.

### 2.1 Unit (Vitest)

The current `format.test.ts` (mode-agnostic `formatPc`/`formatDistanceMeters`/`formatDeltaV`) is the
seed. Doc 05 §7 makes formatters **mode-aware** (`formatPlain`/`formatPro`). Extend the suite; keep
the old assertions passing where folded in (Pro ≈ old behavior).

Example tests (`frontend/src/lib/format.test.ts`):

```ts
describe("formatPc", () => {
  it("Simple frames Pc as a word + '1 in N' (doc 03 §6)", () => {
    expect(formatPc(2.78e-4, "simple")).toBe("very high (about 1 in 3,597)");
  });
  it("Pro renders true scientific notation with ×10ⁿ superscript", () => {
    expect(formatPc(2.78e-4, "pro")).toBe("2.78 × 10⁻⁴");
  });
  it("Simple says 'effectively zero' for a cleared risk, never 'NaN'/'Infinity'", () => {
    expect(formatPc(0, "simple")).toBe("effectively zero");
  });
});

describe("pcWord / dvSize bands", () => {
  it("maps Pc magnitude to the chance word (very high → negligible)", () => {
    expect(pcWord(2.8e-4)).toBe("very high");
    expect(pcWord(5e-8)).toBe("negligible");
  });
  it("sizes the nudge plainly", () => {
    expect(dvSize(0.12)).toBe("tiny");
    expect(formatDeltaV(0.12, "simple")).toBe("a tiny 0.12 m/s nudge");
    expect(formatDeltaV(0.12, "pro")).toBe("0.12 m/s");
  });
});

describe("toRiskLevel (risk color is sacred — doc 05 §1.4)", () => {
  it("maps backend severity → canonical level and never throws on unknown", () => {
    expect(toRiskLevel("critical")).toBe("danger");
    expect(toRiskLevel("nominal")).toBe("safe");
    expect(toRiskLevel("???")).toBe("watch"); // neutral-cautious default
  });
  it("derives color from severity, NOT from Pc magnitude", () => {
    // a low-Pc 'warning' must still be styled warning, never recolored by pcWord
    expect(RISK_TEXT[toRiskLevel("warning")]).toBe("text-warning");
  });
});

describe("distance / time framing", () => {
  it("Simple rounds + optional comparison; Pro is precise", () => {
    expect(formatDistance(600, "simple")).toBe("600 m");
    expect(formatDistance(8387.76, "simple")).toBe("8.4 km");
    expect(formatDistance(8387.76, "pro")).toBe("8.388 km");
  });
  it("Simple time is relative, Pro is absolute UTC", () => {
    const now = new Date("2026-06-14T10:00:00Z");
    expect(formatTime("2026-06-14T14:00:00Z", "simple", now)).toBe("in 4 hours");
    expect(formatTime("2026-06-14T14:32:08Z", "pro", now)).toBe("2026-06-14 14:32:08 UTC");
  });
});
```

The `<Term>` dictionary (`lib/terms.ts`, doc 05 §4) is unit-tested for completeness so a missing key
can't ship:

```ts
describe("terms dictionary", () => {
  const required: TermKey[] = ["tca","miss-distance","pc","conjunction","delta-v","along-track",
    "secondary-screening","norad-id","tle","leo","covariance","propagation","relative-velocity","kessler"];
  it("has a plain label, full name, and short tooltip for every key (doc 03 §6)", () => {
    for (const k of required) {
      expect(TERMS[k].label).toBeTruthy();
      expect(TERMS[k].full).toBeTruthy();
      expect(TERMS[k].short.length).toBeLessThan(90); // tooltip stays one line
    }
  });
});
```

### 2.2 Component (Vitest + @testing-library/react)

Render the **ui kit** (doc 05) in isolation; assert behavior + accessibility + Simple/Pro. Use the
dev `/__styleguide` building blocks; wrap in `ModeProvider forceMode` to pin a mode.

High-value component tests:

| Component | What we assert |
|---|---|
| `Button` | renders accessible name; `loading` shows label **not** a bare spinner + `aria-busy`; disabled blocks click; `asChild` renders a real `<a>` |
| `RiskMeter` | `role="meter"` + `aria-valuenow`; center shows the **word** (`Danger`); `data-level` matches severity; reduced-motion snaps (no pulse) |
| `RiskBadge` | word text present (meaning not color-only); color class derived from `severity` via `toRiskLevel` |
| `Term` tooltip | Simple shows plain label, **no** acronym visible; opens on **focus** (keyboard), revealing `full`+`short`; Pro shows `plain (Full)` inline |
| `ShowDetails`/`Disclosure` | collapsed by default in Simple; `aria-expanded`/`aria-controls`; Space/Enter toggles |
| `Switch`/`ModeToggle` | `role="switch"`, `aria-checked` flips; toggling re-renders a number from Simple→Pro |
| `EmptyState`/`ErrorState`/`LoadingState` | plain copy (no "corridor sync"/bare spinner); `ErrorState role="alert"`; retry calls handler |

```tsx
// components/ui/Term.test.tsx
it("Term shows plain words in Simple and reveals the acronym only on focus", async () => {
  render(<ModeProvider forceMode="simple"><Term k="pc">collision chance</Term></ModeProvider>);
  expect(screen.getByText("collision chance")).toBeInTheDocument();
  expect(screen.queryByText(/Pc/)).not.toBeInTheDocument();       // no jargon in default view (Law 2)
  await userEvent.tab();                                          // keyboard focus
  expect(await screen.findByText(/Probability of collision/)).toBeVisible(); // tooltip on FOCUS (a11y)
});

it("RiskMeter exposes role=meter and the plain risk word", () => {
  render(<RiskMeter severity="critical" pc={2.78e-4} />);
  const meter = screen.getByRole("meter", { name: /danger/i });
  expect(meter).toHaveAttribute("data-level", "danger");
  expect(screen.getByText("Danger")).toBeInTheDocument();
});
```

Domain widgets to component-test: `ThreatRow` (one-sentence summary + risk word + tap target),
`BurnResult` (before/after + the human nudge string), `ReportDocument` (sections + export affordance),
`ObjectPanel` ("Show raw data" TLE disclosure).

### 2.3 Data hooks (React Query)

Each `features/use*` hook (doc 04 §5.1) is tested against a **mocked `lib/api`** with a fresh
`QueryClient` (retries off) so loading/error/success are deterministic.

```ts
// features/useThreatDetail.test.tsx
function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it("surfaces loading → success", async () => {
  vi.spyOn(api, "conjunctionDetail").mockResolvedValue(fixtureDetail);
  const { result } = renderHook(() => useThreatDetail("conj-protect-isro-001"), { wrapper: wrap() });
  expect(result.current.isPending).toBe(true);
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.conjunction_id).toBe("conj-protect-isro-001");
});

it("maps a typed ApiError so ErrorState can render a plain message (doc 04 §5.3)", async () => {
  vi.spyOn(api, "conjunctionDetail").mockRejectedValue(new ApiError("conjunction_not_found", "…"));
  const { result } = renderHook(() => useThreatDetail("nope"), { wrapper: wrap() });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect((result.current.error as ApiError).code).toBe("conjunction_not_found");
});
```

Mutations (`usePlanManeuver`, `useApplyManeuver`, `useReport`) assert `onSuccess` cache updates and
that `isPending` drives the button's `loading` state.

### 2.4 E2E — migrate to @playwright/test (recommended)

**Recommendation: replace the bespoke `e2e/orbitguard.e2e.mjs` node script with `@playwright/test`.**

Why (brief justification):

- The current script hand-rolls Chrome discovery, a `main()` try/finally, and `process.exit(1)` on
  throw. `@playwright/test` gives us **auto-managed browsers** (`npx playwright install`),
  **parallelism + retries + traces/screenshots/video on failure**, a **`webServer`** block that boots
  the app, **projects** for desktop/mobile and reduced-motion, and tag filtering (`@a11y`, `@visual`).
- It targets the **old routes** (`/mission`, `/catalog`, `/risk`, `/reports`) and old copy ("Mission
  Sync", "Burn scan armed"). Those routes/strings are deleted by docs 03–04, so the script must be
  rewritten anyway — migrating is the cheaper path and removes ~200 lines of bespoke harness.
- Crucially, its drag check asserts only `Math.abs(yaw - start) > 0.06` — it verifies the camera
  **moved**, not the **direction**, so it **cannot catch the reversed-drag bug** (doc 07 §0). The new
  3D smoke test (§2.5) fixes that.

`make test-e2e` keeps working because `npm run test:e2e` is repointed to `playwright test`.

Config boots the **production build** (catch real bundling issues) + the offline backend:

```ts
// frontend/playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://localhost:5173", trace: "on-first-retry", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile",  use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "reduced-motion", use: { ...devices["Desktop Chrome"], reducedMotion: "reduce" } },
  ],
  webServer: [
    { command: "npm run preview -- --port 5173", url: "http://localhost:5173", reuseExistingServer: !process.env.CI },
    { command: "make run-backend", url: "http://localhost:8000/api/health", reuseExistingServer: !process.env.CI,
      // OFFLINE + deterministic: no CelesTrak reachable → Protect ISRO uses fixtures (doc 08 §7)
      env: { ORBITGUARD_CELESTRAK_TIMEOUT_S: "0.001" } },
  ],
});
```

The E2E suite must cover, on the **new** routes:

1. **Route reachability + legacy redirects** — every new route renders its one job; old URLs redirect
   (`/mission → /sky`, `/catalog → /sky`, `/risk → /threats`, `/predictor → /avoidance`,
   `/reports → /report`, `/architecture → /system`, `* → /`) (doc 03 §2).
2. **Full journey** — Home CTA → Sky → Threats → Threat detail → Avoidance (risk red→green +
   double-check) → Report export. This is the demo gate (§4).
3. **Guided demo** — `▶ Demo` dims chrome and walks Home→Sky→Threats→Avoidance→Report with Next; it
   is removable (doc 03 §3.3).
4. **Simple/Pro toggle** — flipping the header toggle changes a visible figure from plain
   ("about 1 in 3,600") to scientific ("2.78 × 10⁻⁴") and persists across a reload (localStorage,
   doc 03 §7); **no acronyms visible in Simple** on any journey screen.
5. **Scenario switching** — the Threats `ScenarioTabs` switch Protect ISRO ↔ 2009 ↔ Kessler and the
   journey runs end-to-end for **all three** (plan→apply→report), proving de-hardcoding (doc 08 §6).
6. **Status states** — each route's loading skeleton + a forced error (route the API to a 500) shows
   a plain `ErrorState` with retry, never a raw body.

### 2.5 3D smoke (the drag-direction regression lives here)

The scene must expose deterministic, readable state for tests (Appendix A): the `.earth-scene`
container carries `data-azimuth`, `data-polar`, `data-distance` (the live OrbitControls values) and
`data-webgl="on|fallback"`. With drei `<OrbitControls>` (doc 07 §3) the **correct** behavior is:
**drag right → the globe surface follows the cursor → the azimuthal angle decreases** (three.js
`rotateLeft` convention). The old reversed bug did the opposite — so we assert the **sign**, not just
that it changed.

```ts
// frontend/e2e/earth.spec.ts
import { test, expect } from "@playwright/test";

const az = (page) => page.locator(".earth-scene").first()
  .evaluate((n) => Number(n.dataset.azimuth));

test("@3d drag-direction is 'grab the globe' (regression for reversed drag, doc 07 §0/§12)", async ({ page }) => {
  await page.goto("/sky");
  await page.locator(".earth-scene canvas").waitFor();
  await expect(page.locator(".earth-scene canvas")).toHaveCount(1); // exactly one WebGL context (doc 04 §6)

  const box = await page.locator(".earth-scene").first().boundingBox();
  const cx = box!.x + box!.width / 2, cy = box!.y + box!.height / 2;

  const before = await az(page);
  await page.mouse.move(cx - 140, cy);     // start left of center
  await page.mouse.down();
  await page.mouse.move(cx + 140, cy, { steps: 16 }); // DRAG RIGHT
  await page.mouse.up();
  const after = await az(page);

  // Correct: dragging right rotates the camera so the surface moves right → azimuth DECREASES.
  // The reversed-drag bug would make `after > before`; this assertion is what catches it.
  expect(after).toBeLessThan(before - 0.05);
});

test("@3d zoom in via wheel decreases camera distance within limits", async ({ page }) => {
  await page.goto("/sky");
  const dist = () => page.locator(".earth-scene").first().evaluate((n) => Number(n.dataset.distance));
  const d0 = await dist();
  const box = await page.locator(".earth-scene").first().boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, -500);
  await expect.poll(dist).toBeLessThan(d0);          // zoomed in
  await expect.poll(dist).toBeGreaterThanOrEqual(3.2); // respects minDistance (doc 07 §3)
});

test("@3d reduced-motion renders a static but draggable scene", async ({ page }) => {
  // project "reduced-motion" sets prefers-reduced-motion: reduce
  await page.goto("/sky");
  await expect(page.locator(".earth-scene canvas")).toHaveCount(1); // still renders, no broken canvas
});

test("@3d no-WebGL falls back to a static globe, never a black box (doc 07 §10.2)", async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error force WebGL unavailable
    HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : orig.call(this, t, ...a); };
  });
  await page.goto("/sky");
  await expect(page.locator('.earth-scene[data-webgl="fallback"]')).toBeVisible();
});
```

Also assert (3D acceptance, doc 07 §12): keyboard rotates (arrow keys move `data-azimuth`), the
reset button/`R` restores the route framing (`data-distance`/`data-azimuth` return to the preset),
and the canvas has a visible focus ring when tab-focused.

### 2.6 Backend (pytest) — keep 74 green, add the doc 08 §11 tests

Do **not** modify the 74 existing tests except the **one** rewrite doc 08 §2.4 requires (the
CelesTrak fallback test now patches `client.app.state.container.catalog` instead of a module global).
Add the nine new tests (named to match doc 08 §11):

| # | Test (suggested name) | Asserts |
|---|---|---|
| 1 | `test_unhandled_exception_returns_structured_500` | a throwaway raising route → `500` with `error.code == "internal_error"`; the raw message is **not** leaked (doc 08 §3). Use `TestClient(app, raise_server_exceptions=False)` |
| 2 | `test_ready_endpoint_ready_and_not_ready` | `GET /api/ready` → `200 status=="ready"`; with a `DemoService(root=tmp_path)` override → `503`, `missing_required_count > 0` (doc 08 §9) |
| 3 | `test_apply_generalized_2009_replay` | apply `maneuver-plan-2009-replay-001`/`mnv-2009-replay-a` → `200`; `secondary_status in {"clear","warning"}` (doc 08 §6.3) |
| 4 | `test_apply_generalized_kessler` | apply `…kessler-sandbox…` → `200`; `after.miss_distance_m > before.miss_distance_m` |
| 5 | `test_apply_wrong_candidate_and_unknown_plan` | bogus candidate → `422 candidate_not_recommended`; unknown plan → `404 plan_not_found` |
| 6 | `test_report_generalized_2009_and_kessler` | `POST /api/reports` then `GET` → derived `report-2009-replay-001`/`report-kessler-sandbox-001`; title contains the scenario title |
| 7 | `test_dynamic_conjunction_get_after_screen` | screen a scenario, take a returned `conjunction_id`, `GET /api/conjunctions/{id}` → `200` full detail (proves the §8 cache) |
| 8 | `test_computation_mode_flag` | empty-SGP4 fixture path → `computation_mode=="fixture-fallback"`; normal screen → `"sgp4"` (doc 08 §7) |
| 9 | `test_logging_smoke` | `caplog` captures an `orbitguard.*` INFO record on screen/apply (boundary logging can't silently regress) |

End state: **74 (74th adjusted) + 9 new, all green** (doc 08 §11).

```python
# backend/tests/test_errors.py
from fastapi.testclient import TestClient
from app.main import create_app

def test_unhandled_exception_returns_structured_500() -> None:
    app = create_app()

    @app.get("/api/_boom")
    def _boom():
        raise RuntimeError("kaboom")

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/api/_boom")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "internal_error"
    assert "kaboom" not in response.text  # real error is logged server-side, never leaked
```

### 2.7 Accessibility

Run **axe** on every route (Simple **and** Pro) and fail on `serious`/`critical` violations. Plus
targeted keyboard/focus checks that axe can't see.

```ts
// frontend/e2e/a11y.spec.ts
import AxeBuilder from "@axe-core/playwright";
const ROUTES = ["/", "/sky", "/threats", "/threats/conj-protect-isro-001",
                "/avoidance", "/report", "/learn", "/system"];

for (const path of ROUTES) {
  test(`@a11y ${path} has no serious/critical axe violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a","wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => ["serious","critical"].includes(v.impact ?? ""));
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}
```

Manual/scripted a11y gates (doc 05 §1.5, doc 02 §9):

- **Focus ring** visible (cyan) on every interactive element when tabbed.
- **Keyboard nav**: the whole journey is operable without a mouse; the 3D canvas is `tabIndex=0` and
  arrow-operable (§2.5).
- **Tooltip on focus**: `<Term>`/`InfoDot` open on keyboard focus, not hover-only.
- **Reduced motion**: in the `reduced-motion` project, no idle globe drift, no count-up tween, no
  pulse; states still change instantly.
- **One `<h1>` per route** (`page.getByRole("heading", { level: 1 })` has count 1).

### 2.8 Visual QA

Capture a screenshot of **each route at desktop (1440) and mobile (390)** (the `desktop` + `mobile`
Playwright projects) for human review, plus automated structural assertions for the things a judge
notices instantly.

```ts
// frontend/e2e/visual.spec.ts
for (const path of ROUTES) {
  test(`@visual ${path} screenshot + structure audit`, async ({ page }, testInfo) => {
    await page.goto(path);
    // no horizontal overflow (kept from the old e2e — a real, frequent regression)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    // no leftover placeholder / jargon copy (doc 01 Law 6 — "no 'sync/arming' placeholder")
    const body = (await page.locator("body").innerText()).toLowerCase();
    for (const bad of ["corridor sync","arming","booting","loading demo readiness","undefined","nan","[object object]"])
      expect(body, `leaked placeholder: ${bad}`).not.toContain(bad);
    await testInfo.attach(`${path}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  });
}
```

**Light audit checklist** a reviewer ticks per screenshot (doc 01 Laws 1/3/6):

- [ ] **One focal element** in the first viewport (Law 1/3) — not a wall of panels.
- [ ] **No horizontal overflow** at 1440 and 390.
- [ ] **No jargon in Simple mode** — no bare `Pc`, `TCA`, `Δv`, `NORAD`, `TLE` visible.
- [ ] **No placeholder copy** — no "sync", "arming", "booting", "Loading…", `undefined`, `NaN`.
- [ ] **Risk color is consistent** with severity everywhere it appears on the screen.
- [ ] Whitespace > borders; neon is an accent, not a fill (Law 3).

---

## 3. Per-route acceptance checklists (map to the 7 UX laws)

A reviewer ticks these before a route is marked **done** (doc 04 §7 step 4). Laws referenced are
doc 01 §3: **L1** one job · **L2** plain words first · **L3** breathe · **L4** progressive
disclosure · **L5** motion explains · **L6** status obvious · **L7** consistency.

### Home (`/`)

- [ ] **L1** Fullscreen Earth + one headline + **one** CTA ("See a live threat"); nothing competes.
- [ ] **L3** First viewport is the globe + headline only; "how it works" + proof stats are below the fold.
- [ ] **L2** Headline is plain English; any term wrapped in `<Term>`.
- [ ] **L5** Globe auto-rotates slowly; pauses on interaction; respects reduced-motion.
- [ ] **L6** No "booting"/"sync" copy; if data is offline, a single `LiveChip` says "Offline demo data".
- [ ] **L7** CTA is the canonical `Button` primary; one `<h1>`.

### Sky (`/sky`)

- [ ] **L1** The globe is the star; a thin object filter + Globe/List toggle are secondary.
- [ ] **L4** Clicking an object opens a clean panel with plain info; **"Show raw data"** reveals the TLE.
- [ ] **L2** Panel labels plain ("Catalog number", "Orbit data") with `<Term>` tooltips.
- [ ] **L7** Selecting reflects in `?object=<id>`; List rows use `DataRow`; risk colors match the globe.
- [ ] **L6** Loading shows a skeleton + "Loading the latest orbit data…"; empty filter shows `EmptyState`.
- [ ] **3D** Drag/zoom/keyboard correct (doc 07 §12); exactly one canvas.

### Threats (`/threats`)

- [ ] **L1** A single calm ranked list; one tap → detail.
- [ ] **L2** Each row reads as a sentence: *who* is at risk, *from what*, *when*, *how bad* (word+color first).
- [ ] **L4** Raw Pc/numbers behind the row's detail, not on the row in Simple.
- [ ] **L7** Scenario switch is `ScenarioTabs` (Protect ISRO / 2009 / Kessler), reflected in `?scenario=`.
- [ ] **L6** Empty: "No threats right now. Pick a scenario to see one."; error → `ErrorState` + retry.

### Threat detail (`/threats/:id`)

- [ ] **L1** One close approach explained; **one** CTA: "Plan the safe move."
- [ ] **L2** Plain story first ("600 m apart — very close"); `RiskMeter` shows the word, number second.
- [ ] **L4** "Show details" reveals covariance/assumptions and the `computation_mode` "demo geometry" badge when fixture-fallback (doc 08 §7).
- [ ] **L3** A focused mini-globe with the encounter pair + threat line; no extra columns.
- [ ] **L6** Unknown id → plain `ErrorState` (the typed `conjunction_not_found`), not a 404 page.

### Avoidance (`/avoidance`) — the hero beat

- [ ] **L1** Earth + one button ("Find the safe move"); result appears **in place**.
- [ ] **L5** Risk animates **red→green**; the `Steps` connector fills; secondary "double-check ✓" follows.
- [ ] **L2** Human nudge description ("a tiny 0.12 m/s nudge moves it from 600 m to 8.4 km away").
- [ ] **L4** "Show details" reveals the candidate grid + delta-v table (Pro).
- [ ] **L6** During compute: a plain "Scanning…" on the button (`loading`), never a bare spinner.
- [ ] **Honesty** Secondary result reflects the real status (`clear` for Protect ISRO; `warning` honestly for scenarios without a fixture, doc 08 §6.3).

### Report (`/report`)

- [ ] **L1** One printable briefing; **one** "Export" action.
- [ ] **L4** Source IDs/assumptions behind "Show details."
- [ ] **L2** Briefing prose is plain; terms wrapped; numbers respect Simple/Pro.
- [ ] **Export** Produces a Markdown file containing the scenario title, the recommendation, and "Assumptions".
- [ ] **L7** Title is scenario-derived (doc 08 §6.4): "Protect ISRO Maneuver Brief" / "2009 …" / "Kessler …".

### Learn (`/learn`)

- [ ] **L2** Plain-English explainer with analogies; the glossary backs every `<Term>` tooltip (doc 05 §4).
- [ ] **L3** Scrollable sections with generous rhythm; one idea per section.
- [ ] **L7** Promoted to top-level nav (not hidden under a dropdown, doc 03 §3.1).
- [ ] **L4** Deeper math is opt-in, never blocking the explanation.

### Under the Hood (`/system`)

- [ ] **L1** Pipeline diagram + engines + validation matrix, explicitly "for the engineers."
- [ ] **L6** Reflects real readiness from `/ready` (doc 08 §9); no "loading readiness…" leak.
- [ ] **Honesty** States limitations honestly (2D-Gaussian Pc surrogate, along-track surrogate, doc 08 §13).
- [ ] **L7** Reachable from footer + Report/Learn; consistent components.

---

## 4. The DEMO ACCEPTANCE GATE

> The single most important test. The 3-minute **Protect ISRO** demo must pass **end-to-end,
> OFFLINE, deterministically** — same result every run, no network. This is README principle #6 and
> doc 01 §1. It is encoded as `e2e/demo-gate.spec.ts` and is **the** blocker for any release.

**Preconditions (deterministic + offline):** built frontend via `vite preview`; backend up with
CelesTrak effectively unreachable (`ORBITGUARD_CELESTRAK_TIMEOUT_S` tiny) so Protect ISRO uses the
committed fixtures; `GET /api/ready` returns `200 status=="ready"` before the run.

**Ordered checklist (each step is an assertion):**

1. **Boot** — `/` renders the cinematic Earth + headline + the one CTA within 3 s; **no** placeholder
   copy ("booting"/"sync"); `LiveChip` reads "Offline demo data".
2. **Sky** — CTA (or `▶ Demo`) lands on `/sky`; the globe shows glowing, risk-colored satellites
   (not 2–3px dots); exactly one canvas; drag direction correct (§2.5 already guards this).
3. **Threats** — `/threats` shows the ranked list with Protect ISRO selected; the top row names the
   protected asset + the threat in a plain sentence with a **Danger** word+color.
4. **Threat detail** — tapping the top row opens `/threats/conj-protect-isro-001`; plain story shows
   "≈600 m — very close"; `RiskMeter` = **Danger**; one CTA "Plan the safe move."
5. **Avoidance — the turn** — "Find the safe move":
   - risk meter transitions **Danger → Safe** (red→green);
   - the human nudge text appears ("a tiny 0.12 m/s nudge … from 600 m to 8.4 km away");
   - the **double-check** result appears: "We also checked — this nudge doesn't put it near anything
     else." with `data-status="clear"` (secondary screening clear).
6. **Report + export** — `/report` shows the "Protect ISRO Maneuver Brief"; "Export" downloads a
   Markdown file containing `OrbitGuard`, the recommendation `mnv-protect-isro-a`, and `Assumptions`.
7. **The "non-space person understands it" check** — across steps 1–6 in **Simple** mode, assert
   **zero** raw acronyms are visible (`Pc`, `TCA`, `Δv`/`delta-v`, `NORAD`, `TLE`, `RAAN`) and that
   the journey copy is plain sentences. (A human reviewer also confirms: *"could someone who knows
   nothing about space narrate what just happened?"* — the README success bar.)
8. **Determinism** — run the gate **twice**; the recommendation id, before/after miss distances, and
   the secondary status are **identical** both runs (no randomness, no clock dependence in offline mode).

Sample — the avoidance **risk-collapse** assertion (the emotional core, doc 01 §6 / §2):

```ts
// frontend/e2e/demo-gate.spec.ts
import { test, expect } from "@playwright/test";

test("@demo avoidance collapses risk red→green and double-checks the new path", async ({ page }) => {
  await page.goto("/avoidance?scenario=protect-isro");

  // BEFORE: the risk is Danger.
  const meter = page.getByTestId("risk-meter");
  await expect(meter).toHaveAttribute("data-level", "danger");

  // THE TURN: one button, result in place (Law 1).
  await page.getByRole("button", { name: /find the safe move/i }).click();

  // AFTER: risk meter goes to Safe (red→green, Law 5).
  await expect(meter).toHaveAttribute("data-level", "safe", { timeout: 10_000 });

  // The plain-language nudge story (Law 2) — no jargon.
  await expect(page.getByText(/m\/s nudge/i)).toBeVisible();
  await expect(page.getByText(/effectively zero/i)).toBeVisible();

  // The TRUST beat: secondary "double-check" is clear (doc 01 §6, doc 08 §6.3).
  const secondary = page.getByTestId("secondary-check");
  await expect(secondary).toHaveAttribute("data-status", "clear");
  await expect(secondary).toContainText(/doesn.t put it near anything else/i);

  // Honesty: no acronyms leaked in Simple mode on this screen.
  const body = (await page.locator("body").innerText());
  for (const jargon of ["Pc", "TCA", "Δv", "NORAD", "RAAN"]) expect(body).not.toContain(jargon);
});
```

---

## 5. Performance budgets

| Budget | Target | How to measure |
|---|---|---|
| **Initial route JS** | **< 250 KB gzip** per route (doc 04 §6) | `vite build` + `rollup-plugin-visualizer` (or `vite-bundle-visualizer`); a size-check script fails CI if the entry/route chunk exceeds budget |
| **3D chunk** | **lazy**, loaded only on Home/Sky/Threat-detail/Avoidance; not in the initial chunk of text routes (Threats/Report/Learn/System) | inspect the build manifest: `earth/*` + R3F/drei/postprocessing land in a separate `EarthCanvas-*.js` chunk |
| **Frame rate** | **~60 fps** at Home framing on a typical laptop iGPU (doc 07 §12) | a dev `stats.js`/`r3f-perf` overlay; Playwright trace + `performance` marks for a coarse check; manual DevTools Performance capture |
| **Lighthouse (built app)** | Performance ≥ **85**, Accessibility ≥ **95**, Best-Practices ≥ **95** | `@lhci/cli autorun` against `vite preview`, or manual Lighthouse on `/` and `/sky` |
| **Single WebGL context** | exactly **1** `<canvas>` mounted at any time (doc 04 §6) | E2E assertion `toHaveCount(1)` on `.earth-scene canvas` (already in §2.5) |
| **Fonts** | self-hosted, `font-display: swap`, display font preloaded (doc 04 §6) | check no runtime `fonts.googleapis.com` request in the Playwright network log |

Concrete measurement commands:

```bash
# Bundle sizes (gzip) per chunk
cd frontend && npm run build && npx vite-bundle-visualizer   # writes stats.html; eyeball entry vs earth chunk

# Lighthouse on the production preview (CI-friendly)
cd frontend && npm run build && npx @lhci/cli autorun --collect.url=http://localhost:5173/ \
  --collect.url=http://localhost:5173/sky --collect.startServerCommand="npm run preview -- --port 5173"
```

A tiny budget guard (run in CI after build) keeps the 250 KB line honest:

```bash
# scripts/check-bundle-size.sh — fail if any initial route chunk exceeds 250KB gzip
max=256000
for f in frontend/dist/assets/index-*.js frontend/dist/assets/*Route-*.js; do
  sz=$(gzip -c "$f" | wc -c)
  if [ "$sz" -gt "$max" ]; then echo "BUDGET FAIL: $f is ${sz}B gzip (> ${max})"; exit 1; fi
done
echo "bundle budget OK"
```

---

## 6. Regression protection

### 6.1 What must NEVER break

1. **Offline Protect ISRO determinism** — the demo gate (§4) passes twice with identical numbers, no
   network. This is the product's whole promise (README #6, doc 01 §7).
2. **The 74 backend contracts** — every existing pytest stays green; the public HTTP shapes
   (`plan`/`apply`/`report`/`conjunctions`/`scenarios`/`catalogs`/`health`) are unchanged except
   **additive** fields (`computation_mode`) and **new** endpoints (`/ready`). The one allowed test
   change is the DI rewrite (doc 08 §2.4).
3. **One consistent error envelope** — every failure (4xx/422/500) returns `{"error":{code,message,
   details}}` (doc 08 §3). A `detail`-shaped body is a regression.
4. **Drag direction** — the §2.5 sign assertion guards the reversed-drag bug forever.
5. **Plain-language guarantee** — no acronyms in Simple mode on the journey (§4 step 7, §2.8 audit).
6. **No horizontal overflow** at 1440/390 (§2.8).

### 6.2 The local gate (run before every push)

```bash
# from repo root — the four commands, mapped to make targets
make build-frontend   # npm run build         → catches type + bundling regressions
make test-frontend    # npm test (vitest)     → unit + component + hooks
make test-e2e         # npm run test:e2e      → Playwright journey + 3D + a11y + visual
make test-backend     # pytest                → 74 + 9 new, all green

# or all at once:
make release-check    # ./scripts/release_check.sh — the full local release gate
```

`scripts/release_check.sh` should run, in order and **fail-fast**:

```bash
#!/usr/bin/env bash
set -euo pipefail
echo "==> backend tests";   make test-backend
echo "==> frontend build";  make build-frontend
echo "==> bundle budget";   bash scripts/check-bundle-size.sh
echo "==> frontend unit";   make test-frontend
echo "==> e2e + 3d + a11y + visual"; make test-e2e
echo "release-check: PASS"
```

> Order rationale: cheapest/most-fundamental first (backend units, then the build), so a broken build
> fails in seconds before the multi-minute E2E. The demo gate (§4) is part of `make test-e2e` and is
> the last, decisive check.

---

## 7. CI suggestion (lightweight)

One workflow, two jobs (backend + frontend), runs on each PR and on `main`. Keep it lean — this is a
hackathon, not a release train. Pin action versions and use least-privilege permissions.

```yaml
# .github/workflows/ci.yml
name: ci
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read          # least privilege (no write token needed for tests)
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12", cache: pip }
      - run: pip install -r backend/requirements-dev.txt
      - run: PYTHONPATH=backend pytest backend/tests -q   # 74 + 9 new must pass
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: npm, cache-dependency-path: frontend/package-lock.json }
      - run: npm ci --prefix frontend           # deterministic install (lockfile)
      - run: npm run build --prefix frontend     # type + bundle gate
      - run: bash scripts/check-bundle-size.sh   # <250KB gzip budget
      - run: npm test --prefix frontend          # vitest unit + component + hooks
      - run: npx playwright install --with-deps chromium
        working-directory: frontend
      - run: npm run test:e2e --prefix frontend  # journey + 3D + @a11y + @visual + @demo gate
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: frontend/playwright-report }
```

The **gate sequence on each change** (mirrors §6.2): `pytest → build → bundle budget → vitest →
playwright (journey + 3D + a11y + visual + demo gate)`. Block merge on any failure; upload the
Playwright HTML report + screenshots on failure for quick triage.

---

## 8. Traceability — every change maps to a test

| Area (doc) | New thing | Covered by |
|---|---|---|
| **/** Home (03/06-01) | hook, one CTA, hero globe | `demo-gate.spec` step 1 · `visual.spec /` · `a11y.spec /` · `earth.spec` (canvas mounts) |
| **/sky** (03/06-02) | merged globe+catalog, object panel, TLE disclosure, `?object=` | `journey.spec` (select object) · `ObjectPanel.test` (Show raw data) · `earth.spec @3d` · `a11y/visual /sky` |
| **/threats** (03/06-03) | ranked plain list, `ScenarioTabs`, `?scenario=` | `journey.spec` (scenario switch ×3) · `ThreatRow.test` · `a11y/visual /threats` |
| **/threats/:id** (03/06-04) | one encounter, RiskMeter, "Plan the safe move", demo-geometry badge | `demo-gate.spec` step 4 · `useThreatDetail.test` (success/error) · `RiskMeter.test` · `a11y /threats/:id` |
| **/avoidance** (03/06-05) | red→green, human nudge, secondary double-check, candidate grid | **`demo-gate.spec` risk-collapse** · `BurnResult.test` · `useApplyManeuver.test` · `visual /avoidance` |
| **/report** (03/06-06) | one briefing, scenario-derived title, Markdown export | `demo-gate.spec` step 6 (download asserts content) · `ReportDocument.test` · `a11y/visual /report` |
| **/learn** (03/06-07) | promoted explainer, glossary backs `<Term>` | `terms.test` (dictionary complete) · `Term.test` · `a11y/visual /learn` |
| **/system** (03/06-08) | engineer view, real `/ready` posture, honest limits | `journey.spec` (readiness chip) · `a11y/visual /system` |
| **Legacy redirects** (03 §2) | `/mission,/catalog,/risk,/predictor,/reports,/architecture,*` | `journey.spec` redirect cases |
| **Simple/Pro** (01 §4, 05 §7) | `formatPlain`/`formatPro`, `ModeToggle`, persistence | `format.test` · `Term.test` (Simple hides acronym) · `journey.spec` (toggle flips a figure + persists) |
| **3D scene** (07) | OrbitControls drag fix, zoom, reduced-motion, no-WebGL fallback | **`earth.spec @3d` drag-direction sign** · zoom-limit · reduced-motion project · `data-webgl="fallback"` |
| **Global 500 envelope** (08 §3) | catch-all `Exception` handler | `test_unhandled_exception_returns_structured_500` |
| **/ready** (08 §9) | readiness vs liveness | `test_ready_endpoint_ready_and_not_ready` |
| **Generalized apply** (08 §6.3) | 2009 + Kessler + guards | `test_apply_generalized_2009_replay` · `test_apply_generalized_kessler` · `test_apply_wrong_candidate_and_unknown_plan` |
| **Generalized report** (08 §6.4) | scenario-derived id/title | `test_report_generalized_2009_and_kessler` |
| **Dynamic conjunction GET** (08 §8) | screening cache → GET any screened id | `test_dynamic_conjunction_get_after_screen` |
| **`computation_mode`** (08 §7) | sgp4 vs fixture-fallback honesty | `test_computation_mode_flag` · `/threats/:id` "demo geometry" badge (`visual`) |
| **Structured logging** (08 §4) | boundary log lines | `test_logging_smoke` (`caplog`) |
| **DI container** (08 §2) | shared services, rewritten CelesTrak test | the adjusted `test_live_catalog_refresh_endpoint_returns_live_or_fallback_contract` |
| **Perf budgets** (04 §6) | <250KB initial, lazy 3D chunk, 60fps | `scripts/check-bundle-size.sh` · build manifest review · Lighthouse CI |

---

## Appendix A — Test hooks the implementation must expose

These keep E2E/3D tests stable and decoupled from styling. They are cheap data attributes /
`data-testid`s the redesign components add (no behavior change). Treat this as a **contract** between
Agents B/C/D and the tests.

| Hook | On | Value | Used by |
|---|---|---|---|
| `data-azimuth`, `data-polar`, `data-distance` | `.earth-scene` container | live OrbitControls numbers | `earth.spec @3d` (drag sign, zoom, reset) |
| `data-webgl` | `.earth-scene` container | `"on"` \| `"fallback"` | no-WebGL fallback test |
| `data-testid="risk-meter"` + `data-level` | `RiskMeter` | `safe\|watch\|warning\|danger` | demo gate risk-collapse, `RiskMeter.test` |
| `data-testid="secondary-check"` + `data-status` | avoidance double-check result | `clear\|warning` | demo gate trust beat |
| `data-computation-mode` | threat detail / report assumptions | `sgp4\|fixture-fallback` | honesty badge (`visual`) |
| Accessible names on CTAs | `Button`s | "Find the safe move", "Plan the safe move", "Export", "Zoom in" | journey + demo gate |
| `role="meter"`, `role="alert"`, one `role="heading" level=1` | meters, errors, page header | — | a11y + component tests |

> Prefer accessible names and `role`s first; use `data-testid`/`data-*` only for state that has no
> natural accessible representation (camera angles, internal status). This honors doc 05 §1.5 (test
> the contract, not the markup).

---

## Appendix B — Mapping to the old test setup (what changes)

| Old | New | Reason |
|---|---|---|
| `e2e/orbitguard.e2e.mjs` (bespoke node + `playwright-core`) | `e2e/*.spec.ts` (`@playwright/test`) | managed browsers, retries, traces, projects, tags (§2.4) |
| routes `/mission /catalog /risk /reports` | `/sky /threats /report` + redirects | docs 03–04 IA change |
| drag test: `Math.abs(yaw-start) > 0.06` | drag test: **signed** `after < before` | catch the reversed-drag bug (§2.5) |
| `data-cameraYaw` / `data-cameraZoom` | `data-azimuth` / `data-polar` / `data-distance` | OrbitControls model (doc 07) |
| `format.test.ts` (mode-agnostic) | mode-aware `format.test.ts` (`simple`/`pro`) | doc 05 §7 formatter contract |
| 74 pytest | 74 (1 adjusted) + 9 new | doc 08 §11 |
| `playwright-core` dep | `@playwright/test` (+ `@axe-core/playwright`, RTL, jsdom) | §2.0 |
