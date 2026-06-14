/**
 * Threat detail hook — one close approach in full (geometry, Pc estimate, assumptions).
 * Powers `/threats/:id`.
 */

import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";
import { queryKeys } from "./queryKeys";

/** Reusable query options. Disabled when `conjunctionId` is empty (lazy). */
export function threatDetailQueryOptions(conjunctionId: string) {
  return queryOptions({
    queryKey: queryKeys.threatDetail(conjunctionId),
    queryFn: () => api.conjunctionDetail(conjunctionId),
    enabled: Boolean(conjunctionId)
  });
}

/**
 * Full detail for a single conjunction.
 *
 * @param conjunctionId the conjunction id from a threats row. Empty string keeps the query idle.
 * @returns the React Query result (`data` is `ConjunctionDetail`, plus `isLoading`/`isError`/`error`).
 */
export function useThreatDetail(conjunctionId: string) {
  return useQuery(threatDetailQueryOptions(conjunctionId));
}
