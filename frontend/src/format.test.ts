import { describe, expect, it } from "vitest";

import { formatDeltaV, formatDirection, formatDistanceMeters, formatPc } from "./format";

describe("mission console formatters", () => {
  it("formats tiny Pc values without hiding scientific notation", () => {
    expect(formatPc(0.0002778529)).toBe("2.779e-4");
  });

  it("formats mission metrics for compact panels", () => {
    expect(formatDistanceMeters(8387.7604)).toBe("8.39 km");
    expect(formatDeltaV(0.12)).toBe("0.12 m/s");
    expect(formatDirection("along-track-prograde")).toBe("along track prograde");
  });
});
