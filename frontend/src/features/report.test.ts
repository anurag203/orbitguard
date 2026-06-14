import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { reportQueryOptions, useReport } from "./useReport";

function makeResponse(init: { ok: boolean; status: number; body: unknown }): Response {
  return {
    ok: init.ok,
    status: init.status,
    statusText: "",
    text: () => Promise.resolve(JSON.stringify(init.body)),
    json: () => Promise.resolve(init.body)
  } as unknown as Response;
}

function testClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithClient<T>(hook: () => T) {
  const client = testClient();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return renderHook(hook, { wrapper });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useReport", () => {
  it("fetches /api/reports/{id} and returns the report shape", async () => {
    const report = { report_id: "rep-1", scenario_id: "protect-isro", summary: "Collision avoided." };
    const fetchMock = vi.fn().mockResolvedValue(makeResponse({ ok: true, status: 200, body: report }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderWithClient(() => useReport("rep-1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith("/api/reports/rep-1", expect.any(Object));
    expect(result.current.data?.report_id).toBe("rep-1");
  });

  it("stays idle for an empty report id (lazy)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderWithClient(() => useReport(""));
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reportQueryOptions resolves the report through a client", async () => {
    const report = { report_id: "rep-2", summary: "ok" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse({ ok: true, status: 200, body: report })));

    const data = await testClient().fetchQuery(reportQueryOptions("rep-2"));
    expect(data.report_id).toBe("rep-2");
  });
});
