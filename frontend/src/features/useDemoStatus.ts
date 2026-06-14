/**
 * Demo domain hooks: readiness status and the deterministic replay.
 *
 * Used by Home (proof stats / live-vs-offline chip) and System ("under the hood").
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

/**
 * Re-run a deterministic demo flow (defaults to the Protect ISRO round-1 replay).
 *
 * Mutation. On success it refreshes the demo status so any readiness UI updates.
 *
 * @returns the React Query mutation (`mutate`/`mutateAsync`, `data`, `isPending`, `isError`, `error`).
 */
export function useDemoReplay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flowId?: string) => api.demoReplay(flowId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.demoStatus() });
    }
  });
}
