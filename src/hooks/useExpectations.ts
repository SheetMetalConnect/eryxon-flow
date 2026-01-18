import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import type { Expectation, ExpectationInsert, ExpectationEntityType } from '@/integrations/supabase/types/tables/expectations'

export interface ExpectationWithStatus extends Expectation {
  status: 'active' | 'fulfilled' | 'violated' | 'overdue' | 'superseded'
  exception_id?: string
  exception_status?: string
}

interface UseExpectationsOptions {
  entityType?: ExpectationEntityType
  entityId?: string
  activeOnly?: boolean
  limit?: number
}

export function useExpectations(options: UseExpectationsOptions = {}) {
  const { entityType, entityId, activeOnly = false, limit = 100 } = options
  const { t } = useTranslation(['admin', 'common'])
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  // Fetch expectations with exception status
  const {
    data: expectations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['expectations', profile?.tenant_id, entityType, entityId, activeOnly, limit],
    queryFn: async () => {
      if (!profile?.tenant_id) return []

      // Fetch expectations
      let query = supabase
        .from('expectations')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('expected_at', { ascending: true })
        .limit(limit)

      if (entityType) {
        query = query.eq('entity_type', entityType)
      }

      if (entityId) {
        query = query.eq('entity_id', entityId)
      }

      if (activeOnly) {
        query = query.is('superseded_by', null)
      }

      const { data: expectationsData, error: expectationsError } = await query
      if (expectationsError) throw expectationsError

      // Fetch exceptions for these expectations
      const expectationIds = (expectationsData || []).map(e => e.id)
      const { data: exceptionsData } = await supabase
        .from('exceptions')
        .select('expectation_id, id, status')
        .in('expectation_id', expectationIds.length > 0 ? expectationIds : ['none'])

      const exceptionsMap = new Map((exceptionsData || []).map(e => [e.expectation_id, e]))

      // Determine status for each expectation
      const now = new Date()
      return (expectationsData || []).map(exp => {
        const exception = exceptionsMap.get(exp.id)
        let status: ExpectationWithStatus['status'] = 'active'

        if (exp.superseded_by) {
          status = 'superseded'
        } else if (exception) {
          status = 'violated'
        } else if (exp.expected_at) {
          const expectedAt = new Date(exp.expected_at)
          if (expectedAt < now) {
            status = 'overdue' // Past due but no exception yet (could still be completed on time)
          }
        }

        return {
          ...exp,
          status,
          exception_id: exception?.id,
          exception_status: exception?.status,
        } as ExpectationWithStatus
      })
    },
    enabled: !!profile?.tenant_id,
  })

  // Create expectation
  const createMutation = useMutation({
    mutationFn: async (expectation: Omit<ExpectationInsert, 'tenant_id'>) => {
      if (!profile?.tenant_id) throw new Error('No tenant')

      const { data, error } = await supabase
        .from('expectations')
        .insert({
          ...expectation,
          tenant_id: profile.tenant_id,
          created_by: profile.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as Expectation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expectations'] })
      toast.success(t('admin:expectations.created'))
    },
    onError: (error) => {
      toast.error(t('admin:expectations.createFailed'))
      console.error(error)
    },
  })

  // Supersede expectation (for replanning)
  const supersedeMutation = useMutation({
    mutationFn: async ({
      expectationId,
      newExpectedValue,
      newExpectedAt,
      source = 'manual',
      context = {},
    }: {
      expectationId: string
      newExpectedValue: Record<string, unknown>
      newExpectedAt: string
      source?: string
      context?: Record<string, unknown>
    }) => {
      const { data, error } = await supabase.rpc('supersede_expectation', {
        p_expectation_id: expectationId,
        p_new_expected_value: newExpectedValue as any,
        p_new_expected_at: newExpectedAt,
        p_source: source,
        p_created_by: profile?.id || null,
        p_context: (context as any) || {},
      })

      if (error) throw error
      return data as string // Returns new expectation ID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expectations'] })
      toast.success(t('admin:expectations.updated'))
    },
    onError: (error) => {
      toast.error(t('admin:expectations.updateFailed'))
      console.error(error)
    },
  })

  // Create job completion expectation helper
  const createJobExpectationMutation = useMutation({
    mutationFn: async ({
      jobId,
      dueDate,
      source = 'manual',
    }: {
      jobId: string
      dueDate: string
      source?: string
    }) => {
      if (!profile?.tenant_id) throw new Error('No tenant')

      const { data, error } = await supabase.rpc('create_job_completion_expectation', {
        p_job_id: jobId,
        p_tenant_id: profile.tenant_id,
        p_due_date: dueDate,
        p_source: source,
        p_created_by: profile.id,
      })

      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expectations'] })
    },
    onError: (error) => {
      console.error('Failed to create job expectation:', error)
    },
  })

  return {
    expectations,
    isLoading,
    error,
    refetch,
    create: createMutation.mutate,
    supersede: supersedeMutation.mutate,
    createJobExpectation: createJobExpectationMutation.mutate,
    isCreating: createMutation.isPending,
    isSuperseding: supersedeMutation.isPending,
  }
}

export function useExpectation(expectationId: string | undefined) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['expectation', expectationId],
    queryFn: async () => {
      if (!expectationId || !profile?.tenant_id) return null

      const { data, error } = await supabase
        .from('expectations')
        .select(`
          *,
          creator:profiles!expectations_created_by_fkey(id, full_name, email)
        `)
        .eq('id', expectationId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (error) throw error
      return data as Expectation & { creator?: { id: string; full_name: string | null; email: string | null } }
    },
    enabled: !!expectationId && !!profile?.tenant_id,
  })
}

// Hook to get expectation history for an entity
export function useExpectationHistory(entityType: ExpectationEntityType, entityId: string | undefined) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['expectation-history', entityType, entityId],
    queryFn: async () => {
      if (!entityId || !profile?.tenant_id) return []

      const { data, error } = await supabase
        .from('expectations')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('version', { ascending: true })

      if (error) throw error
      return (data || []) as Expectation[]
    },
    enabled: !!entityId && !!profile?.tenant_id,
  })
}
