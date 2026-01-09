/**
 * Batches domain tables: operation_batches, batch_operations
 * Manufacturing batch/nesting operations for sheet metal processing
 */

import type { Json } from '../base'
import type { DatabaseEnums } from '../enums'

export type OperationBatchesTable = {
  Row: {
    id: string
    tenant_id: string
    batch_number: string
    batch_type: DatabaseEnums["batch_type"]
    status: DatabaseEnums["batch_status"]
    cell_id: string
    material: string | null
    thickness_mm: number | null
    notes: string | null
    nesting_metadata: Json | null
    operations_count: number
    estimated_time: number | null
    actual_time: number | null
    created_by: string | null
    started_by: string | null
    completed_by: string | null
    created_at: string
    started_at: string | null
    completed_at: string | null
    updated_at: string | null
    external_id: string | null
    external_source: string | null
  }
  Insert: {
    id?: string
    tenant_id: string
    batch_number: string
    batch_type: DatabaseEnums["batch_type"]
    status?: DatabaseEnums["batch_status"]
    cell_id: string
    material?: string | null
    thickness_mm?: number | null
    notes?: string | null
    nesting_metadata?: Json | null
    operations_count?: number
    estimated_time?: number | null
    actual_time?: number | null
    created_by?: string | null
    started_by?: string | null
    completed_by?: string | null
    created_at?: string
    started_at?: string | null
    completed_at?: string | null
    updated_at?: string | null
    external_id?: string | null
    external_source?: string | null
  }
  Update: {
    id?: string
    tenant_id?: string
    batch_number?: string
    batch_type?: DatabaseEnums["batch_type"]
    status?: DatabaseEnums["batch_status"]
    cell_id?: string
    material?: string | null
    thickness_mm?: number | null
    notes?: string | null
    nesting_metadata?: Json | null
    operations_count?: number
    estimated_time?: number | null
    actual_time?: number | null
    created_by?: string | null
    started_by?: string | null
    completed_by?: string | null
    created_at?: string
    started_at?: string | null
    completed_at?: string | null
    updated_at?: string | null
    external_id?: string | null
    external_source?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "operation_batches_cell_id_fkey"
      columns: ["cell_id"]
      isOneToOne: false
      referencedRelation: "cells"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "operation_batches_created_by_fkey"
      columns: ["created_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "operation_batches_started_by_fkey"
      columns: ["started_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "operation_batches_completed_by_fkey"
      columns: ["completed_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "operation_batches_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type BatchOperationsTable = {
  Row: {
    id: string
    batch_id: string
    operation_id: string
    tenant_id: string
    sequence_in_batch: number | null
    quantity_in_batch: number | null
    created_at: string
    updated_at: string | null
  }
  Insert: {
    id?: string
    batch_id: string
    operation_id: string
    tenant_id: string
    sequence_in_batch?: number | null
    quantity_in_batch?: number | null
    created_at?: string
    updated_at?: string | null
  }
  Update: {
    id?: string
    batch_id?: string
    operation_id?: string
    tenant_id?: string
    sequence_in_batch?: number | null
    quantity_in_batch?: number | null
    created_at?: string
    updated_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "batch_operations_batch_id_fkey"
      columns: ["batch_id"]
      isOneToOne: false
      referencedRelation: "operation_batches"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "batch_operations_operation_id_fkey"
      columns: ["operation_id"]
      isOneToOne: false
      referencedRelation: "operations"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "batch_operations_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type BatchesTables = {
  operation_batches: OperationBatchesTable
  batch_operations: BatchOperationsTable
}
