import { describe, expect, it } from "vitest";

import { TERMS, type TermKey } from "./terms";

const REQUIRED_TERMS: TermKey[] = [
  "tca",
  "miss-distance",
  "pc",
  "conjunction",
  "delta-v",
  "along-track",
  "secondary-screening",
  "norad-id",
  "tle",
  "leo",
  "covariance",
  "propagation",
  "relative-velocity",
  "kessler"
];

describe("TERMS", () => {
  it("defines every product term with plain and technical copy", () => {
    expect(Object.keys(TERMS).sort()).toEqual([...REQUIRED_TERMS].sort());

    for (const key of REQUIRED_TERMS) {
      expect(TERMS[key].label.trim(), `${key} label`).not.toBe("");
      expect(TERMS[key].full.trim(), `${key} full`).not.toBe("");
      expect(TERMS[key].short.trim(), `${key} short`).not.toBe("");
    }
  });

  it("uses stable, unique learn anchors", () => {
    const anchors = REQUIRED_TERMS.map((key) => TERMS[key].learnAnchor ?? key);

    expect(new Set(anchors).size).toBe(anchors.length);
    for (const anchor of anchors) {
      expect(anchor).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
