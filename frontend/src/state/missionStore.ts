import { create } from "zustand";

import { api } from "../api";
import type {
  CatalogObject,
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
} from "../types";

export type BusyAction = "boot" | "scenario" | "catalog" | "plan" | "apply" | "report" | "replay" | null;
export type MissionPhase = "alert" | "planned" | "applied" | "report";

export type ScenarioRiskSnapshot = ConjunctionSummary & {
  scenario_id: string;
  scenario_mode: string;
  scenario_title: string;
};

type CatalogFilters = {
  orbit: string;
  owner: string;
  query: string;
  source: "fixture" | "live";
  type: string;
};

type MissionState = {
  applyResult: ManeuverApply | null;
  busy: BusyAction;
  catalog: CatalogWorkbench | null;
  catalogFilters: CatalogFilters;
  conjunctions: ConjunctionSummary[];
  demoReplay: DemoReplay | null;
  demoStatus: DemoStatus | null;
  detail: ConjunctionDetail | null;
  error: string | null;
  plan: ManeuverPlan | null;
  report: MissionReport | null;
  scenarioRiskSnapshots: ScenarioRiskSnapshot[];
  scenarioRun: ScenarioRun | null;
  scenarios: ScenarioSummary[];
  selectedCatalogObjectId: string | null;
  selectedScenarioId: string;
  applyManeuver: () => Promise<void>;
  boot: () => Promise<void>;
  exportReport: () => void;
  generateProtectIsroReport: () => Promise<void>;
  generateReport: () => Promise<void>;
  loadCatalog: (overrides?: Partial<CatalogFilters>) => Promise<void>;
  loadScenario: (scenarioId: string) => Promise<void>;
  planAvoidance: () => Promise<void>;
  refreshLiveTles: () => Promise<void>;
  replayDemo: () => Promise<void>;
  setCatalogFilter: (key: keyof CatalogFilters, value: string) => void;
  setSelectedCatalogObjectId: (value: string | null) => void;
};

const scenarioOrder = ["protect-isro", "2009-replay", "kessler-sandbox"];

function readableError(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function sortScenarios(scenarios: ScenarioSummary[]) {
  return [...scenarios].sort(
    (left, right) => scenarioOrder.indexOf(left.scenario_id) - scenarioOrder.indexOf(right.scenario_id)
  );
}

function selectFirstObject(catalog: CatalogWorkbench | null, currentId: string | null) {
  const objects = catalog?.objects ?? [];
  if (!objects.length) {
    return null;
  }
  if (currentId && objects.some((object) => object.object_id === currentId)) {
    return currentId;
  }
  return objects[0].object_id;
}

async function scenarioSnapshots(scenarios: ScenarioSummary[]) {
  const results = await Promise.allSettled(
    scenarios.map(async (scenario) => {
      const screen = await api.screenConjunctions(scenario.scenario_id);
      const closest = [...screen.conjunctions].sort(
        (left, right) => left.risk.miss_distance_m - right.risk.miss_distance_m
      )[0];
      return closest
        ? {
            ...closest,
            scenario_id: scenario.scenario_id,
            scenario_mode: scenario.mode,
            scenario_title: scenario.title
          }
        : null;
    })
  );

  return results
    .flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []))
    .sort((left, right) => left.risk.miss_distance_m - right.risk.miss_distance_m);
}

