import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ModeProvider, TooltipProvider } from "../components/ui";
import { queryKeys, type ConjunctionDetail, type ManeuverPlan, type MissionReport } from "../features";
import { AvoidanceDetails } from "./avoidance/AvoidanceDetails";
import { ReportDocument } from "./report/ReportDocument";
import { EnginesTable } from "./system/EnginesTable";
import { PcModel } from "./system/PcModel";
import { PipelineDiagram } from "./system/PipelineDiagram";
import { PC_REFERENCE_CONJUNCTION_ID } from "./system/config";
import { ThreatsSummary } from "./threats/ThreatsSummary";

const BANNED_SIMPLE_TEXT = [
  /\bTCA\b/u,
  /\bPc\b/u,
  /Δv|δv/u,
  /\bRAAN\b/u,
  /\bSGP4\b/u,
  /\bmiss distance\b/iu,
  /\brelative velocity\b/iu,
  /\bsecondary screening\b/iu,
  /\bmaneuver\b/iu,
  /\bburn\b/iu,
  /\bcovariance\b/iu
];

function queryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity }
    }
  });
}

function renderSimple(node: ReactNode, client = queryClient()) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ModeProvider forceMode="simple">
          <TooltipProvider>{node}</TooltipProvider>
        </ModeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

function expandDetails(container: HTMLElement) {
  for (const button of within(container).queryAllByRole("button", { name: /show/i })) {
    fireEvent.click(button);
  }
}

function expectSimpleText(container: HTMLElement) {
  expandDetails(container);
  const text = container.textContent ?? "";
  for (const pattern of BANNED_SIMPLE_TEXT) {
    expect(text, `Simple text leaked ${pattern}`).not.toMatch(pattern);
  }
}

const risk = {
  pc: 2.78e-4,
  miss_distance_m: 611.8,
  relative_velocity_km_s: 14.2,
  severity: "danger"
};

const plan = {
  plan_id: "plan-1",
  conjunction_id: "conj-1",
  status: "planned",
  recommendation: null,
  alternatives: [],
  before: risk,
  predicted_after: { ...risk, pc: 1e-9, miss_distance_m: 8387.8, severity: "safe" },
  requires_secondary_screening: true,
  explanation: "Low-delta-v maneuver before TCA reduces Pc.",
  candidate_count: 3,
  assumptions: ["SGP4 propagation at TCA", "Pc uses covariance in the encounter plane"],
  warnings: ["Secondary screening reruns after the burn"]
} satisfies ManeuverPlan;

const report = {
  report_id: "report-1",
  title: "Mission report",
  briefing: {
    headline: "Low-delta-v burn before TCA reduces Pc",
    summary: "A maneuver was selected.",
    key_points: ["TCA, Pc, and Δv are all recorded", "SGP4 fallback was used"],
    limitations: ["Covariance is simplified in this report."]
  },
  source_ids: {
    scenario_run_id: "run-1",
    conjunction_id: "conj-1",
    plan_id: "plan-1",
    candidate_id: "cand-1"
  },
  sections: [
    { title: "Decision", body: "A low-delta-v maneuver was selected before TCA." },
    { title: "Risk reduction", body: "Post-maneuver miss distance improves and Pc drops after secondary screening." }
  ],
  assumptions: ["SGP4 propagation and covariance are demo-grade."],
  warnings: ["Pc is illustrative."]
} satisfies MissionReport;

const detail = {
  conjunction_id: "conj-1",
  primary_object_id: "CARTOSAT-2F",
  secondary_object_id: "DEBRIS-001",
  tca_utc: "2026-06-13T00:00:00Z",
  risk,
  status: "open",
  relative_position_m: [0, 0, 0],
  relative_velocity_vector_km_s: [0, 0, 0],
  encounter_plane: [],
  pc_estimate: {
    pc: risk.pc,
    method: "Foster 2D",
    encounter_x_m: 0,
    encounter_y_m: 0,
    covariance: {
      model_id: "demo-covariance",
      sigma_x_m: 75,
      sigma_y_m: 120,
      hard_body_radius_m: 8,
      source: "fixture",
      notes: ["Covariance note mentions Pc at TCA"]
    },
    assumptions: ["SGP4 propagation used for Pc"],
    warnings: ["Covariance is simplified"]
  },
  assumptions: []
} satisfies ConjunctionDetail;

describe("Simple-mode language", () => {
  it("keeps rendered Simple copy plain, including expanded details", () => {
    const client = queryClient();
    client.setQueryData(queryKeys.threatDetail(PC_REFERENCE_CONJUNCTION_ID), detail);

    for (const view of [
      <ThreatsSummary key="threats" protectedName="CARTOSAT-2F" needsAction={1} computationMode="sgp4" />,
      <AvoidanceDetails key="avoidance" plan={plan} />,
      <ReportDocument key="report" report={report} mode="simple" protectedName="CARTOSAT-2F" scenarioTitle="Protect ISRO" isHeroScenario />,
      <PipelineDiagram key="pipeline" />,
      <EnginesTable key="engines" />,
      <PcModel key="pc-model" />
    ]) {
      const { container, unmount } = renderSimple(view, client);
      expectSimpleText(container);
      unmount();
    }
  });
});
