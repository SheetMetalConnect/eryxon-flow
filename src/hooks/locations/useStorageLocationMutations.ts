import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/integrations/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { QueryKeys } from '@/lib/queryClient'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

export interface StorageLocationInput {
  code: string
  label?: string | null
  cell_id?: string | null
  capacity: number
  row_index?: number | null
  col_index?: number | null
  sort_order?: number
  active?: boolean
}

/** Admin create/update/delete for a single storage_location (drop-off slot). */
export function useStorageLocationMutations() {
  const { t } = useTranslation()
  const profile = useProfile()
  const queryClient = useQueryClient()
  const tenantId = profile?.tenant_id ?? ''

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['locations', 'all'] })
  }

  const createMutation = useMutation({
    mutationFn: async (input: StorageLocationInput) => {
      if (!tenantId) throw new Error('No tenant')
      const { data, error } = await supabase
        .from('storage_locations')
        .insert({
          tenant_id: tenantId,
          code: input.code,
          label: input.label ?? null,
          cell_id: input.cell_id ?? null,
          capacity: input.capacity,
          row_index: input.row_index ?? null,
          col_index: input.col_index ?? null,
          sort_order: input.sort_order ?? 0,
          active: input.active ?? true,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidate()
      toast.success(t('locations.config.created'))
    },
    onError: (error) => {
      toast.error(t('locations.config.saveFailed'))
      logger.error('useStorageLocationMutations', 'Create failed', error)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: StorageLocationInput }) => {
      if (!tenantId) throw new Error('No tenant')
      const { data, error } = await supabase
        .from('storage_locations')
        .update({
          code: input.code,
          label: input.label ?? null,
          cell_id: input.cell_id ?? null,
          capacity: input.capacity,
          row_index: input.row_index ?? null,
          col_index: input.col_index ?? null,
          sort_order: input.sort_order ?? 0,
          active: input.active ?? true,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidate()
      toast.success(t('locations.config.updated'))
    },
    onError: (error) => {
      toast.error(t('locations.config.saveFailed'))
      logger.error('useStorageLocationMutations', 'Update failed', error)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant')
      const { error } = await supabase
        .from('storage_locations')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      toast.success(t('locations.config.deleted'))
    },
    onError: (error) => {
      toast.error(t('locations.config.deleteFailed'))
      logger.error('useStorageLocationMutations', 'Delete failed', error)
    },
  })

  return {
    create: createMutation.mutate,
    update: updateMutation.mutate,
    remove: deleteMutation.mutate,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
