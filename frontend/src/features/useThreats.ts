/**
 * Threats hook — ranked close-approach screening for a scenario (the Threats list).
 */

import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";
import { queryKeys } from "./queryKeys";
import type { ScreenConjunctionsOptions } from "./types";

/** Reusable query options. Disabled when `scenarioId` is empty (lazy). */
export function threatsQueryOptions(scenarioId: string, options?: ScreenConjunctionsOptions) {
  return queryOptions({
    queryKey: queryKeys.threats(scenarioId, options),
    queryFn: () => api.screenConjunctions(scenarioId, options),
    enabled: Boolean(scenarioId)
  });
}

/**
 * Ranked close approaches for a scenario.
 *
 * The result's `computation_mode` may be `undefined` until the backend refactor (doc 08 §7) ships;
 * treat `undefined` as "assume sgp4" and only badge "demo geometry" when it equals `"fixture-fallback"`.
 *
 * @param scenarioId e.g. `"protect-isro"`. Empty string keeps the query idle.
 * @param options optional screening tuning (step, max results, thresholds, time window).
 * @returns the React Query result (`data` is `ScreeningResponse`, plus `isLoading`/`isError`/`error`).
 */
export function useThreats(scenarioId: string, options?: ScreenConjunctionsOptions) {
  return useQuery(threatsQueryOptions(scenarioId, options));
}
