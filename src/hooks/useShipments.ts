import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type {
  Shipment,
  ShipmentWithJobs,
  ShipmentJob,
  CreateShipmentInput,
  UpdateShipmentInput,
  AddJobToShipmentInput,
  ShipmentStats,
  ShipmentStatus,
  PostalCodeGroup,
} from '@/types/shipping';
import { addDays, isBefore, isAfter, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

// ============================================================================
// Query Keys
// ============================================================================

export const shipmentKeys = {
  all: ['shipments'] as const,
  lists: () => [...shipmentKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...shipmentKeys.lists(), filters] as const,
  details: () => [...shipmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...shipmentKeys.details(), id] as const,
  stats: () => [...shipmentKeys.all, 'stats'] as const,
  byPostalCode: () => [...shipmentKeys.all, 'by-postal-code'] as const,
  availableJobs: () => [...shipmentKeys.all, 'available-jobs'] as const,
};

// ============================================================================
// Fetch Shipments
// ============================================================================

export function useShipments(filters?: { status?: ShipmentStatus[] }) {
  return useQuery({
    queryKey: shipmentKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('shipments')
        .select(`
          *,
          shipment_jobs (
            id,
            job_id,
            weight_kg,
            volume_m3,
            packages_count,
            loading_sequence,
            loaded_at,
            delivered_at,
            job:jobs (
              id,
              job_number,
              customer,
              status,
              due_date,
              delivery_address,
              delivery_city,
              delivery_postal_code,
              total_weight_kg,
              total_volume_m3,
              package_count
            )
          )
        `)
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ShipmentWithJobs[];
    },
  });
}

// ============================================================================
// Fetch Single Shipment
// ============================================================================

export function useShipment(id: string | null) {
  return useQuery({
    queryKey: shipmentKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          shipment_jobs (
            *,
            job:jobs (
              id,
              job_number,
              customer,
              status,
              due_date,
              delivery_address,
              delivery_city,
              delivery_postal_code,
              total_weight_kg,
              total_volume_m3,
              package_count,
              parts (
                id,
                part_number,
                quantity,
                weight_kg,
                length_mm,
                width_mm,
                height_mm
              )
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ShipmentWithJobs;
    },
    enabled: !!id,
  });
}

// ============================================================================
// Shipment Stats
// ============================================================================

export function useShipmentStats() {
  return useQuery({
    queryKey: shipmentKeys.stats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('id, status, scheduled_date, current_weight_kg, current_volume_m3');

      if (error) throw error;

      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

      const stats: ShipmentStats = {
        total: data?.length || 0,
        draft: 0,
        planned: 0,
        loading: 0,
        in_transit: 0,
        delivered: 0,
        cancelled: 0,
        scheduledToday: 0,
        scheduledThisWeek: 0,
        totalWeight: 0,
        totalVolume: 0,
      };

      data?.forEach((shipment: any) => {
        // Count by status
        if (shipment.status in stats) {
          (stats as any)[shipment.status]++;
        }

        // Count scheduled for today
        if (shipment.scheduled_date) {
          const scheduledDate = new Date(shipment.scheduled_date);
          if (
            scheduledDate >= startOfDay(today) &&
            scheduledDate <= endOfDay(today)
          ) {
            stats.scheduledToday++;
          }
          if (scheduledDate >= weekStart && scheduledDate <= weekEnd) {
            stats.scheduledThisWeek++;
          }
        }

        // Sum weights and volumes
        stats.totalWeight += shipment.current_weight_kg || 0;
        stats.totalVolume += shipment.current_volume_m3 || 0;
      });

      return stats;
    },
  });
}

// ============================================================================
// Available Jobs (completed, not yet shipped)
// ============================================================================

