import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOperator } from '@/contexts/OperatorContext';
import { useToast } from '@/hooks/use-toast';
import type {
  OperationBatch,
  BatchWithOperations,
  BatchOperation,
  CreateBatchInput,
  UpdateBatchInput,
  AddOperationToBatchInput,
  AddOperationsToBatchInput,
  BatchStats,
  BatchStatus,
  BatchFilters,
  MaterialGroup,
  GroupableOperation,
} from '@/types/batches';
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

// ============================================================================
// Query Keys
// ============================================================================

export const batchKeys = {
  all: ['batches'] as const,
  lists: () => [...batchKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...batchKeys.lists(), filters] as const,
  details: () => [...batchKeys.all, 'detail'] as const,
  detail: (id: string) => [...batchKeys.details(), id] as const,
  stats: () => [...batchKeys.all, 'stats'] as const,
  groupable: () => [...batchKeys.all, 'groupable'] as const,
  byCell: (cellId: string) => [...batchKeys.all, 'by-cell', cellId] as const,
};

// ============================================================================
// Generate Batch Number
// ============================================================================

async function generateBatchNumber(tenantId: string, batchType: string): Promise<string> {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Get count of batches created today
  const startOfToday = startOfDay(today).toISOString();
  const endOfToday = endOfDay(today).toISOString();

  const { count } = await supabase
    .from('operation_batches')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', startOfToday)
    .lte('created_at', endOfToday);

  const sequenceNum = (count || 0) + 1;
  const typePrefix = batchType.split('_')[0].toUpperCase().slice(0, 2);

  return `${typePrefix}-${datePrefix}-${String(sequenceNum).padStart(3, '0')}`;
}

// ============================================================================
// Fetch Batches
// ============================================================================

