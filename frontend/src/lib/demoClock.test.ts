import { describe, expect, it } from "vitest";

import { DEMO_EPOCH, demoDate, demoIso, demoOffsetMs } from "./demoClock";
import { relativeFromNow } from "./format";

/**
 * The demo clock rebases fixture timestamps onto a live "now" window so the hero
 * conjunction reads as a near-future event instead of "41 hours ago" (plan 04 §1).
 */
describe("demoClock", () => {
  const CANONICAL_TCA = "2026-06-13T00:00:00Z";

  it("anchors DEMO_EPOCH 18h before the canonical Protect-ISRO TCA", () => {
    const eighteenHoursMs = 18 * 60 * 60 * 1000;
    expect(Date.parse(CANONICAL_TCA) - Date.parse(DEMO_EPOCH)).toBe(eighteenHoursMs);
  });

  it("rebases the canonical TCA to ~18h in the future regardless of the real clock", () => {
    // Pick an arbitrary "real now" — the offset is computed relative to it.
    const now = new Date("2030-01-01T09:15:00Z");
    const rebased = demoDate(CANONICAL_TCA, now);
    const diffHours = (rebased.getTime() - now.getTime()) / (60 * 60 * 1000);
    expect(diffHours).toBeCloseTo(18, 5);
  });

  it("produces a future relative phrase (never 'ago') for the live alert", () => {
    const now = new Date("2026-06-14T17:25:00Z");
    expect(relativeFromNow(demoDate(CANONICAL_TCA, now), now)).toBe("in 18 hours");
  });

  it("demoOffsetMs equals now − DEMO_EPOCH", () => {
    const now = new Date("2026-06-14T06:00:00Z");
    expect(demoOffsetMs(now)).toBe(now.getTime() - Date.parse(DEMO_EPOCH));
  });

  it("demoIso round-trips through demoDate", () => {
    const now = new Date("2026-06-14T12:00:00Z");
    expect(demoIso(CANONICAL_TCA, now)).toBe(demoDate(CANONICAL_TCA, now).toISOString());
  });

  it("falls back gracefully for malformed input", () => {
    expect(Number.isNaN(demoDate("not-a-date").getTime())).toBe(true);
  });
});
