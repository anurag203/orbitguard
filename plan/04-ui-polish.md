# Plan 04 — UI/UX Polish to First-Place Quality

Source: `plan/audit/ui-ux-audit.md` (+ screenshots in `plan/audit/screens/`).

## P0 — demo-breaking
### 1. The "41 hours ago" time bug
`relativeFromNow()` (`lib/format.ts`) compares fixed fixture TCAs to real `now`, so the story reads
"will pass … 41 hours ago." Fix with a **front-end demo clock**:
- Add `frontend/src/lib/demoClock.ts`:
  - `DEMO_EPOCH` = a constant ISO equal to the fixtures' intended "now" (derive from the data: the
    earliest scenario TCA minus a sensible lead, e.g. so the top conjunction reads ~"in 18 hours").
  - `demoOffsetMs()` = `Date.now() - Date.parse(DEMO_EPOCH)`.
  - `demoDate(iso)` = `new Date(Date.parse(iso) + demoOffsetMs())`.
- Route all scenario-derived timestamps (TCA, burn time, screened-at) through `demoDate()` before
  formatting. Keeps backend determinism + unit tests intact (they pass an explicit `now`).
- Verify the headline now reads "in ~18 hours" / a live countdown, never "ago".

### 2. `whileInView` blank-content hardening (`components/ui/Section.tsx`)
Content gated behind `whileInView` can render blank (judges/screenshots/odd layouts). Harden:
- Trigger earlier: `viewport={{ once: true, amount: 0.15, margin: "0px 0px -10% 0px" }}`.
- Ensure reduced-motion path shows content fully (already true — keep).
- Confirm no first-viewport content depends on scroll to appear.

## P1 — clarity & polish
### 3. Empty / thin layouts
- `/threats`: one card floating in ~85% void. Add a left "worklist" rhythm: ranked rows fill the
  column, a right rail summarizes the selected encounter (or a calm empty state with scenario tabs).
- `/report`: empty by default. Add a clear "Generate briefing" hero state + skeleton while building,
  and a richer document layout once generated.

### 4. Protected asset shown red "Danger"
The protected asset (CARTOSAT-2F) is colored red like the debris in threat rows. The *conjunction*
is dangerous, but the protected satellite should not wear the debris/danger color. In
`routes/threats/*` (ThreatRow / threats.lib), color the **conjunction severity** distinctly from the
**protected asset** chip (protected = cyan/safe accent; threat object = risk color).

### 5. Globe & list readability
- Default a couple of hero labels on (so the globe isn't anonymous) without re-cluttering (works with
  the Sky field change — labels only for hero/selected).
- Fix mobile list name truncation in the object list.

## P2 — finish
- Overlapping controls: tour card vs. globe controls; scroll hint vs. camera controls (z-index +
  spacing).
- Replace placeholder `00:00 UTC` / `--` strings with real or hidden values.
- Consistent section spacing/rhythm across routes.

## File ownership (to stay disjoint from the Sky + Tour subagents)
This bundle owns: `lib/format.ts`, new `lib/demoClock.ts`, `components/ui/Section.tsx`,
`routes/threats/**`, `routes/report/**`, `routes/home/**` (proof reveal), `routes/learn/**`,
`routes/system/**`. **Does NOT touch** `routes/sky/**` or `components/earth/**` (owned by Sky) or
`app/**` (owned by Tour).

## Acceptance
- No "ago" anywhere in the demo narrative; top conjunction reads as near-future.
- All route content visible without depending on scroll reveal (and still animates on scroll).
- `/threats` and `/report` feel full and intentional at desktop + mobile.
- Protected asset never wears the danger color; severity color is unambiguous.
- Existing Vitest + Playwright (a11y, visual no-overflow, journey) stay green.
