import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { QueryKeys } from "@/lib/queryClient";
import type { Batch, BatchStatus, CreateBatchInput } from "./types";

/**
 * Batch lifecycle mutations (create / update / status / delete).
 *
 * Invalidation note: the raw `["batches"]` key is a deliberate prefix match —
 * it catches list, detail, operations, and requirements variants in one go.
 * Sessions are single-tenant, so the broad prefix never crosses tenants.
 */

export function useCreateBatch() {
  const queryClient = useQueryClient();
  const profile = useProfile();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: CreateBatchInput) => {
      if (!profile?.tenant_id) throw new Error(t("common.noTenantId"));

      const insertData = {
          tenant_id: profile.tenant_id,
          batch_number: input.batch_number,
          batch_type: input.batch_type,
          cell_id: input.cell_id,
          material: input.material,
          thickness_mm: input.thickness_mm,
          estimated_time: input.estimated_time,
          notes: input.notes,
          nesting_metadata: input.nesting_metadata as unknown,
          nesting_image_url: input.nesting_image_url,
          layout_image_url: input.layout_image_url,
          parent_batch_id: input.parent_batch_id,
          created_by: profile.id,
          status: "draft" as const,
      };
      const { data: batch, error: batchError } = await supabase
        .from("operation_batches")
        .insert(insertData as never)
        .select()
        .single();

      if (batchError) throw batchError;

      if (input.operation_ids && input.operation_ids.length > 0) {
        const batchOperations = input.operation_ids.map((opId, index) => ({
          tenant_id: profile.tenant_id,
          batch_id: batch.id,
          operation_id: opId,
          sequence_in_batch: index + 1,
        }));

        const { error: opsError } = await supabase
          .from("batch_operations")
          .insert(batchOperations);

        if (opsError) throw opsError;
      }

      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      toast.success(t("batches.createSuccess"), { description: t("batches.createSuccessDesc") });
    },
    onError: (error: Error) => {
      toast.error(t("common.error"), { description: error.message });
    },
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();
  const profile = useProfile();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Batch> }) => {
      if (!profile?.tenant_id) throw new Error(t("common.noTenantId"));

      const { data, error } = await supabase
        .from("operation_batches")
        .update(updates as never)
        .eq("id", id)
        .eq("tenant_id", profile.tenant_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.batches.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      toast.success(t("batches.updateSuccess"));
    },
    onError: (error: Error) => {
      toast.error(t("common.error"), { description: error.message });
    },
  });
}

export function useUpdateBatchStatus() {
  const queryClient = useQueryClient();
  const profile = useProfile();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ batchId, status }: { batchId: string; status: BatchStatus }) => {
      const updates: Record<string, string> = { status };

      if (status === "in_progress" && profile?.id) {
        updates.started_at = new Date().toISOString();
        updates.started_by = profile.id;
      } else if (status === "completed" && profile?.id) {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = profile.id;
      }

      const { data, error } = await supabase
        .from("operation_batches")
        .update(updates)
        .eq("id", batchId)
        .eq("tenant_id", profile?.tenant_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ batchId, status }) => {
      await queryClient.cancelQueries({ queryKey: QueryKeys.batches.detail(batchId) });
      const previous = queryClient.getQueryData(QueryKeys.batches.detail(batchId));
      queryClient.setQueryData(QueryKeys.batches.detail(batchId), (old: Record<string, unknown> | undefined) =>
        old ? { ...old, status } : old
      );
      return { previous, batchId };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QueryKeys.batches.detail(context.batchId), context.previous);
      }
      toast.error(t("common.error"), { description: error.message });
    },
    onSettled: (_, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.batches.detail(variables.batchId) });
    },
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();
  const profile = useProfile();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (batchId: string) => {
      if (!profile?.tenant_id) throw new Error(t("common.noTenantId"));

      await supabase
        .from("batch_operations")
        .delete()
        .eq("batch_id", batchId)
        .eq("tenant_id", profile.tenant_id);

      const { error } = await supabase
        .from("operation_batches")
        .delete()
        .eq("id", batchId) // RLS checks should handle sub-batches, but user might need to delete them manually or we add cascade
        .eq("tenant_id", profile.tenant_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      toast.success(t("batches.deleteSuccess"));
    },
    onError: (error: Error) => {
      toast.error(t("common.error"), { description: error.message });
    },
  });
}
