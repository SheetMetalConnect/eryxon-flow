import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { QueryKeys } from '@/lib/queryClient'
import { logger } from '@/lib/logger'
import {
  summarizeOccupancy,
  type ActivePlacement,
  type LocationOccupancy,
  type StorageLocation,
} from '@/lib/locations/placement'

/**
 * Fetches active storage_locations for the tenant (optionally scoped to a cell)
 * plus the active part_placements (removed_at IS NULL), and derives per-slot
 * occupancy via the pure summarizeOccupancy() core.
 */
export function useStorageLocations(cellId?: string | null) {
  const profile = useProfile()
  const tenantId = profile?.tenant_id ?? ''

  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: QueryKeys.locations.all(tenantId, cellId),
    queryFn: async () => {
      if (!tenantId) {
        return { locations: [] as StorageLocation[], placements: [] as ActivePlacement[] }
      }

      let locationsQuery = supabase
        .from('storage_locations')
        .select('id, code, label, cell_id, capacity, sort_order, active, row_index, col_index')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('code', { ascending: true })

      if (cellId) {
        locationsQuery = locationsQuery.eq('cell_id', cellId)
      }

      const { data: locationRows, error: locationsError } = await locationsQuery
      if (locationsError) throw locationsError

      const { data: placementRows, error: placementsError } = await supabase
        .from('part_placements')
        .select('location_id')
        .eq('tenant_id', tenantId)
        .is('removed_at', null)
      if (placementsError) throw placementsError

      const locations: StorageLocation[] = (locationRows ?? []).map((row) => ({
        id: row.id,
        code: row.code,
        label: row.label,
        cell_id: row.cell_id,
        capacity: row.capacity,
        sort_order: row.sort_order,
        active: row.active,
      }))

      const placements: ActivePlacement[] = (placementRows ?? []).map((row) => ({
        location_id: row.location_id,
      }))

      return { locations, placements }
    },
    enabled: !!tenantId,
  })

  const locations = data?.locations ?? []
  const placements = data?.placements ?? []

  // Occupancy is derived from ALL active placements across the tenant, but
  // restricted to the (possibly cell-scoped) location set we fetched.
  let occupancy: LocationOccupancy[] = []
  try {
    occupancy = summarizeOccupancy(locations, placements)
  } catch (error) {
    logger.error('useStorageLocations', 'Failed to summarize occupancy', error)
  }

  return { locations, occupancy, isLoading, refetch }
}
