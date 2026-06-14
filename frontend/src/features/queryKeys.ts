/**
 * Central React Query key factory.
 *
 * Keeping keys in one place lets hooks and mutations coordinate the cache (e.g. a maneuver apply
 * invalidating a threat detail) without stringly-typed drift. All keys are readonly tuples.
 */

import type { CatalogFullParams, ScreenConjunctionsOptions } from "./types";

export const queryKeys = {
  demoStatus: () => ["demo", "status"] as const,
  scenarios: () => ["scenarios"] as const,
  scenarioRun: (scenarioId: string) => ["scenario-run", scenarioId] as const,
  threats: (scenarioId: string, options?: ScreenConjunctionsOptions) =>
    ["threats", scenarioId, options ?? null] as const,
  threatDetail: (conjunctionId: string) => ["threat", conjunctionId] as const,
  catalog: (params: CatalogFullParams) => ["catalog", params] as const,
  /** Root key for invalidating every catalog query regardless of filters. */
  catalogRoot: () => ["catalog"] as const,
  plan: (conjunctionId: string) => ["maneuver-plan", "by-conjunction", conjunctionId] as const,
  planById: (planId: string) => ["maneuver-plan", "by-id", planId] as const,
  apply: (planId: string, candidateId: string) => ["maneuver-apply", planId, candidateId] as const,
  report: (reportId: string) => ["report", reportId] as const
} as const;