export const useMissionStore = create<MissionState>((set, get) => ({
  applyResult: null,
  busy: null,
  catalog: null,
  catalogFilters: {
    orbit: "",
    owner: "",
    query: "",
    source: "fixture",
    type: ""
  },
  conjunctions: [],
  demoReplay: null,
  demoStatus: null,
  detail: null,
  error: null,
  plan: null,
  report: null,
  scenarioRiskSnapshots: [],
  scenarioRun: null,
  scenarios: [],
  selectedCatalogObjectId: null,
  selectedScenarioId: "protect-isro",

  boot: async () => {
    set({ busy: "boot", error: null });
    try {
      const [status, scenarioList, catalog] = await Promise.all([
        api.demoStatus(),
        api.scenarios(),
        api.catalogFull({ source: "fixture", limit: 80 })
      ]);
      const scenarios = sortScenarios(scenarioList.scenarios);
      set({
        catalog,
        demoStatus: status,
        scenarios,
        selectedCatalogObjectId: selectFirstObject(catalog, get().selectedCatalogObjectId)
      });
      await get().loadScenario("protect-isro");
      set({ scenarioRiskSnapshots: await scenarioSnapshots(scenarios) });
    } catch (err) {
      set({ error: readableError(err, "Unable to boot OrbitGuard.") });
    } finally {
      set({ busy: null });
    }
  },

  loadScenario: async (scenarioId: string) => {
    set({
      applyResult: null,
      busy: "scenario",
      error: null,
      plan: null,
      report: null,
      selectedScenarioId: scenarioId
    });
    try {
      const [run, screen] = await Promise.all([api.runScenario(scenarioId), api.screenConjunctions(scenarioId)]);
      const topId = screen.conjunctions[0]?.conjunction_id ?? run.top_conjunction_id;
      const detail = await api.conjunctionDetail(topId);
      set({ conjunctions: screen.conjunctions, detail, scenarioRun: run });
    } catch (err) {
      set({ error: readableError(err, "Scenario load failed.") });
    } finally {
      set({ busy: null });
    }
  },

  loadCatalog: async (overrides = {}) => {
    const filters = { ...get().catalogFilters, ...overrides };
    set({ busy: "catalog", catalogFilters: filters, error: null });
    try {
      const catalog = await api.catalogFull({
        source: filters.source,
        q: filters.query,
        owner: filters.owner,
        object_type: filters.type,
        orbit_class: filters.orbit,
        group: "active",
        limit: 120
      });
      set({ catalog, selectedCatalogObjectId: selectFirstObject(catalog, get().selectedCatalogObjectId) });
    } catch (err) {
      set({ error: readableError(err, "Catalog workbench failed.") });
    } finally {
      set({ busy: null });
    }
  },

  refreshLiveTles: async () => {
    set({
      busy: "catalog",
      catalogFilters: { ...get().catalogFilters, source: "live" },
      error: null
    });
    try {
      const catalog = await api.refreshLiveCatalog("active", 120);
      set({ catalog, selectedCatalogObjectId: selectFirstObject(catalog, get().selectedCatalogObjectId) });
    } catch (err) {
      set({ error: readableError(err, "Live CelesTrak refresh failed.") });
    } finally {
      set({ busy: null });
    }
  },

  planAvoidance: async () => {
    const detail = get().detail;
    if (!detail) {
      return;
    }
    set({ applyResult: null, busy: "plan", error: null, report: null });
    try {
      set({ plan: await api.planManeuver(detail.conjunction_id) });
    } catch (err) {
      set({ error: readableError(err, "Maneuver planning failed.") });
    } finally {
      set({ busy: null });
    }
  },

  applyManeuver: async () => {
    const plan = get().plan;
    if (!plan?.recommendation) {
      return;
    }
    set({ busy: "apply", error: null, report: null });
    try {
      set({ applyResult: await api.applyManeuver(plan.plan_id, plan.recommendation.candidate_id) });
    } catch (err) {
      set({ error: readableError(err, "Maneuver apply failed.") });
    } finally {
      set({ busy: null });
    }
  },

  generateReport: async () => {
    const { detail, plan, scenarioRun } = get();
    if (!scenarioRun || !detail || !plan?.recommendation) {
      return;
    }
    set({ busy: "report", error: null });
    try {
      const created = await api.createReport(
        scenarioRun.run_id,
        detail.conjunction_id,
        plan.plan_id,
        plan.recommendation.candidate_id
      );
      set({ report: await api.getReport(created.report_id) });
    } catch (err) {
      set({ error: readableError(err, "Report generation failed.") });
    } finally {
      set({ busy: null });
    }
  },

  generateProtectIsroReport: async () => {
    set({ busy: "report", error: null });
    try {
      const [run, screen] = await Promise.all([api.runScenario("protect-isro"), api.screenConjunctions("protect-isro")]);
      const topId = screen.conjunctions[0]?.conjunction_id ?? run.top_conjunction_id;
      const detail = await api.conjunctionDetail(topId);
      const plan = await api.planManeuver(detail.conjunction_id);
      if (!plan.recommendation) {
        throw new Error("No recommended maneuver was returned.");
      }
      const applyResult = await api.applyManeuver(plan.plan_id, plan.recommendation.candidate_id);
      const created = await api.createReport(run.run_id, detail.conjunction_id, plan.plan_id, plan.recommendation.candidate_id);
      set({
        applyResult,
        conjunctions: screen.conjunctions,
        detail,
        plan,
        report: await api.getReport(created.report_id),
        scenarioRun: run,
        selectedScenarioId: "protect-isro"
      });
    } catch (err) {
      set({ error: readableError(err, "Report generation failed.") });
    } finally {
      set({ busy: null });
    }
  },

  replayDemo: async () => {
    set({ busy: "replay", error: null });
    try {
      set({ demoReplay: await api.demoReplay() });
    } catch (err) {
      set({ error: readableError(err, "Demo replay failed.") });
    } finally {
      set({ busy: null });
    }
  },

  exportReport: () => {
    const report = get().report;
    if (!report) {
      return;
    }
    const body = [
      `# ${report.title}`,
      "",
      `## ${report.briefing.headline}`,
      "",
      report.briefing.summary,
      "",
      ...report.sections.flatMap((section) => [`## ${section.title}`, "", section.body, ""]),
      "## Assumptions",
      "",
      ...report.assumptions.map((assumption) => `- ${assumption}`),
      "",
      "## Warnings",
      "",
      ...(report.warnings.length ? report.warnings.map((warning) => `- ${warning}`) : ["- None."])
    ].join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.report_id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  },

  setCatalogFilter: (key, value) => {
    const next = { ...get().catalogFilters, [key]: value };
    set({ catalogFilters: next });
  },

  setSelectedCatalogObjectId: (value) => set({ selectedCatalogObjectId: value })
}));

export function selectedCatalogObject(catalog: CatalogWorkbench | null, selectedId: string | null): CatalogObject | null {
  const objects = catalog?.objects ?? [];
  return objects.find((object) => object.object_id === selectedId) ?? objects[0] ?? null;
}

export function missionPhase(plan: ManeuverPlan | null, applyResult: ManeuverApply | null, report: MissionReport | null): MissionPhase {
  if (report) {
    return "report";
  }
  if (applyResult) {
    return "applied";
  }
  if (plan) {
    return "planned";
  }
  return "alert";
}
