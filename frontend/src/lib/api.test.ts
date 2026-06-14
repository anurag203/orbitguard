import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, api, isApiError } from "./api";

type MockResponseInit = {
  ok: boolean;
  status: number;
  statusText?: string;
  body: unknown;
};

/** Build a minimal `Response`-like object good enough for the client's `.text()`/`.json()` usage. */
function makeResponse(init: MockResponseInit): Response {
  const isString = typeof init.body === "string";
  const text = isString ? (init.body as string) : JSON.stringify(init.body);
  return {
    ok: init.ok,
    status: init.status,
    statusText: init.statusText ?? "",
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(isString ? undefined : init.body)
  } as unknown as Response;
}

function stubFetch(response: Response | Error) {
  const mock =
    response instanceof Error ? vi.fn().mockRejectedValue(response) : vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("api client error mapping", () => {
  it("maps the backend error envelope to a typed ApiError (code, status, details, message)", async () => {
    stubFetch(
      makeResponse({
        ok: false,
        status: 404,
        statusText: "Not Found",
        body: {
          error: {
            code: "conjunction_not_found",
            message: "Conjunction 'conj-x' was not found.",
            details: { conjunction_id: "conj-x" }
          }
        }
      })
    );

    const error = await api.conjunctionDetail("conj-x").catch((caught: unknown) => caught);

    expect(isApiError(error)).toBe(true);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("conjunction_not_found");
    expect(apiError.status).toBe(404);
    expect(apiError.details).toEqual({ conjunction_id: "conj-x" });
    expect(apiError.message).toContain("was not found");
  });

  it("falls back to a generic http_error for non-enveloped failures", async () => {
    stubFetch(
      makeResponse({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        body: "<html>proxy error</html>"
      })
    );

    const error = (await api.scenarios().catch((caught: unknown) => caught)) as ApiError;

    expect(isApiError(error)).toBe(true);
    expect(error.code).toBe("http_error");
    expect(error.status).toBe(502);
    expect(error.message).toContain("proxy error");
  });

  it("maps a transport failure (no response) to a network_error with status 0", async () => {
    stubFetch(new TypeError("Failed to fetch"));

    const error = (await api.demoStatus().catch((caught: unknown) => caught)) as ApiError;

    expect(isApiError(error)).toBe(true);
    expect(error.code).toBe("network_error");
    expect(error.status).toBe(0);
  });

  it("returns parsed JSON and hits the proxied /api path on success", async () => {
    const mock = stubFetch(makeResponse({ ok: true, status: 200, body: { scenarios: [] } }));

    await expect(api.scenarios()).resolves.toEqual({ scenarios: [] });
    const [path, init] = mock.mock.calls[0] as [string, RequestInit | undefined];
    expect(path).toBe("/api/scenarios");
    expect(init?.method).toBeUndefined();
  });

  it("serialises POST bodies with snake_case keys and applies screening defaults", async () => {
    const mock = stubFetch(
      makeResponse({ ok: true, status: 200, body: { mode: "sgp4", conjunctions: [], warnings: [] } })
    );

    await api.screenConjunctions("protect-isro", { maxResults: 3 });

    expect(mock).toHaveBeenCalledTimes(1);
    const [path, init] = mock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/conjunctions/screen");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({
      scenario_id: "protect-isro",
      step_seconds: 10,
      max_results: 3
    });
  });
});
