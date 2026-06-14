import { describe, expect, it } from "vitest";

import { canonicalPath, staticKey } from "./staticApi";

// These pinned keys are the filenames produced by `scripts/snapshot-api.mjs`. If the key logic in
// staticApi.ts and the snapshot script ever drift apart, the baked files stop resolving in static
// mode — this test fails loudly before that ships.

describe("staticApi keying", () => {
  it("matches the baked snapshot filenames", () => {
    expect(staticKey("GET", "/demo/status")).toBe("e8bbff24");
    expect(staticKey("GET", "/scenarios")).toBe("945ae975");
    expect(staticKey("GET", "/conjunctions/conj-protect-isro-001")).toBe("549eef26");
    expect(staticKey("POST", "/scenarios/protect-isro/run", JSON.stringify({ deterministic: true }))).toBe(
      "d39cf84f"
    );
    expect(
      staticKey(
        "POST",
        "/conjunctions/screen",
        JSON.stringify({ scenario_id: "protect-isro", step_seconds: 10, max_results: 10 })
      )
    ).toBe("d981b052");
    expect(staticKey("POST", "/maneuvers/plan", JSON.stringify({ conjunction_id: "conj-protect-isro-001" }))).toBe(
      "d0874e1c"
    );
  });

  it("is invariant to query-param order", () => {
    expect(canonicalPath("/catalogs/full?source=fixture&limit=120")).toBe(canonicalPath("/catalogs/full?limit=120&source=fixture"));
    expect(staticKey("GET", "/catalogs/full?source=fixture&limit=120")).toBe(
      staticKey("GET", "/catalogs/full?limit=120&source=fixture")
    );
    // …and matches the baked file for that catalog request.
    expect(staticKey("GET", "/catalogs/full?source=fixture&limit=120")).toBe("2b1142c9");
  });

  it("is invariant to JSON body key order", () => {
    const a = staticKey("POST", "/maneuvers/apply", JSON.stringify({ plan_id: "p", candidate_id: "c" }));
    const b = staticKey("POST", "/maneuvers/apply", JSON.stringify({ candidate_id: "c", plan_id: "p" }));
    expect(a).toBe(b);
  });
});
