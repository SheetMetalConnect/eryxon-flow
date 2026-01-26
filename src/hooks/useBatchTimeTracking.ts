import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { startBatchTimeTracking, stopBatchTimeTracking } from "@/lib/database";

/**
 * Check if a batch currently has active time entries (is being timed)
 */
export function useBatchActiveTimer(batchId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["batch-active-timer", batchId],
    queryFn: async () => {
      if (!batchId) return null;

      // Get operation IDs in this batch
      const { data: batchOps } = await supabase
        .from("batch_operations")
        .select("operation_id")
        .eq("batch_id", batchId);

      if (!batchOps || batchOps.length === 0) return null;

      const opIds = batchOps.map((bo) => bo.operation_id);

      // Check for active time entries on these operations
      const { data: activeEntries } = await supabase
        .from("time_entries")
        .select("id, operation_id, start_time, operator_id")
        .in("operation_id", opIds)
        .is("end_time", null)
        .limit(1);

      if (!activeEntries || activeEntries.length === 0) return null;

      return {
        isActive: true,
        startTime: activeEntries[0].start_time,
        operatorId: activeEntries[0].operator_id,
        activeCount: activeEntries.length,
      };
    },
    enabled: !!batchId && !!profile?.tenant_id,
    refetchInterval: 5000,
  });
}

/**
 * Start batch time tracking - creates time entries for all operations in the batch
 */
export function useStartBatchTimer() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (batchId: string) => {
      if (!profile?.tenant_id || !profile?.id) {
        throw new Error(t("common.noTenantId"));
      }
      await startBatchTimeTracking(batchId, profile.id, profile.tenant_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-active-timer"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch"] });
      toast({
        title: t("batches.timeTracking.started"),
        description: t("batches.timeTracking.startedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Stop batch time tracking and distribute time across operations (stapelscannen)
 */
export function useStopBatchTimer() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (batchId: string) => {
      if (!profile?.id) {
        throw new Error(t("common.noTenantId"));
      }
      return await stopBatchTimeTracking(batchId, profile.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["batch-active-timer"] });
      queryClient.invalidateQueries({ queryKey: ["batch-operations"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch"] });
      toast({
        title: t("batches.timeTracking.stopped"),
        description: t("batches.timeTracking.stoppedDesc", {
          total: result.totalMinutes,
          perOp: result.minutesPerOperation,
          count: result.operationsCount,
        }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
