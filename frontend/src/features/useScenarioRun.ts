/**
 * Scenario run hook — the deterministic run for a scenario (timeline beats, protected object,
 * top conjunction id). Used by Sky/Threads/Avoidance to anchor the active scenario.
 */

import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";
import { queryKeys } from "./queryKeys";

/** Reusable query options. Disabled when `scenarioId` is empty (lazy). */
export function scenarioRunQueryOptions(scenarioId: string) {
  return queryOptions({
    queryKey: queryKeys.scenarioRun(scenarioId),
    queryFn: () => api.runScenario(scenarioId),
    enabled: Boolean(scenarioId)
  });
}

/**
 * Run a scenario deterministically.
 *
 * @param scenarioId e.g. `"protect-isro"`. Pass an empty string to keep the query idle.
 * @returns the React Query result (`data` is `ScenarioRun`, plus `isLoading`/`isError`/`error`).
 */
export function useScenarioRun(scenarioId: string) {
  return useQuery(scenarioRunQueryOptions(scenarioId));
}
