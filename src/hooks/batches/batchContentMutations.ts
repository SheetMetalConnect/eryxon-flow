import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { QueryKeys } from "@/lib/queryClient";

/**
 * Mutations for what a batch CONTAINS: its operations and material
 * requirements. Batch lifecycle mutations live in ./batchMutations.
 */

export function useAddOperationsToBatch() {
  const queryClient = useQueryClient();
  const profile = useProfile();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ batchId, operationIds }: { batchId: string; operationIds: string[] }) => {
      if (!profile?.tenant_id) throw new Error(t("common.noTenantId"));

      const { data: existing } = await supabase
        .from("batch_operations")
        .select("sequence_in_batch")
        .eq("batch_id", batchId)
        .eq("tenant_id", profile!.tenant_id)
        .order("sequence_in_batch", { ascending: false })
        .limit(1);

      const startSequence = (existing?.[0]?.sequence_in_batch || 0) + 1;

      const batchOperations = operationIds.map((opId, index) => ({
        tenant_id: profile.tenant_id,
        batch_id: batchId,
        operation_id: opId,
        sequence_in_batch: startSequence + index,
      }));

      const { error } = await supabase
        .from("batch_operations")
        .insert(batchOperations);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.batches.operations(variables.batchId) });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.batches.detail(variables.batchId) });
      toast.success(t("batches.operationsAdded"));
    },
    onError: (error: Error) => {
      toast.error(t("common.error"), { description: error.message });
    },
  });
}

export function useRemoveOperationFromBatch() {
  const queryClient = useQueryClient();
  const profile = useProfile();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ batchOperationId }: { batchOperationId: string }) => {
      const { error } = await supabase
        .from("batch_operations")
        .delete()
        .eq("id", batchOperationId)
        .eq("tenant_id", profile?.tenant_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
    onError: (error: Error) => {
      toast.error(t("common.error"), { description: error.message });
    },
  });
}

export function useCreateBatchRequirement() {
  const queryClient = useQueryClient();
  const profile = useProfile();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ batchId, materialName, quantity }: { batchId: string; materialName: string; quantity: number }) => {
      if (!profile?.tenant_id) throw new Error(t("common.noTenantId"));

      const { data, error } = await supabase
        .from("batch_requirements" as "operation_batches")
        .insert({
          tenant_id: profile.tenant_id,
          batch_id: batchId,
          material_name: materialName,
          quantity: quantity,
          status: 'pending'
        } as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.batches.requirements(variables.batchId) });
      toast.success(t("batches.requirementAdded"));
    },
    onError: (error: Error) => {
      toast.error(t("common.error"), { description: error.message });
    },
  });
}
