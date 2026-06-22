import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/queryClient";
import {
  updateOperationPlan,
  type OperationPlanUpdate,
} from "@/lib/db/operations";

/**
 * Correct an operation's plan (estimated_time / planned_start / planned_end)
 * from the admin operation detail. Invalidates the operation detail and its
 * booked-hours view so the planned-vs-booked variance refreshes.
 */
export function useUpdateOperationPlan(operationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (plan: OperationPlanUpdate) =>
      updateOperationPlan(operationId, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QueryKeys.operations.detail(operationId),
      });
      queryClient.invalidateQueries({
        queryKey: QueryKeys.operations.bookedHours(operationId),
      });
    },
  });
}
