# 04 — Frontend Architecture & Stack

The technical foundation for the redesigned frontend. Defines what we install, how we structure
code, how we manage state and data, and how we migrate without breaking the green build.

---

## 1. What we keep, add, and remove

### Keep (proven, fine)
- **React 18 + TypeScript + Vite 8** — core.
- **React Router 7** — routing (add `React.lazy` per route for code-splitting).
- **Zustand 5** — UI/app state (mission state, Simple/Pro mode, selections).
- **Framer Motion 12** — UI motion.
- **lucide-react** — icons.
- **three** — 3D engine (now driven via R3F, see below).

### Add
| Library | Why | Notes |
|---|---|---|
| **Tailwind CSS v4** + `@tailwindcss/vite` | Replace 6,300 lines of bespoke CSS with a consistent, minimal utility system tied to our tokens | Single source of theme via `@theme`; see §3 |
| **@react-three/fiber** | Declarative React renderer for three.js | Core of the 3D rebuild (doc 07) |
| **@react-three/drei** | `OrbitControls`, `Stars`, `Html`, `useTexture`, etc. | `OrbitControls` fixes drag direction for free |
| **@react-three/postprocessing** | Bloom, vignette for the cinematic look | Tasteful bloom on emissive satellites/atmosphere |
| **@tanstack/react-query v5** | Robust async state: loading/error/retry/caching for all API calls | Replaces hand-rolled `busy` flags scattered in the store |
| **Radix UI primitives** (`@radix-ui/react-tooltip`, `-tabs`, `-dialog`, `-switch`, `-popover`, `-scroll-area`) | Accessible, unstyled primitives we style with Tailwind | Powers `<Term>` tooltips, Simple/Pro switch, tabs, dialogs |
| **clsx** + **tailwind-merge** (`cn()` helper) | Class composition | clsx already present |

> Optional (only if a real need appears): `@number-flow/react` or a tiny custom hook for animated
> count-ups; `vaul` for mobile sheets. Prefer building tiny things over adding deps.

### Remove / retire
- The bulk of `frontend/src/styles/routes.css` (5,021 lines) and most of `layout.css` — replaced by
  Tailwind utilities + a thin component layer. Keep only what the 3D canvas truly needs.
- The persistent **Mission Sync HUD** and **Demo Director bar** as always-on chrome (replaced by
  inline status + opt-in guided demo, per doc 03).
- Hand-rolled `busy`/`error` orchestration in the store where React Query now owns it.

---

## 2. Why these choices (decision log)

- **Tailwind over keeping bespoke CSS:** the current 6.3k-line, per-route CSS is the structural
  reason the UI can't stay minimal or consistent. Tailwind + our token theme makes "breathe,
  one accent, consistent spacing" the path of least resistance. Utility classes + a few component
  classes (`@layer components`) beat thousands of unique selectors.
- **Radix over a heavy component kit (MUI/Chakra):** we want full control of the neon-noir look
  with accessibility handled for us. Radix is unstyled + accessible; we style with Tailwind. (This
  is the shadcn/ui approach; we can copy shadcn components selectively but keep our own theme.)
- **React Query over store-managed async:** robustness. It gives us consistent loading/error/retry,
  request dedup, and caching, so every screen's status states (doc 03 §5) are trivial and uniform.
  Zustand stays for *client* state (mode, selections, demo step); React Query owns *server* state.
- **R3F + drei over raw three.js:** the 3D rebuild (doc 07) needs OrbitControls, Stars, bloom, and
  maintainable scene composition. Declarative R3F makes satellites, trails, and the starfield
  components instead of 466 lines of imperative setup — and `OrbitControls` removes the reversed-drag bug.

---

## 3. Tailwind theme = the design tokens

Tailwind v4 uses CSS-first config. Create `frontend/src/styles/theme.css`:

