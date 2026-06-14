import { describe, expect, it } from "vitest";

import {
  dvSize,
  formatDeltaV,
  formatDistance,
  formatPc,
  formatPcPro,
  formatSpeed,
  formatTime,
  pcOneInN,
  pcWord,
  toRiskLevel
} from "./format";

describe("risk model", () => {
  it("maps backend severity to canonical levels", () => {
    expect(toRiskLevel("nominal")).toBe("safe");
    expect(toRiskLevel("watch")).toBe("watch");
    expect(toRiskLevel("warning")).toBe("warning");
    expect(toRiskLevel("critical")).toBe("danger");
  });

  it("falls back to a neutral-cautious level for unknown severities", () => {
    expect(toRiskLevel("???")).toBe("watch");
  });
});

describe("formatPc", () => {
  it("frames probability as a word + '1 in N' in simple mode", () => {
    expect(pcWord(2.78e-4)).toBe("very high");
    expect(pcOneInN(2.78e-4)).toBe(3597);
    // exact thousands separator is locale-dependent in Node; assert the shape + the count.
    expect(formatPc(2.78e-4, "simple")).toMatch(/^very high \(about 1 in [\d,. ]*3[\d,. ]*597\)$/);
  });

  it("uses scientific notation with a real superscript in pro mode", () => {
    expect(formatPcPro(2.78e-4)).toBe("2.78 × 10⁻⁴");
    expect(formatPc(2.78e-4, "pro")).toBe("2.78 × 10⁻⁴");
  });

  it("handles effectively-zero probabilities", () => {
    expect(formatPc(0, "simple")).toBe("effectively zero");
    expect(formatPcPro(0)).toBe("0");
  });
});

describe("distance / speed / delta-v", () => {
  it("humanizes distance in simple mode and stays precise in pro", () => {
    expect(formatDistance(8412, "simple")).toBe("8.4 km");
    expect(formatDistance(8412, "pro")).toBe("8.412 km");
    expect(formatDistance(600, "simple", { comparison: true })).toBe("600 m (≈ 6 football fields)");
  });

  it("formats speed in km/s per mode", () => {
    expect(formatSpeed(14.742, "simple")).toBe("14.7 km/s");
    expect(formatSpeed(14.742, "pro")).toBe("14.742 km/s");
  });

  it("describes delta-v as a sized nudge in simple mode", () => {
    expect(dvSize(0.12)).toBe("tiny");
    expect(formatDeltaV(0.12, "simple")).toBe("a tiny 0.12 m/s nudge");
    expect(formatDeltaV(0.12, "pro")).toBe("0.12 m/s");
  });
});

describe("time", () => {
  it("shows a relative time in simple mode", () => {
    const now = new Date("2026-06-14T10:32:08Z");
    expect(formatTime("2026-06-14T14:32:08Z", "simple", now)).toBe("in 4 hours");
  });

  it("shows absolute UTC in pro mode", () => {
    expect(formatTime("2026-06-14T14:32:08Z", "pro")).toBe("2026-06-14 14:32:08 UTC");
  });
});
