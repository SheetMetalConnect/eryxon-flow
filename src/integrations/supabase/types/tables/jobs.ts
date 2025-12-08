/**
 * Jobs domain tables: jobs, parts, operations, cells, assignments
 * Core manufacturing/production tables
 */

import type { Json } from '../base'
import type { DatabaseEnums } from '../enums'

export type JobsTable = {
  Row: {
    created_at: string | null
    current_cell_id: string | null
    customer: string | null
    deleted_at: string | null
    deleted_by: string | null
    delivery_address: string | null
    delivery_city: string | null
    delivery_country: string | null
    delivery_lat: number | null
    delivery_lng: number | null
    delivery_postal_code: string | null
    due_date: string | null
    due_date_override: string | null
    external_id: string | null
    external_source: string | null
    id: string
    job_number: string
    metadata: Json | null
    notes: string | null
    package_count: number | null
    search_vector: unknown
    status: DatabaseEnums["job_status"] | null
    sync_hash: string | null
    synced_at: string | null
    tenant_id: string
    total_volume_m3: number | null
    total_weight_kg: number | null
    updated_at: string | null
  }
  Insert: {
    created_at?: string | null
    current_cell_id?: string | null
    customer?: string | null
    deleted_at?: string | null
    deleted_by?: string | null
    delivery_address?: string | null
    delivery_city?: string | null
    delivery_country?: string | null
    delivery_lat?: number | null
    delivery_lng?: number | null
    delivery_postal_code?: string | null
    due_date?: string | null
    due_date_override?: string | null
    external_id?: string | null
    external_source?: string | null
    id?: string
    job_number: string
    metadata?: Json | null
    notes?: string | null
    package_count?: number | null
    search_vector?: unknown
    status?: DatabaseEnums["job_status"] | null
    sync_hash?: string | null
    synced_at?: string | null
    tenant_id: string
    total_volume_m3?: number | null
    total_weight_kg?: number | null
    updated_at?: string | null
  }
  Update: {
    created_at?: string | null
    current_cell_id?: string | null
    customer?: string | null
    deleted_at?: string | null
    deleted_by?: string | null
    delivery_address?: string | null
    delivery_city?: string | null
    delivery_country?: string | null
    delivery_lat?: number | null
    delivery_lng?: number | null
    delivery_postal_code?: string | null
    due_date?: string | null
    due_date_override?: string | null
    external_id?: string | null
    external_source?: string | null
    id?: string
    job_number?: string
    metadata?: Json | null
    notes?: string | null
    package_count?: number | null
    search_vector?: unknown
    status?: DatabaseEnums["job_status"] | null
    sync_hash?: string | null
    synced_at?: string | null
    tenant_id?: string
    total_volume_m3?: number | null
    total_weight_kg?: number | null
    updated_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "jobs_current_stage_id_fkey"
      columns: ["current_cell_id"]
      isOneToOne: false
      referencedRelation: "cells"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "jobs_deleted_by_fkey"
      columns: ["deleted_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
  ]
}

export type PartsTable = {
  Row: {
    cnc_program_name: string | null
    created_at: string | null
    current_cell_id: string | null
    deleted_at: string | null
    deleted_by: string | null
    drawing_no: string | null
    external_id: string | null
    external_source: string | null
    file_paths: string[] | null
    height_mm: number | null
    id: string
    image_paths: string[] | null
    is_bullet_card: boolean | null
    job_id: string
    length_mm: number | null
    material: string
    material_cert_number: string | null
    material_lot: string | null
    material_supplier: string | null
    metadata: Json | null
    notes: string | null
    parent_part_id: string | null
    part_number: string
    quantity: number | null
    search_vector: unknown
    status: DatabaseEnums["job_status"] | null
    sync_hash: string | null
    synced_at: string | null
    tenant_id: string
    updated_at: string | null
    weight_kg: number | null
    width_mm: number | null
  }
  Insert: {
    cnc_program_name?: string | null
    created_at?: string | null
    current_cell_id?: string | null
    deleted_at?: string | null
    deleted_by?: string | null
    drawing_no?: string | null
    external_id?: string | null
    external_source?: string | null
    file_paths?: string[] | null
    height_mm?: number | null
    id?: string
    image_paths?: string[] | null
    is_bullet_card?: boolean | null
    job_id: string
    length_mm?: number | null
    material: string
    material_cert_number?: string | null
    material_lot?: string | null
    material_supplier?: string | null
    metadata?: Json | null
    notes?: string | null
    parent_part_id?: string | null
    part_number: string
    quantity?: number | null
    search_vector?: unknown
    status?: DatabaseEnums["job_status"] | null
    sync_hash?: string | null
    synced_at?: string | null
    tenant_id: string
    updated_at?: string | null
    weight_kg?: number | null
    width_mm?: number | null
  }
  Update: {
    cnc_program_name?: string | null
    created_at?: string | null
    current_cell_id?: string | null
    deleted_at?: string | null
    deleted_by?: string | null
    drawing_no?: string | null
    external_id?: string | null
    external_source?: string | null
    file_paths?: string[] | null
    height_mm?: number | null
    id?: string
    image_paths?: string[] | null
    is_bullet_card?: boolean | null
    job_id?: string
    length_mm?: number | null
    material?: string
    material_cert_number?: string | null
    material_lot?: string | null
    material_supplier?: string | null
    metadata?: Json | null
    notes?: string | null
    parent_part_id?: string | null
    part_number?: string
    quantity?: number | null
    search_vector?: unknown
    status?: DatabaseEnums["job_status"] | null
    sync_hash?: string | null
    synced_at?: string | null
    tenant_id?: string
    updated_at?: string | null
    weight_kg?: number | null
    width_mm?: number | null
  }
  Relationships: [
    {
      foreignKeyName: "parts_current_stage_id_fkey"
      columns: ["current_cell_id"]
      isOneToOne: false
      referencedRelation: "cells"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "parts_deleted_by_fkey"
      columns: ["deleted_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "parts_job_id_fkey"
      columns: ["job_id"]
      isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "parts_parent_part_id_fkey"
      columns: ["parent_part_id"]
      isOneToOne: false
      referencedRelation: "parts"
      referencedColumns: ["id"]
    },
  ]
}

export type OperationsTable = {
  Row: {
    actual_time: number | null
    assigned_operator_id: string | null
    cell_id: string
    changeover_time: number | null
    completed_at: string | null
    completion_percentage: number | null
    created_at: string | null
    deleted_at: string | null
    deleted_by: string | null
    estimated_time: number
    external_id: string | null
    external_source: string | null
    icon_name: string | null
    id: string
    metadata: Json | null
    notes: string | null
    operation_name: string
    part_id: string
    planned_end: string | null
    planned_start: string | null
    run_time_per_unit: number | null
    search_vector: unknown
    sequence: number
    setup_time: number | null
    status: DatabaseEnums["task_status"] | null
    synced_at: string | null
    tenant_id: string
    updated_at: string | null
    wait_time: number | null
  }
  Insert: {
    actual_time?: number | null
    assigned_operator_id?: string | null
    cell_id: string
    changeover_time?: number | null
    completed_at?: string | null
    completion_percentage?: number | null
    created_at?: string | null
    deleted_at?: string | null
    deleted_by?: string | null
    estimated_time: number
    external_id?: string | null
    external_source?: string | null
    icon_name?: string | null
    id?: string
    metadata?: Json | null
    notes?: string | null
    operation_name: string
    part_id: string
    planned_end?: string | null
    planned_start?: string | null
    run_time_per_unit?: number | null
    search_vector?: unknown
    sequence: number
    setup_time?: number | null
    status?: DatabaseEnums["task_status"] | null
    synced_at?: string | null
    tenant_id: string
    updated_at?: string | null
    wait_time?: number | null
  }
  Update: {
    actual_time?: number | null
    assigned_operator_id?: string | null
    cell_id?: string
    changeover_time?: number | null
    completed_at?: string | null
    completion_percentage?: number | null
    created_at?: string | null
    deleted_at?: string | null
    deleted_by?: string | null
    estimated_time?: number
    external_id?: string | null
    external_source?: string | null
    icon_name?: string | null
    id?: string
    metadata?: Json | null
    notes?: string | null
    operation_name?: string
    part_id?: string
    planned_end?: string | null
    planned_start?: string | null
    run_time_per_unit?: number | null
    search_vector?: unknown
    sequence?: number
    setup_time?: number | null
    status?: DatabaseEnums["task_status"] | null
    synced_at?: string | null
    tenant_id?: string
    updated_at?: string | null
    wait_time?: number | null
  }
  Relationships: [
    {
      foreignKeyName: "operations_deleted_by_fkey"
      columns: ["deleted_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "tasks_assigned_operator_id_fkey"
      columns: ["assigned_operator_id"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "tasks_part_id_fkey"
      columns: ["part_id"]
      isOneToOne: false
      referencedRelation: "parts"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "tasks_stage_id_fkey"
      columns: ["cell_id"]
      isOneToOne: false
      referencedRelation: "cells"
      referencedColumns: ["id"]
    },
  ]
}

export type CellsTable = {
  Row: {
    active: boolean | null
    capacity_hours_per_day: number | null
    color: string | null
    created_at: string | null
    deleted_at: string | null
    deleted_by: string | null
    description: string | null
    enforce_wip_limit: boolean | null
    external_id: string | null
    external_source: string | null
    icon_name: string | null
    id: string
    image_url: string | null
    name: string
    sequence: number
    show_capacity_warning: boolean | null
    synced_at: string | null
    tenant_id: string
    updated_at: string | null
    wip_limit: number | null
    wip_warning_threshold: number | null
  }
  Insert: {
    active?: boolean | null
    capacity_hours_per_day?: number | null
    color?: string | null
    created_at?: string | null
    deleted_at?: string | null
    deleted_by?: string | null
    description?: string | null
    enforce_wip_limit?: boolean | null
    external_id?: string | null
    external_source?: string | null
    icon_name?: string | null
    id?: string
    image_url?: string | null
    name: string
    sequence: number
    show_capacity_warning?: boolean | null
    synced_at?: string | null
    tenant_id: string
    updated_at?: string | null
    wip_limit?: number | null
    wip_warning_threshold?: number | null
  }
  Update: {
    active?: boolean | null
    capacity_hours_per_day?: number | null
    color?: string | null
    created_at?: string | null
    deleted_at?: string | null
    deleted_by?: string | null
    description?: string | null
    enforce_wip_limit?: boolean | null
    external_id?: string | null
    external_source?: string | null
    icon_name?: string | null
    id?: string
    image_url?: string | null
    name?: string
    sequence?: number
    show_capacity_warning?: boolean | null
    synced_at?: string | null
    tenant_id?: string
    updated_at?: string | null
    wip_limit?: number | null
    wip_warning_threshold?: number | null
  }
  Relationships: [
    {
      foreignKeyName: "cells_deleted_by_fkey"
      columns: ["deleted_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
  ]
}

export type AssignmentsTable = {
  Row: {
    assigned_by: string
    created_at: string | null
    id: string
    job_id: string | null
    operator_id: string | null
    shop_floor_operator_id: string | null
    part_id: string | null
    status: DatabaseEnums["assignment_status"] | null
    tenant_id: string
    updated_at: string | null
  }
  Insert: {
    assigned_by: string
    created_at?: string | null
    id?: string
    job_id?: string | null
    operator_id?: string | null
    shop_floor_operator_id?: string | null
    part_id?: string | null
    status?: DatabaseEnums["assignment_status"] | null
    tenant_id: string
    updated_at?: string | null
  }
  Update: {
    assigned_by?: string
    created_at?: string | null
    id?: string
    job_id?: string | null
    operator_id?: string | null
    shop_floor_operator_id?: string | null
    part_id?: string | null
    status?: DatabaseEnums["assignment_status"] | null
    tenant_id?: string
    updated_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "assignments_assigned_by_fkey"
      columns: ["assigned_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "assignments_job_id_fkey"
      columns: ["job_id"]
      isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "assignments_operator_id_fkey"
      columns: ["operator_id"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "assignments_shop_floor_operator_id_fkey"
      columns: ["shop_floor_operator_id"]
      isOneToOne: false
      referencedRelation: "operators"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "assignments_part_id_fkey"
      columns: ["part_id"]
      isOneToOne: false
      referencedRelation: "parts"
      referencedColumns: ["id"]
    },
  ]
}

export type JobsTables = {
  jobs: JobsTable
  parts: PartsTable
  operations: OperationsTable
  cells: CellsTable
  assignments: AssignmentsTable
}
