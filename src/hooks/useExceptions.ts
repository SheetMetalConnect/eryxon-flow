import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import type { ExceptionStatus, ExceptionWithExpectation } from '@/integrations/supabase/types/tables/expectations'

interface ExceptionStats {
  open_count: number
  acknowledged_count: number
  resolved_count: number
  dismissed_count: number
  total_count: number
  avg_resolution_time_hours: number | null
}

interface UseExceptionsOptions {
  status?: ExceptionStatus | 'all'
  limit?: number
}

export function useExceptions(options: UseExceptionsOptions = {}) {
  const { status = 'all', limit = 50 } = options
  const { t } = useTranslation(['admin', 'common'])
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  // Fetch exceptions with their expectations
  const {
    data: exceptions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['exceptions', profile?.tenant_id, status, limit],
    queryFn: async () => {
      if (!profile?.tenant_id) return []

      let query = supabase
        .from('exceptions')
        .select(`
          *,
          expectation:expectations(
            id,
            entity_type,
            entity_id,
            expectation_type,
            belief_statement,
            expected_value,
            expected_at,
            version,
            source,
            context
          ),
          acknowledger:profiles!exceptions_acknowledged_by_fkey(id, full_name),
          resolver:profiles!exceptions_resolved_by_fkey(id, full_name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('detected_at', { ascending: false })
        .limit(limit)

      if (status !== 'all') {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as unknown as ExceptionWithExpectation[]
    },
    enabled: !!profile?.tenant_id,
  })

  // Fetch exception stats
  const { data: stats } = useQuery({
    queryKey: ['exception-stats', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null

      const { data, error } = await supabase.rpc('get_exception_stats', {
        p_tenant_id: profile.tenant_id,
      })

      if (error) throw error
      return data?.[0] as ExceptionStats | null
    },
    enabled: !!profile?.tenant_id,
  })

  // Acknowledge exception
  const acknowledgeMutation = useMutation({
    mutationFn: async (exceptionId: string) => {
      const { error } = await supabase.rpc('acknowledge_exception', {
        p_exception_id: exceptionId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] })
      queryClient.invalidateQueries({ queryKey: ['exception-stats'] })
      toast.success(t('admin:exceptionInbox.exceptionAcknowledged'))
    },
    onError: (error) => {
      toast.error(t('admin:exceptionInbox.actionFailed'))
      console.error(error)
    },
  })

  // Resolve exception
  const resolveMutation = useMutation({
    mutationFn: async ({
      exceptionId,
      rootCause,
      correctiveAction,
      preventiveAction,
      resolution,
    }: {
      exceptionId: string
      rootCause?: string
      correctiveAction?: string
      preventiveAction?: string
      resolution?: Record<string, unknown>
    }) => {
      const { error } = await supabase.rpc('resolve_exception', {
        p_exception_id: exceptionId,
        p_root_cause: rootCause || null,
        p_corrective_action: correctiveAction || null,
        p_preventive_action: preventiveAction || null,
        p_resolution: (resolution as any) || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] })
      queryClient.invalidateQueries({ queryKey: ['exception-stats'] })
      toast.success(t('admin:exceptionInbox.exceptionResolved'))
    },
    onError: (error) => {
      toast.error(t('admin:exceptionInbox.actionFailed'))
      console.error(error)
    },
  })

  // Dismiss exception
  const dismissMutation = useMutation({
    mutationFn: async ({
      exceptionId,
      reason,
    }: {
      exceptionId: string
      reason?: string
    }) => {
      const { error } = await supabase.rpc('dismiss_exception', {
        p_exception_id: exceptionId,
        p_reason: reason || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] })
      queryClient.invalidateQueries({ queryKey: ['exception-stats'] })
      toast.success(t('admin:exceptionInbox.exceptionDismissed'))
    },
    onError: (error) => {
      toast.error(t('admin:exceptionInbox.actionFailed'))
      console.error(error)
    },
  })

  return {
    exceptions,
    stats,
    isLoading,
    error,
    refetch,
    acknowledge: acknowledgeMutation.mutate,
    resolve: resolveMutation.mutate,
    dismiss: dismissMutation.mutate,
    isAcknowledging: acknowledgeMutation.isPending,
    isResolving: resolveMutation.isPending,
    isDismissing: dismissMutation.isPending,
  }
}

export function useException(exceptionId: string | undefined) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['exception', exceptionId],
    queryFn: async () => {
      if (!exceptionId || !profile?.tenant_id) return null

      const { data, error } = await supabase
        .from('exceptions')
        .select(`
          *,
          expectation:expectations(
            *
          ),
          acknowledger:profiles!exceptions_acknowledged_by_fkey(id, full_name, email),
          resolver:profiles!exceptions_resolved_by_fkey(id, full_name, email)
        `)
        .eq('id', exceptionId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (error) throw error
      return data as unknown as ExceptionWithExpectation
    },
    enabled: !!exceptionId && !!profile?.tenant_id,
  })
}
