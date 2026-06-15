/**
 * Shared & extended API shapes for the redesigned data layer.
 *
 * The canonical backend types live in `src/types.ts` and are still imported by the OLD routes —
 * do NOT fork or rewrite them. Here we re-export them (so new code has a single import site:
 * `features/types`) and add only the few shapes the new screens need on top.
 */

export type {
  CatalogObject,
  CatalogWorkbench,
  ConjunctionDetail,
  ConjunctionSummary,
  DemoReplay,
  DemoStatus,
  ManeuverApply,
  ManeuverCandidate,
  ManeuverPlan,
  MissionReport,
  RiskMetrics,
  ScenarioRun,
  ScenarioSummary,
  WatchlistResponse
} from "../types";

import type { ConjunctionSummary, ScenarioSummary } from "../types";

/**
 * How a screening result was produced.
 *
 * The backend (doc 08 §7) is being refactored, in parallel with this work, to report this so the
 * UI can honestly badge "demo geometry" (`fixture-fallback`) vs real propagation (`sgp4`).
 */
export type ComputationMode = "sgp4" | "fixture-fallback";

/**
 * Response from `POST /api/conjunctions/screen`.
 *
 * `computation_mode` is intentionally OPTIONAL: it does not exist on the backend yet, so the client
 * must compile and behave correctly both before and after the backend change lands. Treat
 * `undefined` as "unknown / assume sgp4" in the UI.
 */
export type ScreeningResponse = {
  mode: string;
  computation_mode?: ComputationMode;
  conjunctions: ConjunctionSummary[];
  warnings: string[];
};

/** Response from `GET /api/scenarios`. */
export type ScenarioListResponse = {
  scenarios: ScenarioSummary[];
};

/** Query params for `GET /api/catalogs/full` (snake_case mirrors the backend query string). */
export type CatalogFullParams = {
  source?: "fixture" | "live";
  q?: string;
  owner?: string;
  object_type?: string;
  orbit_class?: string;
  group?: string;
  limit?: number;
};

/** Optional tuning for a conjunction screening run (sensible defaults applied in the client). */
export type ScreenConjunctionsOptions = {
  stepSeconds?: number;
  maxResults?: number;
  coarseThresholdM?: number;
  protectedObjectId?: string;
  catalogId?: string;
  startTimeUtc?: string;
  endTimeUtc?: string;
};

/** Result of `POST /api/reports` (report is created, then fetched by id). */
export type ReportCreateResult = {
  report_id: string;
  status: string;
};

/** Inputs for creating a mission report (camelCase; mapped to the backend body by the client). */
export type CreateReportInput = {
  scenarioRunId: string;
  conjunctionId: string;
  planId: string;
  candidateId: string;
};

/** Inputs for applying a planned maneuver. */
export type ApplyManeuverInput = {
  planId: string;
  candidateId: string;
};
