/**
 * Time tracking domain tables: time_entries, time_entry_pauses, operation_quantities, operation_day_allocations
 * Time and production tracking
 */

import type { Json } from '../base'

export type TimeEntriesTable = {
  Row: {
    created_at: string | null
    duration: number | null
    end_time: string | null
    id: string
    is_paused: boolean | null
    notes: string | null
    operation_id: string
    operator_id: string
    start_time: string
    tenant_id: string
    time_type: string
  }
  Insert: {
    created_at?: string | null
    duration?: number | null
    end_time?: string | null
    id?: string
    is_paused?: boolean | null
    notes?: string | null
    operation_id: string
    operator_id: string
    start_time?: string
    tenant_id: string
    time_type?: string
  }
  Update: {
    created_at?: string | null
    duration?: number | null
    end_time?: string | null
    id?: string
    is_paused?: boolean | null
    notes?: string | null
    operation_id?: string
    operator_id?: string
    start_time?: string
    tenant_id?: string
    time_type?: string
  }
  Relationships: [
    {
      foreignKeyName: "time_entries_operator_id_fkey"
      columns: ["operator_id"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "time_entries_task_id_fkey"
      columns: ["operation_id"]
      isOneToOne: false
      referencedRelation: "operations"
      referencedColumns: ["id"]
    },
  ]
}

export type TimeEntryPausesTable = {
  Row: {
    created_at: string | null
    duration: number | null
    id: string
    paused_at: string
    resumed_at: string | null
    time_entry_id: string
  }
  Insert: {
    created_at?: string | null
    duration?: number | null
    id?: string
    paused_at?: string
    resumed_at?: string | null
    time_entry_id: string
  }
  Update: {
    created_at?: string | null
    duration?: number | null
    id?: string
    paused_at?: string
    resumed_at?: string | null
    time_entry_id?: string
  }
  Relationships: [
    {
      foreignKeyName: "time_entry_pauses_time_entry_id_fkey"
      columns: ["time_entry_id"]
      isOneToOne: false
      referencedRelation: "time_entries"
      referencedColumns: ["id"]
    },
  ]
}

export type OperationQuantitiesTable = {
  Row: {
    created_at: string
    id: string
    material_cert_number: string | null
    material_lot: string | null
    material_supplier: string | null
    metadata: Json | null
    notes: string | null
    operation_id: string
    quantity_good: number
    quantity_produced: number
    quantity_rework: number
    quantity_scrap: number
    recorded_at: string
    recorded_by: string | null
    scrap_reason_id: string | null
    tenant_id: string
    updated_at: string
  }
  Insert: {
    created_at?: string
    id?: string
    material_cert_number?: string | null
    material_lot?: string | null
    material_supplier?: string | null
    metadata?: Json | null
    notes?: string | null
    operation_id: string
    quantity_good?: number
    quantity_produced?: number
    quantity_rework?: number
    quantity_scrap?: number
    recorded_at?: string
    recorded_by?: string | null
    scrap_reason_id?: string | null
    tenant_id: string
    updated_at?: string
  }
  Update: {
    created_at?: string
    id?: string
    material_cert_number?: string | null
    material_lot?: string | null
    material_supplier?: string | null
    metadata?: Json | null
    notes?: string | null
    operation_id?: string
    quantity_good?: number
    quantity_produced?: number
    quantity_rework?: number
    quantity_scrap?: number
    recorded_at?: string
    recorded_by?: string | null
    scrap_reason_id?: string | null
    tenant_id?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "operation_quantities_operation_id_fkey"
      columns: ["operation_id"]
      isOneToOne: false
      referencedRelation: "operations"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "operation_quantities_recorded_by_fkey"
      columns: ["recorded_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "operation_quantities_scrap_reason_id_fkey"
      columns: ["scrap_reason_id"]
      isOneToOne: false
      referencedRelation: "scrap_reasons"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "operation_quantities_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type OperationDayAllocationsTable = {
  Row: {
    cell_id: string
    created_at: string | null
    date: string
    end_time: string
    hours_allocated: number
    id: string
    operation_id: string
    start_time: string
    tenant_id: string
  }
  Insert: {
    cell_id: string
    created_at?: string | null
    date: string
    end_time: string
    hours_allocated: number
    id?: string
    operation_id: string
    start_time: string
    tenant_id: string
  }
  Update: {
    cell_id?: string
    created_at?: string | null
    date?: string
    end_time?: string
    hours_allocated?: number
    id?: string
    operation_id?: string
    start_time?: string
    tenant_id?: string
  }
  Relationships: [
    {
      foreignKeyName: "operation_day_allocations_cell_id_fkey"
      columns: ["cell_id"]
      isOneToOne: false
      referencedRelation: "cells"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "operation_day_allocations_operation_id_fkey"
      columns: ["operation_id"]
      isOneToOne: false
      referencedRelation: "operations"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "operation_day_allocations_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type TimeTrackingTables = {
  time_entries: TimeEntriesTable
  time_entry_pauses: TimeEntryPausesTable
  operation_quantities: OperationQuantitiesTable
  operation_day_allocations: OperationDayAllocationsTable
}
