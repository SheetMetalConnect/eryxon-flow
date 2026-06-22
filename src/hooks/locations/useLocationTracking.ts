import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/integrations/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { QueryKeys } from '@/lib/queryClient'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

/**
 * Reads and toggles tenants.location_tracking_enabled for the current tenant.
 * The location/placement module is a toggleable core module, off by default.
 */
export function useLocationTracking() {
  const { t } = useTranslation()
  const profile = useProfile()
  const queryClient = useQueryClient()
  const tenantId = profile?.tenant_id ?? ''

  const { data: enabled = false, isLoading } = useQuery({
    queryKey: QueryKeys.locations.tracking(tenantId),
    queryFn: async () => {
      if (!tenantId) return false
      const { data, error } = await supabase
        .from('tenants')
        .select('location_tracking_enabled')
        .eq('id', tenantId)
        .single()
      if (error) throw error
      return data?.location_tracking_enabled ?? false
    },
    enabled: !!tenantId,
  })

  const setEnabledMutation = useMutation({
    mutationFn: async (nextEnabled: boolean) => {
      if (!tenantId) throw new Error('No tenant')
      const { error } = await supabase
        .from('tenants')
        .update({ location_tracking_enabled: nextEnabled })
        .eq('id', tenantId)
      if (error) throw error
      return nextEnabled
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.locations.tracking(tenantId) })
      toast.success(t('locations.tracking.updated'))
    },
    onError: (error) => {
      toast.error(t('locations.tracking.updateFailed'))
      logger.error('useLocationTracking', 'Failed to update tracking flag', error)
    },
  })

  return {
    enabled,
    isLoading,
    setEnabled: setEnabledMutation.mutate,
    isUpdating: setEnabledMutation.isPending,
  }
}