export function useAvailableJobsForShipping() {
  return useQuery({
    queryKey: shipmentKeys.availableJobs(),
    queryFn: async () => {
      // Get jobs that are completed and not in an active shipment
      const { data: shippedJobIds } = await supabase
        .from('shipment_jobs')
        .select('job_id, shipment:shipments!inner(status)')
        .not('shipment.status', 'in', '("delivered","cancelled")');

      const shippedIds = (shippedJobIds || []).map((sj: any) => sj.job_id);

      let query = supabase
        .from('jobs')
        .select(`
          id,
          job_number,
          customer,
          status,
          due_date,
          delivery_address,
          delivery_city,
          delivery_postal_code,
          delivery_country,
          total_weight_kg,
          total_volume_m3,
          package_count,
          parts (id)
        `)
        .eq('status', 'completed')
        .order('due_date', { ascending: true });

      if (shippedIds.length > 0) {
        query = query.not('id', 'in', `(${shippedIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((job: any) => ({
        ...job,
        parts_count: job.parts?.length || 0,
      }));
    },
  });
}

// ============================================================================
// Jobs grouped by postal code
// ============================================================================

export function useJobsByPostalCode() {
  return useQuery({
    queryKey: [...shipmentKeys.availableJobs(), 'by-postal-code'],
    queryFn: async () => {
      // Get completed jobs not yet shipped
      const { data: shippedJobIds } = await supabase
        .from('shipment_jobs')
        .select('job_id, shipment:shipments!inner(status)')
        .not('shipment.status', 'in', '("delivered","cancelled")');

      const shippedIds = (shippedJobIds || []).map((sj: any) => sj.job_id);

      let query = supabase
        .from('jobs')
        .select(`
          id,
          job_number,
          customer,
          status,
          delivery_city,
          delivery_postal_code,
          delivery_country,
          total_weight_kg,
          total_volume_m3,
          package_count
        `)
        .eq('status', 'completed')
        .not('delivery_postal_code', 'is', null);

      if (shippedIds.length > 0) {
        query = query.not('id', 'in', `(${shippedIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by postal code
      const groups: Record<string, PostalCodeGroup> = {};

      (data || []).forEach((job: any) => {
        const key = job.delivery_postal_code || 'unknown';
        if (!groups[key]) {
          groups[key] = {
            postal_code: key,
            city: job.delivery_city,
            country: job.delivery_country,
            jobs: [],
            total_weight: 0,
            total_volume: 0,
            total_packages: 0,
          };
        }
        groups[key].jobs.push({
          id: job.id,
          job_number: job.job_number,
          customer: job.customer,
          status: job.status,
          weight_kg: job.total_weight_kg,
          volume_m3: job.total_volume_m3,
        });
        groups[key].total_weight += job.total_weight_kg || 0;
        groups[key].total_volume += job.total_volume_m3 || 0;
        groups[key].total_packages += job.package_count || 1;
      });

      return Object.values(groups).sort((a, b) => b.jobs.length - a.jobs.length);
    },
  });
}

// ============================================================================
// Create Shipment
// ============================================================================

export function useCreateShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateShipmentInput) => {
      // First generate a shipment number
      const { data: numberData, error: numberError } = await supabase.rpc(
        'generate_shipment_number',
        { p_tenant_id: profile?.tenant_id }
      );

      if (numberError) throw numberError;

      const { data, error } = await supabase
        .from('shipments')
        .insert({
          ...input,
          shipment_number: numberData,
          tenant_id: profile?.tenant_id,
          created_by: profile?.id,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Shipment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
      toast({
        title: 'Shipment created',
        description: `Shipment ${data.shipment_number} has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating shipment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Update Shipment
// ============================================================================

export function useUpdateShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateShipmentInput & { id: string }) => {
      const { data, error } = await supabase
        .from('shipments')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Shipment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
      toast({
        title: 'Shipment updated',
        description: `Shipment ${data.shipment_number} has been updated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating shipment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Delete Shipment
// ============================================================================

export function useDeleteShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shipments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
      toast({
        title: 'Shipment deleted',
        description: 'The shipment has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting shipment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Add Job to Shipment
// ============================================================================

export function useAddJobToShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: AddJobToShipmentInput) => {
      const { data, error } = await supabase
        .from('shipment_jobs')
        .insert({
          ...input,
          tenant_id: profile?.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ShipmentJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
      toast({
        title: 'Job added',
        description: 'The job has been added to the shipment.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding job',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Add Multiple Jobs to Shipment
// ============================================================================

export function useAddJobsToShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      shipment_id,
      job_ids,
    }: {
      shipment_id: string;
      job_ids: string[];
    }) => {
      // First fetch the jobs to get their weight and volume data
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, total_weight_kg, total_volume_m3, package_count')
        .in('id', job_ids);

      if (jobsError) throw jobsError;

      // Create a map for quick lookup
      const jobMap = new Map(
        (jobsData || []).map((job: any) => [job.id, job])
      );

      const inserts = job_ids.map((job_id, index) => {
        const job = jobMap.get(job_id);
        return {
          shipment_id,
          job_id,
          tenant_id: profile?.tenant_id,
          loading_sequence: index + 1,
          weight_kg: job?.total_weight_kg || null,
          volume_m3: job?.total_volume_m3 || null,
          packages_count: job?.package_count || 1,
        };
      });

      const { data, error } = await supabase
        .from('shipment_jobs')
        .insert(inserts)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
      toast({
        title: 'Jobs added',
        description: `${data?.length || 0} jobs have been added to the shipment.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding jobs',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Remove Job from Shipment
// ============================================================================

export function useRemoveJobFromShipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      shipment_id,
      job_id,
    }: {
      shipment_id: string;
      job_id: string;
    }) => {
      const { error } = await supabase
        .from('shipment_jobs')
        .delete()
        .eq('shipment_id', shipment_id)
        .eq('job_id', job_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
      toast({
        title: 'Job removed',
        description: 'The job has been removed from the shipment.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error removing job',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Update Shipment Status
// ============================================================================

export function useUpdateShipmentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: ShipmentStatus;
    }) => {
      const updates: Partial<Shipment> = { status };

      // Set timestamps based on status
      if (status === 'in_transit') {
        updates.actual_departure = new Date().toISOString();
      } else if (status === 'delivered') {
        updates.actual_arrival = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('shipments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Shipment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
      toast({
        title: 'Status updated',
        description: `Shipment status changed to ${data.status.replace('_', ' ')}.`,
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
