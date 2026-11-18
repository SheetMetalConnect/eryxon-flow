import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/integrations/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

export interface RecordPlacementArgs {
  partId: string
  locationId: string
  operationId?: string | null
  operatorId?: string | null
}

/**
 * Records where an operator physically placed a part.
 *
 * Honours the one-active-placement-per-part invariant: any existing active
 * placement for the part is first marked removed (removed_at = now()), then a
 * fresh part_placements row is inserted. placed_by is the signed-in profile;
 * placed_by_operator_id is the terminal operator when present.
 */
export function useRecordPlacement() {
  const { t } = useTranslation()
  const profile = useProfile()
  const queryClient = useQueryClient()
  const tenantId = profile?.tenant_id ?? ''

  const mutation = useMutation({
    mutationFn: async ({ partId, locationId, operationId, operatorId }: RecordPlacementArgs) => {
      if (!tenantId) throw new Error('No tenant')

      const now = new Date().toISOString()

      // Clear any existing active placement for this part so the unique index
      // (one active placement per part) is never violated.
      const { error: removeError } = await supabase
        .from('part_placements')
        .update({ removed_at: now })
        .eq('tenant_id', tenantId)
        .eq('part_id', partId)
        .is('removed_at', null)
      if (removeError) throw removeError

      const { data, error: insertError } = await supabase
        .from('part_placements')
        .insert({
          tenant_id: tenantId,
          part_id: partId,
          location_id: locationId,
          operation_id: operationId ?? null,
          placed_by: profile?.id ?? null,
          placed_by_operator_id: operatorId ?? null,
        })
        .select()
        .single()
      if (insertError) throw insertError
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', 'all'] })
      toast.success(t('locations.placement.recorded'))
    },
    onError: (error) => {
      toast.error(t('locations.placement.failed'))
      logger.error('useRecordPlacement', 'Failed to record placement', error)
    },
  })

  return {
    recordPlacement: mutation.mutate,
    recordPlacementAsync: mutation.mutateAsync,
    isRecording: mutation.isPending,
  }
}
