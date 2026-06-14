import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, isApiError } from "../lib/api";
import { useScenarioRun } from "./useScenarioRun";
import { useScenarios } from "./useScenarios";

function makeResponse(init: { ok: boolean; status: number; body: unknown }): Response {
  return {
    ok: init.ok,
    status: init.status,
    statusText: "",
    text: () => Promise.resolve(JSON.stringify(init.body)),
    json: () => Promise.resolve(init.body)
  } as unknown as Response;
}

function renderWithClient<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return renderHook(hook, { wrapper });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useScenarios", () => {
  it("fetches /api/scenarios and orders the hero scenario first", async () => {
    const payload = {
      scenarios: [
        { scenario_id: "kessler-sandbox", title: "Kessler" },
        { scenario_id: "protect-isro", title: "Protect ISRO" }
      ]
    };
    const fetchMock = vi.fn().mockResolvedValue(makeResponse({ ok: true, status: 200, body: payload }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderWithClient(() => useScenarios());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith("/api/scenarios", expect.any(Object));
    expect(result.current.data?.map((s) => s.scenario_id)).toEqual(["protect-isro", "kessler-sandbox"]);
  });
});

describe("useScenarioRun", () => {
  it("POSTs a deterministic run and returns the run shape", async () => {
    const run = { run_id: "run-1", scenario_id: "protect-isro", beats: [] };
    const fetchMock = vi.fn().mockResolvedValue(makeResponse({ ok: true, status: 200, body: run }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderWithClient(() => useScenarioRun("protect-isro"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith("/api/scenarios/protect-isro/run", expect.objectContaining({ method: "POST" }));
    expect(result.current.data?.run_id).toBe("run-1");
  });

  it("surfaces a typed ApiError on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        makeResponse({
          ok: false,
          status: 404,
          body: { error: { code: "scenario_not_found", message: "no such scenario" } }
        })
      )
    );

    const { result } = renderWithClient(() => useScenarioRun("missing"));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(isApiError(result.current.error)).toBe(true);
    expect((result.current.error as ApiError).code).toBe("scenario_not_found");
  });
});
