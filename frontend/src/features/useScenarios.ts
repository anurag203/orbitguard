/**
 * Scenario list hook (the Threats scenario switcher / tabs).
 */

import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";
import { queryKeys } from "./queryKeys";

/** Canonical hero-first ordering used across the product. */
const SCENARIO_ORDER = ["protect-isro", "2009-replay", "kessler-sandbox"];

function orderRank(scenarioId: string): number {
  const index = SCENARIO_ORDER.indexOf(scenarioId);
  // Unknown scenarios sort after the known, hero-first set.
  return index === -1 ? SCENARIO_ORDER.length : index;
}

/** Reusable query options; returns a hero-first `ScenarioSummary[]`. */
export function scenariosQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.scenarios(),
    queryFn: async () => {
      const { scenarios } = await api.scenarios();
      return [...scenarios].sort((left, right) => orderRank(left.scenario_id) - orderRank(right.scenario_id));
    }
  });
}

/**
 * The available scenarios, hero-first.
 *
 * @returns the React Query result (`data` is `ScenarioSummary[]`, plus `isLoading`/`isError`/`error`).
 */
export function useScenarios() {
  return useQuery(scenariosQueryOptions());
}
