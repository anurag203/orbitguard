import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useApplyManeuver } from "./useApplyManeuver";
import { usePlanManeuver } from "./usePlanManeuver";

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

describe("usePlanManeuver", () => {
  it("POSTs the conjunction id to /api/maneuvers/plan and surfaces the plan", async () => {
    const plan = { plan_id: "plan-1", conjunction_id: "conj-1", candidates: [{ candidate_id: "cand-a" }] };
    const fetchMock = vi.fn().mockResolvedValue(makeResponse({ ok: true, status: 200, body: plan }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderWithClient(() => usePlanManeuver());
    let returned: { plan_id: string } | undefined;
    await act(async () => {
      returned = await result.current.mutateAsync("conj-1");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/maneuvers/plan", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ conjunction_id: "conj-1" });
    expect(returned?.plan_id).toBe("plan-1");
    await waitFor(() => expect(result.current.data?.plan_id).toBe("plan-1"));
  });
});

describe("useApplyManeuver", () => {
  it("POSTs the plan + candidate to /api/maneuvers/apply and surfaces the apply result", async () => {
    const applied = { plan_id: "plan-1", candidate_id: "cand-a", secondary_status: "clear" };
    const fetchMock = vi.fn().mockResolvedValue(makeResponse({ ok: true, status: 200, body: applied }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderWithClient(() => useApplyManeuver());
    await act(async () => {
      await result.current.mutateAsync({ planId: "plan-1", candidateId: "cand-a" });
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/maneuvers/apply", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ plan_id: "plan-1", candidate_id: "cand-a" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.secondary_status).toBe("clear");
  });
});
