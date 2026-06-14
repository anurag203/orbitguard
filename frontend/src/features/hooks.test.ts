import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, isApiError } from "../lib/api";
import { threatDetailQueryOptions } from "./useThreatDetail";
import { threatsQueryOptions } from "./useThreats";

/** Build a minimal `Response`-like object good enough for the client's `.text()`/`.json()` usage. */
function makeResponse(init: { ok: boolean; status: number; body: unknown }): Response {
  const isString = typeof init.body === "string";
  const text = isString ? (init.body as string) : JSON.stringify(init.body);
  return {
    ok: init.ok,
    status: init.status,
    statusText: "",
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(isString ? undefined : init.body)
  } as unknown as Response;
}

/** A client with retries off so failing queries reject immediately in tests. */
function testClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("feature query options + react-query integration", () => {
  it("threatsQueryOptions fetches screening data and surfaces optional computation_mode", async () => {
    const screening = {
      mode: "sgp4-protagonist-vs-catalog",
      computation_mode: "fixture-fallback",
      conjunctions: [
        {
          conjunction_id: "conj-protect-isro-001",
          primary_object_id: "isro-sat",
          secondary_object_id: "debris-1",
          tca_utc: "2026-01-01T00:00:00Z",
          risk: { pc: 0.0002, miss_distance_m: 600, relative_velocity_km_s: 10, severity: "high" },
          status: "alert"
        }
      ],
      warnings: []
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse({ ok: true, status: 200, body: screening })));

    const data = await testClient().fetchQuery(threatsQueryOptions("protect-isro"));

    expect(data.conjunctions).toHaveLength(1);
    expect(data.conjunctions[0].conjunction_id).toBe("conj-protect-isro-001");
    // Optional field is preserved when the (refactored) backend sends it.
    expect(data.computation_mode).toBe("fixture-fallback");
  });

  it("propagates a typed ApiError through a query so hooks expose { isError, error }", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        makeResponse({
          ok: false,
          status: 404,
          body: { error: { code: "conjunction_not_found", message: "nope" } }
        })
      )
    );

    const error = await testClient()
      .fetchQuery(threatDetailQueryOptions("conj-missing"))
      .catch((caught: unknown) => caught);

    expect(isApiError(error)).toBe(true);
    expect((error as ApiError).code).toBe("conjunction_not_found");
  });
});