export function useBatches(filters?: BatchFilters) {
  return useQuery({
    queryKey: batchKeys.list(filters as Record<string, unknown> | undefined),
    queryFn: async () => {
      let query = supabase
        .from('operation_batches')
        .select(`
          *,
          cell:cells (
            id,
            name,
            color,
            icon_name
          ),
          created_by_user:profiles!operation_batches_created_by_fkey (
            id,
            full_name
          ),
          started_by_user:profiles!operation_batches_started_by_fkey (
            id,
            full_name
          ),
          batch_operations (
            id,
            operation_id,
            sequence_in_batch,
            quantity_in_batch,
            operation:operations (
              id,
              operation_name,
              status,
              estimated_time,
              sequence,
              part:parts (
                id,
                part_number,
                material,
                quantity,
                job:jobs (
                  id,
                  job_number,
                  customer,
                  due_date
                )
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters?.batch_type && filters.batch_type.length > 0) {
        query = query.in('batch_type', filters.batch_type);
      }
      if (filters?.cell_id) {
        query = query.eq('cell_id', filters.cell_id);
      }
      if (filters?.material) {
        query = query.eq('material', filters.material);
      }
      if (filters?.thickness_mm) {
        query = query.eq('thickness_mm', filters.thickness_mm);
      }
      if (filters?.search) {
        query = query.or(`batch_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as BatchWithOperations[];
    },
  });
}

// ============================================================================
// Fetch Single Batch
// ============================================================================

export function useBatch(id: string | null) {
  return useQuery({
    queryKey: batchKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('operation_batches')
        .select(`
          *,
          cell:cells (
            id,
            name,
            color,
            icon_name
          ),
          created_by_user:profiles!operation_batches_created_by_fkey (
            id,
            full_name
          ),
          started_by_user:profiles!operation_batches_started_by_fkey (
            id,
            full_name
          ),
          batch_operations (
            id,
            operation_id,
            sequence_in_batch,
            quantity_in_batch,
            operation:operations (
              id,
              operation_name,
              status,
              estimated_time,
              sequence,
              part:parts (
                id,
                part_number,
                material,
                quantity,
                job:jobs (
                  id,
                  job_number,
                  customer,
                  due_date
                )
              )
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as BatchWithOperations;
    },
    enabled: !!id,
  });
}

// ============================================================================
// Fetch Batches by Cell (for WorkQueue)
// ============================================================================

export function useBatchesByCell(cellId: string | null) {
  return useQuery({
    queryKey: batchKeys.byCell(cellId || ''),
    queryFn: async () => {
      if (!cellId) return [];

      const { data, error } = await supabase
        .from('operation_batches')
        .select(`
          *,
          batch_operations (
            id,
            operation_id,
            sequence_in_batch,
            operation:operations (
              id,
              operation_name,
              status,
              estimated_time,
              part:parts (
                id,
                part_number,
                material,
                quantity,
                job:jobs (
                  id,
                  job_number,
                  customer,
                  due_date
                )
              )
            )
          )
        `)
        .eq('cell_id', cellId)
        .in('status', ['draft', 'ready', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as BatchWithOperations[];
    },
    enabled: !!cellId,
  });
}

// ============================================================================
// Batch Stats
// ============================================================================

export function useBatchStats() {
  return useQuery({
    queryKey: batchKeys.stats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operation_batches')
        .select('id, status, created_at, completed_at, operations_count, nesting_metadata');

      if (error) throw error;

      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      const stats: BatchStats = {
        total: data?.length || 0,
        draft: 0,
        ready: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        completedToday: 0,
        completedThisWeek: 0,
        avgOperationsPerBatch: 0,
        avgEfficiency: null,
      };

      let totalOperations = 0;
      let totalEfficiency = 0;
      let efficiencyCount = 0;

      data?.forEach((batch: any) => {
        // Count by status
        if (batch.status in stats) {
          (stats as any)[batch.status]++;
        }

        // Count completed today/this week
        if (batch.completed_at && batch.status === 'completed') {
          const completedDate = new Date(batch.completed_at);
          if (completedDate >= todayStart && completedDate <= todayEnd) {
            stats.completedToday++;
          }
          if (completedDate >= weekStart && completedDate <= weekEnd) {
            stats.completedThisWeek++;
          }
        }

        // Sum operations
        totalOperations += batch.operations_count || 0;

        // Sum efficiency
        if (batch.nesting_metadata?.efficiency_percent) {
          totalEfficiency += batch.nesting_metadata.efficiency_percent;
          efficiencyCount++;
        }
      });

      stats.avgOperationsPerBatch = stats.total > 0 ? totalOperations / stats.total : 0;
      stats.avgEfficiency = efficiencyCount > 0 ? totalEfficiency / efficiencyCount : null;

      return stats;
    },
  });
}

// ============================================================================
// Get Groupable Operations (for batch creation UI)
// ============================================================================

// Optimized: Uses LEFT JOIN to get batch info in single query instead of 2 separate queries
export function useGroupableOperations(cellId?: string) {
  return useQuery({
    queryKey: [...batchKeys.groupable(), cellId],
    queryFn: async () => {
      // Single query with LEFT JOIN to batch_operations - replaces 2 separate queries
      let query = supabase
        .from('operations')
        .select(`
          id,
          operation_name,
          cell_id,
          status,
          estimated_time,
          cell:cells (
            id,
            name
          ),
          part:parts (
            id,
            part_number,
            material,
            height_mm,
            quantity,
            job:jobs (
              id,
              job_number,
              customer,
              due_date
            )
          ),
          batch_operations (
            batch_id
          )
        `)
        .in('status', ['not_started', 'on_hold'])
        .is('deleted_at', null);

      if (cellId) {
        query = query.eq('cell_id', cellId);
      }

      const { data: operations, error: opsError } = await query;
      if (opsError) throw opsError;

      // Transform operations - batch info is now included in the query result
      const groupableOps: GroupableOperation[] = (operations || [])
        .map((op: any) => {
          // batch_operations is an array (LEFT JOIN), get first batch_id if exists
          const existingBatchId = op.batch_operations?.[0]?.batch_id || null;
          return {
            id: op.id,
            operation_name: op.operation_name,
            cell_id: op.cell_id,
            cell_name: op.cell?.name || 'Unknown',
            part_id: op.part?.id || '',
            part_number: op.part?.part_number || '',
            material: op.part?.material || '',
            thickness_mm: op.part?.height_mm || null, // Using height_mm as thickness for sheet metal
            quantity: op.part?.quantity || null,
            job_id: op.part?.job?.id || '',
            job_number: op.part?.job?.job_number || '',
            customer: op.part?.job?.customer || null,
            due_date: op.part?.job?.due_date || null,
            status: op.status,
            estimated_time: op.estimated_time || 0,
            existing_batch_id: existingBatchId,
          };
        });

      // Group by material + thickness + cell
      const groups: Record<string, MaterialGroup> = {};

      groupableOps.forEach(op => {
        // Skip if already in a batch
        if (op.existing_batch_id) return;

        const key = `${op.cell_id}|${op.material}|${op.thickness_mm || 'null'}`;
        if (!groups[key]) {
          groups[key] = {
            material: op.material,
            thickness_mm: op.thickness_mm,
            cell_id: op.cell_id,
            cell_name: op.cell_name,
            operations: [],
            total_estimated_time: 0,
          };
        }
        groups[key].operations.push(op);
        groups[key].total_estimated_time += op.estimated_time;
      });

      return {
        operations: groupableOps,
        materialGroups: Object.values(groups).sort((a, b) => b.operations.length - a.operations.length),
      };
    },
  });
}

// ============================================================================
// Create Batch
// ============================================================================

export function useCreateBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateBatchInput & { operation_ids?: string[] }) => {
      const batchNumber = await generateBatchNumber(
        profile?.tenant_id || '',
        input.batch_type
      );

      const { data: batch, error: batchError } = await supabase
        .from('operation_batches')
        .insert({
          batch_number: batchNumber,
          batch_type: input.batch_type,
          cell_id: input.cell_id,
          material: input.material || null,
          thickness_mm: input.thickness_mm || null,
          notes: input.notes || null,
          nesting_metadata: input.nesting_metadata as any || null,
          external_id: input.external_id || null,
          external_source: input.external_source || null,
          tenant_id: profile?.tenant_id,
          created_by: profile?.id,
          status: 'draft',
          operations_count: input.operation_ids?.length || 0,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Add operations to batch if provided
      if (input.operation_ids && input.operation_ids.length > 0) {
        const batchOperations = input.operation_ids.map((opId, index) => ({
          batch_id: batch.id,
          operation_id: opId,
          tenant_id: profile?.tenant_id,
          sequence_in_batch: index + 1,
        }));

        const { error: opsError } = await supabase
          .from('batch_operations')
          .insert(batchOperations);

        if (opsError) throw opsError;
      }

      return batch as OperationBatch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      toast({
        title: 'Batch created',
        description: `Batch ${data.batch_number} has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating batch',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Update Batch
// ============================================================================

export function useUpdateBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateBatchInput & { id: string }) => {
      const { data, error } = await supabase
        .from('operation_batches')
        .update({
          ...input,
          nesting_metadata: input.nesting_metadata as any,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as OperationBatch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      toast({
        title: 'Batch updated',
        description: `Batch ${data.batch_number} has been updated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating batch',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Delete Batch
// ============================================================================

export function useDeleteBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First delete batch_operations
      const { error: opsError } = await supabase
        .from('batch_operations')
        .delete()
        .eq('batch_id', id);

      if (opsError) throw opsError;

      // Then delete the batch
      const { error } = await supabase
        .from('operation_batches')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      toast({
        title: 'Batch deleted',
        description: 'The batch has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting batch',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Add Operation to Batch
// ============================================================================

export function useAddOperationToBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: AddOperationToBatchInput) => {
      const { data, error } = await supabase
        .from('batch_operations')
        .insert({
          batch_id: input.batch_id,
          operation_id: input.operation_id,
          tenant_id: profile?.tenant_id,
          sequence_in_batch: input.sequence_in_batch,
          quantity_in_batch: input.quantity_in_batch,
        })
        .select()
        .single();

      if (error) throw error;

      // The trigger function handles updating operations_count automatically
      // No need to call RPC - just return the data

      return data as BatchOperation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      toast({
        title: 'Operation added',
        description: 'The operation has been added to the batch.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding operation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Add Multiple Operations to Batch
// ============================================================================

export function useAddOperationsToBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ batch_id, operation_ids }: AddOperationsToBatchInput) => {
      const inserts = operation_ids.map((opId, index) => ({
        batch_id,
        operation_id: opId,
        tenant_id: profile?.tenant_id,
        sequence_in_batch: index + 1,
      }));

      const { data, error } = await supabase
        .from('batch_operations')
        .insert(inserts)
        .select();

      if (error) throw error;

      // Update operations count
      await supabase
        .from('operation_batches')
        .update({ operations_count: operation_ids.length })
        .eq('id', batch_id);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      toast({
        title: 'Operations added',
        description: `${data?.length || 0} operations have been added to the batch.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding operations',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Remove Operation from Batch
// ============================================================================

export function useRemoveOperationFromBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      batch_id,
      operation_id,
    }: {
      batch_id: string;
      operation_id: string;
    }) => {
      const { error } = await supabase
        .from('batch_operations')
        .delete()
        .eq('batch_id', batch_id)
        .eq('operation_id', operation_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      toast({
        title: 'Operation removed',
        description: 'The operation has been removed from the batch.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error removing operation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Start Batch
// ============================================================================

export function useStartBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { activeOperator } = useOperator();

  return useMutation({
    mutationFn: async (id: string) => {
      // Use active operator if on terminal, otherwise use logged-in user
      const startedBy = activeOperator?.id || profile?.id || null;

      const { data, error } = await supabase
        .from('operation_batches')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          started_by: startedBy,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update all operations in the batch to in_progress
      const { data: batchOps } = await supabase
        .from('batch_operations')
        .select('operation_id')
        .eq('batch_id', id);

      if (batchOps && batchOps.length > 0) {
        const operationIds = batchOps.map(bo => bo.operation_id);
        await supabase
          .from('operations')
          .update({ status: 'in_progress' })
          .in('id', operationIds);
      }

      return data as OperationBatch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toast({
        title: 'Batch started',
        description: `Batch ${data.batch_number} is now in progress.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error starting batch',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Complete Batch (completes all operations atomically)
// ============================================================================

export function useCompleteBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const now = new Date().toISOString();

      // Get all operations in the batch
      const { data: batchOps } = await supabase
        .from('batch_operations')
        .select('operation_id')
        .eq('batch_id', id);

      if (batchOps && batchOps.length > 0) {
        const operationIds = batchOps.map(bo => bo.operation_id);

        // Complete all operations
        await supabase
          .from('operations')
          .update({
            status: 'completed',
            completed_at: now,
            completion_percentage: 100,
          })
          .in('id', operationIds);
      }

      // Complete the batch
      const { data, error } = await supabase
        .from('operation_batches')
        .update({
          status: 'completed',
          completed_at: now,
          completed_by: profile?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as OperationBatch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toast({
        title: 'Batch completed',
        description: `Batch ${data.batch_number} and all its operations have been completed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error completing batch',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Cancel Batch
// ============================================================================

export function useCancelBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Reset operations status back to not_started
      const { data: batchOps } = await supabase
        .from('batch_operations')
        .select('operation_id')
        .eq('batch_id', id);

      if (batchOps && batchOps.length > 0) {
        const operationIds = batchOps.map(bo => bo.operation_id);
        await supabase
          .from('operations')
          .update({ status: 'not_started' })
          .in('id', operationIds);
      }

      // Cancel the batch
      const { data, error } = await supabase
        .from('operation_batches')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as OperationBatch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toast({
        title: 'Batch cancelled',
        description: `Batch ${data.batch_number} has been cancelled.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error cancelling batch',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Update Batch Status
// ============================================================================

export function useUpdateBatchStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: BatchStatus;
    }) => {
      const updates: Partial<OperationBatch> = { status };

      if (status === 'in_progress') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('operation_batches')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as OperationBatch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      toast({
        title: 'Status updated',
        description: `Batch status changed to ${data.status.replace('_', ' ')}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
