/**
 * Apply-maneuver mutation — apply a candidate and run secondary screening ("double-check").
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import { queryKeys } from "./queryKeys";
import type { ApplyManeuverInput } from "./types";

/**
 * Apply the recommended maneuver and run the secondary "double-check" screening.
 *
 * Mutation: call `mutate({ planId, candidateId })`. On success the apply result is cached so the
 * before/after risk and secondary status can be re-read without a refetch.
 *
 * @returns the React Query mutation (`mutate`/`mutateAsync`, `data` is `ManeuverApply`, `isPending`, `isError`, `error`).
 */
export function useApplyManeuver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, candidateId }: ApplyManeuverInput) => api.applyManeuver(planId, candidateId),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.apply(result.plan_id, result.candidate_id), result);
    }
  });
}
