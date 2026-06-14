/**
 * Front-end "demo clock" (plan 04 §1 — kill the "41 hours ago" bug).
 *
 * The offline fixtures pin scenario timestamps to fixed instants. The canonical
 * Protect-ISRO conjunction's closest approach (TCA) is `2026-06-13T00:00:00Z`.
 * Compared against the real wall clock that reads as a *past* event ("…41 hours
 * ago"), which directly contradicts the future-tense narrative the UI tells
 * ("CARTOSAT-2F *will* pass dangerously close").
 *
 * Instead of mutating the deterministic backend (which keeps the API, the audit
 * trail, and `lib/format`'s unit tests honest), we rebase only the timestamps the
 * UI *displays* onto a live "now" window. `demoDate(iso)` shifts every scenario
 * instant by one constant offset so the hero close approach always reads as a
 * near-future event (~18 hours out) and counts down live as the demo runs.
 *
 * This is a pure *display* transform applied at the call sites — `relativeFromNow`
 * / `formatTime` keep their exact signatures and pure semantics, so their tests
 * (which pass an explicit `now`) stay green.
 */

/**
 * The fixtures' intended "now": the canonical Protect-ISRO TCA
 * (`2026-06-13T00:00:00Z`) minus an ~18h lead, so the hero close approach reads as
 * a near-future event rather than a stale past one.
 *
 * Why this exact value (derived from the live backend data):
 *   GET  /api/conjunctions/conj-protect-isro-001  → tca_utc = 2026-06-13T00:00:00Z
 *   So:  demoDate(TCA) − realNow
 *        = (TCA + (realNow − DEMO_EPOCH)) − realNow
 *        = TCA − DEMO_EPOCH
 *        = 2026-06-13T00:00:00Z − 2026-06-12T06:00:00Z
 *        = +18h   (constant, independent of the real wall clock)
 */
export const DEMO_EPOCH = "2026-06-12T06:00:00Z";

const DEMO_EPOCH_MS = Date.parse(DEMO_EPOCH);

/** How far the real clock currently sits ahead of the demo epoch (ms). */
export function demoOffsetMs(now: Date = new Date()): number {
  return now.getTime() - DEMO_EPOCH_MS;
}

/**
 * Rebase a scenario-derived ISO timestamp onto the live demo window.
 * Falls back to a plain parse for malformed input so callers never crash.
 */
export function demoDate(iso: string, now: Date = new Date()): Date {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return new Date(iso);
  return new Date(parsed + demoOffsetMs(now));
}

/**
 * The rebased ISO string — convenient for helpers that re-parse an ISO to format
 * an absolute time (e.g. Pro-mode "YYYY-MM-DD HH:MM:SS UTC").
 */
export function demoIso(iso: string, now: Date = new Date()): string {
  return demoDate(iso, now).toISOString();
}
