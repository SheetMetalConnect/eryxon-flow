import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { QueryKeys } from "@/lib/queryClient";
import type {
  Batch,
  BatchOperation,
  BatchRequirement,
  BatchStatus,
  BatchType,
} from "./types";

/**
 * Read-side batch hooks. Mutations live in ./batchMutations and
 * ./batchContentMutations; everything is re-exported through
 * `@/hooks/useBatches`.
 */

export function useBatches(filters?: {
  status?: BatchStatus;
  batch_type?: BatchType;
  cell_id?: string;
}) {
  const profile = useProfile();

  return useQuery({
    queryKey: QueryKeys.batches.all(profile?.tenant_id ?? "", filters as Record<string, unknown>),
    queryFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant_id available");
      let query = supabase
        .from("operation_batches")
        .select(`
          *,
          cell:cells(id, name),
          created_by_profile:profiles!operation_batches_created_by_fkey(full_name)
        `)
        .eq("tenant_id", profile.tenant_id)
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
  const profile = useProfile();

  return useQuery({
    queryKey: QueryKeys.batches.detail(batchId ?? ""),
    queryFn: async () => {
      if (!batchId || !profile?.tenant_id) return null;

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
        .eq("tenant_id", profile.tenant_id)
        .single();

      if (error) throw error;
      return data as unknown as Batch;
    },
    enabled: !!batchId && !!profile?.tenant_id,
  });
}

export function useSubBatches(batchId: string | undefined) {
  const profile = useProfile();

  return useQuery({
    queryKey: QueryKeys.batches.subBatches(batchId ?? "", profile?.tenant_id ?? ""),
    queryFn: async () => {
      if (!batchId || !profile?.tenant_id) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- operation_batches table not yet in generated types
      const { data, error } = await (supabase as any)
        .from("operation_batches")
        .select("*, cell:cells(id, name)")
        .eq("parent_batch_id", batchId)
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as Batch[];
    },
    enabled: !!batchId && !!profile?.tenant_id,
  });
}

export function useBatchOperations(batchId: string | undefined) {
  const profile = useProfile();

  return useQuery({
    queryKey: QueryKeys.batches.operations(batchId ?? ""),
    queryFn: async () => {
      if (!batchId || !profile?.tenant_id) return [];

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
        .eq("tenant_id", profile.tenant_id)
        .order("sequence_in_batch", { ascending: true });

      if (error) throw error;
      return data as BatchOperation[];
    },
    enabled: !!batchId && !!profile?.tenant_id,
  });
}

export function useBatchRequirements(batchId: string | undefined) {
  const profile = useProfile();

  return useQuery({
    queryKey: QueryKeys.batches.requirements(batchId ?? ""),
    queryFn: async () => {
      if (!batchId || !profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from("batch_requirements")
        .select("*")
        .eq("batch_id", batchId)
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as BatchRequirement[];
    },
    enabled: !!batchId && !!profile?.tenant_id,
  });
}
