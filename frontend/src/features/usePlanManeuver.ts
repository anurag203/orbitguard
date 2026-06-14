/**
 * Plan-maneuver mutation — plan an avoidance maneuver for a conjunction (the Safe Move flow).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import { queryKeys } from "./queryKeys";

/**
 * Plan an avoidance maneuver for a conjunction.
 *
 * Mutation: call `mutate(conjunctionId)` / `await mutateAsync(conjunctionId)`.
 * On success the plan is cached by BOTH conjunction id and plan id, so `/avoidance` and the report
 * flow can read the recommendation (and its `plan_id`) without an extra request.
 *
 * @returns the React Query mutation (`mutate`/`mutateAsync`, `data` is `ManeuverPlan`, `isPending`, `isError`, `error`).
 */
export function usePlanManeuver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conjunctionId: string) => api.planManeuver(conjunctionId),
    onSuccess: (plan, conjunctionId) => {
      queryClient.setQueryData(queryKeys.plan(conjunctionId), plan);
      queryClient.setQueryData(queryKeys.planById(plan.plan_id), plan);
    }
  });
}
