/**
 * Demo domain hooks: readiness status and the deterministic replay.
 *
 * Used by Home (proof stats / live-vs-offline chip) and System ("under the hood").
 */

import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";
import { queryKeys } from "./queryKeys";

/** Reusable query options (so routes can prefetch the demo status on navigation). */
export function demoStatusQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.demoStatus(),
    queryFn: () => api.demoStatus()
  });
}

/**
 * Live/offline readiness + the per-check matrix.
 *
 * @returns the React Query result (`data`, `isLoading`, `isError`, `error`, `refetch`, …).
 */
export function useDemoStatus() {
  return useQuery(demoStatusQueryOptions());
}
