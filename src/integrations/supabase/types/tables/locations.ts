/**
 * Location/placement module tables: storage_locations, part_placements.
 * Configurable drop-off grid + where each part was physically placed.
 */

import type { Json } from '../base'

export type StorageLocationsTable = {
  Row: {
    id: string
    tenant_id: string
    cell_id: string | null
    code: string
    label: string | null
    row_index: number | null
    col_index: number | null
    capacity: number
    sort_order: number
    active: boolean
    metadata: Json
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    tenant_id: string
    cell_id?: string | null
    code: string
    label?: string | null
    row_index?: number | null
    col_index?: number | null
    capacity?: number
    sort_order?: number
    active?: boolean
    metadata?: Json
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    tenant_id?: string
    cell_id?: string | null
    code?: string
    label?: string | null
    row_index?: number | null
    col_index?: number | null
    capacity?: number
    sort_order?: number
    active?: boolean
    metadata?: Json
    created_at?: string
    updated_at?: string
  }
  Relationships: []
}

export type PartPlacementsTable = {
  Row: {
    id: string
    tenant_id: string
    part_id: string
    location_id: string
    operation_id: string | null
    placed_by: string | null
    placed_by_operator_id: string | null
    placed_at: string
    removed_at: string | null
    metadata: Json
  }
  Insert: {
    id?: string
    tenant_id: string
    part_id: string
    location_id: string
    operation_id?: string | null
    placed_by?: string | null
    placed_by_operator_id?: string | null
    placed_at?: string
    removed_at?: string | null
    metadata?: Json
  }
  Update: {
    id?: string
    tenant_id?: string
    part_id?: string
    location_id?: string
    operation_id?: string | null
    placed_by?: string | null
    placed_by_operator_id?: string | null
    placed_at?: string
    removed_at?: string | null
    metadata?: Json
  }
  Relationships: []
}
