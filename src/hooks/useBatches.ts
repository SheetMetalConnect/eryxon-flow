import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export type BatchType = "laser_nesting" | "tube_batch" | "saw_batch" | "finishing_batch" | "general";
export type BatchStatus = "draft" | "ready" | "in_progress" | "completed" | "cancelled";

export interface Batch {
  id: string;
  tenant_id: string;
  batch_number: string;
  batch_type: BatchType;
  cell_id: string;
  status: BatchStatus;
  material: string | null;
  thickness_mm: number | null;
  estimated_time: number | null;
  actual_time: number | null;
  operations_count: number;
  notes: string | null;
  nesting_metadata: Record<string, any> | null;
  external_id: string | null;
  external_source: string | null;
  created_by: string | null;
  started_by: string | null;
  completed_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
  // Joined data
  cell?: {
    id: string;
    name: string;
  };
  created_by_profile?: {
    full_name: string;
  };
}

export interface BatchOperation {
  id: string;
  batch_id: string;
  operation_id: string;
  sequence_in_batch: number | null;
  quantity_in_batch: number | null;
  tenant_id: string;
  created_at: string;
  // Joined data
  operation?: {
    id: string;
    operation_name: string;
    status: string;
    part?: {
      id: string;
      part_number: string;
      quantity: number;
      job?: {
        id: string;
        job_number: string;
        customer: string;
      };
    };
  };
}

export interface CreateBatchInput {
  batch_number: string;
  batch_type: BatchType;
  cell_id: string;
  material?: string;
  thickness_mm?: number;
  estimated_time?: number;
  notes?: string;
  nesting_metadata?: Record<string, any>;
  operation_ids?: string[];
}

export function useBatches(filters?: {
  status?: BatchStatus;
  batch_type?: BatchType;
  cell_id?: string;
}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["batches", filters, profile?.tenant_id],
    queryFn: async () => {
      let query = supabase
        .from("operation_batches")
        .select(`
          *,
          cell:cells(id, name),
          created_by_profile:profiles!operation_batches_created_by_fkey(full_name)
        `)
        .eq("tenant_id", profile!.tenant_id)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.batch_type) {
        query = query.eq("batch_type", filters.batch_type);
      }
      if (filters?.cell_id) {
        query = query.eq("cell_id", filters.cell_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Batch[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useBatch(batchId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["batch", batchId],
    queryFn: async () => {
      if (!batchId) return null;

      const { data, error } = await supabase
        .from("operation_batches")
        .select(`
          *,
          cell:cells(id, name),
          created_by_profile:profiles!operation_batches_created_by_fkey(full_name),
          started_by_profile:profiles!operation_batches_started_by_fkey(full_name),
          completed_by_profile:profiles!operation_batches_completed_by_fkey(full_name)
        `)
        .eq("id", batchId)
        .eq("tenant_id", profile!.tenant_id)
        .single();

      if (error) throw error;
      return data as Batch;
    },
    enabled: !!batchId && !!profile?.tenant_id,
  });
}

export function useBatchOperations(batchId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["batch-operations", batchId],
    queryFn: async () => {
      if (!batchId) return [];

      const { data, error } = await supabase
        .from("batch_operations")
        .select(`
          *,
          operation:operations(
            id,
            operation_name,
            status,
            part:parts(
              id,
              part_number,
              quantity,
              job:jobs(id, job_number, customer)
            )
          )
        `)
        .eq("batch_id", batchId)
        .eq("tenant_id", profile!.tenant_id)
        .order("sequence_in_batch", { ascending: true });

      if (error) throw error;
      return data as BatchOperation[];
    },
    enabled: !!batchId && !!profile?.tenant_id,
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: CreateBatchInput) => {
      if (!profile?.tenant_id) throw new Error(t("common.noTenantId"));

      // Create the batch
      const { data: batch, error: batchError } = await supabase
        .from("operation_batches")
        .insert({
          tenant_id: profile.tenant_id,
          batch_number: input.batch_number,
          batch_type: input.batch_type,
          cell_id: input.cell_id,
          material: input.material,
          thickness_mm: input.thickness_mm,
          estimated_time: input.estimated_time,
          notes: input.notes,
          nesting_metadata: input.nesting_metadata,
          created_by: profile.id,
          status: "draft",
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Add operations to batch if provided
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
      toast({
        title: t("batches.createSuccess"),
        description: t("batches.createSuccessDesc"),
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

export function useUpdateBatchStatus() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ batchId, status }: { batchId: string; status: BatchStatus }) => {
      const updates: Record<string, any> = { status };

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch"] });
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

export function useAddOperationsToBatch() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ batchId, operationIds }: { batchId: string; operationIds: string[] }) => {
      if (!profile?.tenant_id) throw new Error(t("common.noTenantId"));

      // Get current max sequence
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-operations"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      toast({
        title: t("batches.operationsAdded"),
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

export function useRemoveOperationFromBatch() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
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
      queryClient.invalidateQueries({ queryKey: ["batch-operations"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
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

export function useDeleteBatch() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (batchId: string) => {
      if (!profile?.tenant_id) throw new Error(t("common.noTenantId"));

      // First delete batch operations
      await supabase
        .from("batch_operations")
        .delete()
        .eq("batch_id", batchId)
        .eq("tenant_id", profile.tenant_id);

      // Then delete the batch
      const { error } = await supabase
        .from("operation_batches")
        .delete()
        .eq("id", batchId)
        .eq("tenant_id", profile.tenant_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      toast({
        title: t("batches.deleteSuccess"),
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