```css
@import "tailwindcss";

@theme {
  /* space / surfaces  (base surface is `deep` not `base` -> avoids `text-base` collision) */
  --color-void: #05070E;
  --color-deep: #0A0E1A;
  --color-surface: #111726;
  --color-surface-2: #18202F;

  /* text  (named strong/body/muted/faint -> avoids `text-text-*` double prefix) */
  --color-strong: #F4F8FF;
  --color-body: #C3CEDE;
  --color-muted: #8090A6;
  --color-faint: #586377;

  /* neon */
  --color-cyan: #38E8FF;
  --color-violet: #A571FF;
  --color-magenta: #FF5CD0;

  /* status / risk */
  --color-safe: #34F5C5;
  --color-watch: #6EE7FF;
  --color-warning: #FFC24B;
  --color-danger: #FF5470;

  --radius-md: 12px;
  --radius-lg: 16px;

  --font-sans: "Inter", system-ui, sans-serif;
  --font-display: "Space Grotesk", "Inter", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

This gives utilities like `bg-surface`, `text-cyan`, `text-danger`, `font-display`, `rounded-lg`
that map 1:1 to doc 02. **No raw hex in components.** Glow shadows live as small `@utility` or
component classes (`.glow-cyan`, `.glow-danger`).

Fonts are **self-hosted** under `frontend/public/fonts/` with `@font-face` (offline-safe).

---

## 4. Folder structure (target)

```
frontend/src/
  app/
    App.tsx                 # router + providers (QueryClient, mode, demo)
    routes.tsx              # lazy route definitions + redirects
    providers.tsx           # QueryClientProvider, TooltipProvider, ModeProvider
  routes/                   # one folder per screen (page-level composition only)
    home/HomeRoute.tsx
    sky/SkyRoute.tsx
    threats/ThreatsRoute.tsx
    threats/ThreatDetailRoute.tsx
    avoidance/AvoidanceRoute.tsx
    report/ReportRoute.tsx
    learn/LearnRoute.tsx
    system/SystemRoute.tsx
  components/
    ui/                     # design-system primitives (doc 05): Button, Card, Stat, Badge,
                            # Term, Tooltip, Tabs, Switch, Dialog, RiskMeter, EmptyState, Skeleton...
    layout/                 # TopNav, MobileNav, PageHeader, Footer, GuidedDemo
    earth/                  # R3F scene (doc 07): EarthCanvas, Earth, Satellite, OrbitTrail, Starfield, Atmosphere
    domain/                 # product widgets: ThreatRow, ObjectPanel, BurnResult, ReportDocument...
  features/                 # data hooks per domain (React Query): useScenarios, useThreats,
                            # useThreatDetail, usePlanManeuver, useApplyManeuver, useReport, useCatalog
  lib/
    api.ts                  # typed fetch client (thin) -> used by React Query hooks
    queryClient.ts
    format.ts               # formatPlain()/formatPro(), risk mapping, "1 in N"
    terms.ts                # the plain-language dictionary (doc 03 §6) for <Term>
    cn.ts                   # clsx + tailwind-merge
  state/
    missionStore.ts         # client state only: mode (simple/pro), selections, demo step
  styles/
    theme.css               # Tailwind @theme tokens
    base.css                # @font-face, base resets, body bg
  types.ts                  # shared API types (kept in sync with backend models)
```

Principle: **routes compose; components render; features fetch.** Routes contain almost no logic —
they arrange `domain/` and `ui/` components and call `features/` hooks.

---

## 5. State & data fetching

### 5.1 Server state → React Query
Every backend call becomes a hook in `features/`:
```ts
// features/useThreatDetail.ts
export function useThreatDetail(id: string) {
  return useQuery({
    queryKey: ["threat", id],
    queryFn: () => api.conjunctionDetail(id),
    staleTime: 60_000,
  });
}
```
Mutations (plan, apply, report) use `useMutation` with `onSuccess` cache updates. Loading/error
states come straight from the hook → drive the standard Loading/Empty/Error components (doc 03 §5).

### 5.2 Client state → Zustand (slimmed)
The store keeps only:
- `mode: "simple" | "pro"` (+ persist to localStorage),
- current `scenarioId`, selected `objectId`, selected `threatId`,
- guided-demo step + on/off.

The current store's async actions (`boot`, `loadScenario`, `planAvoidance`, …) are **replaced** by
React Query hooks. This removes the tangled `busy`/`error` flags and the silent `Promise.allSettled`
swallowing noted in the integration audit.

### 5.3 Typed API client
`lib/api.ts` stays a thin typed wrapper over `fetch` to `/api/*` (Vite proxy unchanged). It throws a
typed `ApiError` (matching the backend error envelope from doc 08) so React Query surfaces clean errors.

---

## 6. Code-splitting & performance

- **Lazy-load each route** with `React.lazy` + `Suspense` (fixes the 922 KB single-bundle warning).
- The **3D scene** (`components/earth/*`, R3F, drei, postprocessing) is lazy-loaded and only mounted
  on routes that show it (Home, Sky, Threat detail, Avoidance). One canvas instance pattern; do not
  mount multiple WebGL contexts simultaneously.
- Self-hosted fonts with `font-display: swap`; preload the display font.
- Target: initial JS for a route < 250 KB gzip; 3D chunk loaded on demand.
- Keep `prefers-reduced-motion` and a low-power fallback for the 3D scene (doc 07).

---

## 7. Migration strategy (keep the build green)

We refactor **incrementally on the working baseline**, never a big-bang rewrite:

1. **Scaffold**: install deps, add Tailwind theme + base, add providers (QueryClient, Tooltip,
   Mode), self-host fonts. Build must stay green.
2. **Build the `ui/` kit** (doc 05) in isolation; render a `/__styleguide` (dev-only) page to verify.
3. **Rebuild the 3D scene** (doc 07) as `components/earth/*`, behind the existing `EarthScene` prop
   shape so routes keep working during transition.
4. **Convert routes one at a time** in journey order (Home → Sky → Threats → Threat detail →
   Avoidance → Report → Learn → System). Each conversion swaps bespoke CSS for `ui/` components and
   wires React Query hooks. Keep old route file until the new one passes visual QA.
5. **Delete dead CSS/components** once a route is migrated.
6. **Update E2E** (doc 09) to the new routes/selectors as each lands.

Each step ends with: `npm run build` ✅, `npm test` ✅, route screenshots captured.

---

## 8. Conventions

- `cn()` for class merging; no inline style objects except dynamic 3D/measured values.
- Components are typed, presentational, and read `mode` from context where they show numbers.
- No raw hex, no magic spacing — only theme tokens / Tailwind scale.
- Every jargon string in UI goes through `<Term k="pc">collision chance</Term>` so tooltips and
  Simple/Pro stay consistent.
- Accessibility: Radix handles focus/aria; we must not regress it with custom markup.
