# Plan 02 — Fix the Guided Tour

## Symptom (reproduced)
Tour opens and shows "1 / 5 · Welcome to OrbitGuard". Clicking **Next** does nothing — title and
counter stay at 1/5, URL stays `/`, never reaches Finish, **zero console errors**. `tour-step-1.png`
and `tour-step-2.png` are byte-identical.

## Root cause (high confidence)
`frontend/src/app/GuidedTour.tsx`:
```ts
useEffect(() => {
  if (active) { setStep(0); navigate(STOPS[0].path); }
}, [active, navigate]);            // ← navigate in deps
```
react-router-dom **v7.17** returns a **new `useNavigate()` function identity whenever the location
changes**. So: click Next → `go(1)` → `navigate("/sky")` → location changes → `navigate` identity
changes → this effect re-runs (active still true) → `setStep(0)` + `navigate("/")` → the advance is
instantly undone. The tour is trapped on step 0.

## Fix
1. **Run the reset exactly once per open** (false→true transition) using a ref guard, so a changing
   `navigate` identity can't re-trigger it:
   ```ts
   const openedRef = useRef(false);
   useEffect(() => {
     if (active && !openedRef.current) {
       openedRef.current = true;
       setStep(0);
       navigate(STOPS[0].path);
     } else if (!active) {
       openedRef.current = false;
     }
   }, [active, navigate]);
   ```
2. **Sync step ← location** so manual nav (header links) keeps the tour card honest:
   ```ts
   const location = useLocation();
   useEffect(() => {
     if (!active) return;
     const i = STOPS.findIndex((s) => s.path === location.pathname);
     if (i >= 0) setStep(i);
   }, [active, location.pathname]);
   ```
3. **Avoid arrow-key collision with the 3D Earth.** `EarthCanvas` binds Arrow keys on its focusable
   container; the tour binds them on `window`. While the tour is active, the globe shouldn't also
   rotate on Arrow. Lowest-risk fix: the tour keeps its window listener but the Earth ignores Arrow
   keys when a tour is active. Thread a tiny `TourContext` (`active: boolean`) from `AppShell`, read
   in `EarthCanvas.onKeyDown` to early-return. (If context threading is too invasive, fall back to
   PageUp/PageDown for the tour and drop window Arrow handling.)
4. **Optional polish:** restructure `<AnimatePresence>` to a single keyed child; render the tour in a
   portal at `z-[100]` so it always sits above the WebGL canvas and route transitions.

## Acceptance
- Playwright `e2e/tour.spec.ts`: open tour → assert card visible "1 / 5" → click Next ×4 →
  URL becomes `/sky`,`/threats`,`/avoidance`,`/report` and counter reaches "5 / 5" → Finish closes it.
- Esc closes the tour. Back is disabled on step 1. No console errors.
- On `/sky`, pressing Arrow while the tour is open does not rotate the globe.

## Files
- `frontend/src/app/GuidedTour.tsx` (logic)
- `frontend/src/app/AppShell.tsx` (provide TourContext)
- `frontend/src/components/earth/EarthCanvas.tsx` (consume TourContext in key handler)
- `frontend/e2e/tour.spec.ts` (new test)
