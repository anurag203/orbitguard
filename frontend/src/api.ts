import type {
  CatalogWorkbench,
  ConjunctionDetail,
  ConjunctionSummary,
  DemoReplay,
  DemoStatus,
  ManeuverApply,
  ManeuverPlan,
  MissionReport,
  ScenarioRun,
  ScenarioSummary
} from "./types";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  demoStatus: () => requestJson<DemoStatus>("/api/demo/status"),
  demoReplay: () => requestJson<DemoReplay>("/api/demo/replay/protect-isro-round1", { method: "POST" }),
  scenarios: () => requestJson<{ scenarios: ScenarioSummary[] }>("/api/scenarios"),
  catalogFull: (params: {
    source?: "fixture" | "live";
    q?: string;
    owner?: string;
    object_type?: string;
    orbit_class?: string;
    group?: string;
    limit?: number;
  }) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        search.set(key, String(value));
      }
    }
    return requestJson<CatalogWorkbench>(`/api/catalogs/full?${search.toString()}`);
  },
  refreshLiveCatalog: (group = "active", limit = 120) =>
    requestJson<CatalogWorkbench>("/api/catalogs/live/refresh", {
      method: "POST",
      body: JSON.stringify({ group, limit })
    }),
  runScenario: (scenarioId: string) =>
    requestJson<ScenarioRun>(`/api/scenarios/${scenarioId}/run`, {
      method: "POST",
      body: JSON.stringify({ deterministic: true })
    }),
  screenConjunctions: (scenarioId: string) =>
    requestJson<{ mode: string; conjunctions: ConjunctionSummary[]; warnings: string[] }>("/api/conjunctions/screen", {
      method: "POST",
      body: JSON.stringify({ scenario_id: scenarioId, step_seconds: 10, max_results: 5 })
    }),
  conjunctionDetail: (conjunctionId: string) => requestJson<ConjunctionDetail>(`/api/conjunctions/${conjunctionId}`),
  planManeuver: (conjunctionId: string) =>
    requestJson<ManeuverPlan>("/api/maneuvers/plan", {
      method: "POST",
      body: JSON.stringify({ conjunction_id: conjunctionId })
    }),
  applyManeuver: (planId: string, candidateId: string) =>
    requestJson<ManeuverApply>("/api/maneuvers/apply", {
      method: "POST",
      body: JSON.stringify({ plan_id: planId, candidate_id: candidateId })
    }),
  createReport: (scenarioRunId: string, conjunctionId: string, planId: string, candidateId: string) =>
    requestJson<{ report_id: string; status: string }>("/api/reports", {
      method: "POST",
      body: JSON.stringify({
        scenario_run_id: scenarioRunId,
        conjunction_id: conjunctionId,
        plan_id: planId,
        candidate_id: candidateId
      })
    }),
  getReport: (reportId: string) => requestJson<MissionReport>(`/api/reports/${reportId}`)
};
