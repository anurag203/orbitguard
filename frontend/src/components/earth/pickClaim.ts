/**
 * pickClaim — a tiny coordination flag so the hero <Satellite> click (handled by
 * R3F's raycaster) always wins over the {@link SatelliteField}'s screen-space
 * nearest-instance pick when the two overlap.
 *
 * The hero satellites and the instanced cloud share the LEO band, so a click can
 * land near both. The hero records a claim on click; the field defers its own
 * selection to a microtask and skips if a claim was just made — keeping the
 * curated mission story (protected asset / threat) selectable.
 */
let claimedAt = -Infinity;

function nowMs(): number {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

/** Called by the hero <Satellite> on click. */
export function claimPick(): void {
  claimedAt = nowMs();
}

/** True if a hero click happened within `windowMs` (the field then yields). */
export function wasRecentlyClaimed(windowMs = 120): boolean {
  return nowMs() - claimedAt < windowMs;
}
