/**
 * Expectations & Exceptions domain tables
 * Three Registries Pattern: Beliefs and Judgments
 */

import type { Json } from '../base'

// Enums matching database
export type ExpectationType = 'completion_time' | 'duration' | 'quantity' | 'delivery'
export type ExceptionType = 'late' | 'early' | 'non_occurrence' | 'exceeded' | 'under'
export type ExceptionStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed'
export type ExpectationSource = 'erp_sync' | 'manual' | 'scheduler' | 'auto_replan' | 'system'
export type ExpectationEntityType = 'job' | 'operation' | 'part'

export type ExpectationsTable = {
  Row: {
    id: string
    tenant_id: string
    entity_type: ExpectationEntityType
    entity_id: string
    expectation_type: ExpectationType
    belief_statement: string
    expected_value: Json
    expected_at: string | null
    version: number
    superseded_by: string | null
    superseded_at: string | null
    created_at: string
    created_by: string | null
    source: ExpectationSource
    context: Json
    search_vector: unknown
  }
  Insert: {
    id?: string
    tenant_id: string
    entity_type: ExpectationEntityType
    entity_id: string
    expectation_type: ExpectationType
    belief_statement: string
    expected_value: Json
    expected_at?: string | null
    version?: number
    superseded_by?: string | null
    superseded_at?: string | null
    created_at?: string
    created_by?: string | null
    source: ExpectationSource
    context?: Json
    search_vector?: unknown
  }
  Update: {
    id?: string
    tenant_id?: string
    entity_type?: ExpectationEntityType
    entity_id?: string
    expectation_type?: ExpectationType
    belief_statement?: string
    expected_value?: Json
    expected_at?: string | null
    version?: number
    superseded_by?: string | null
    superseded_at?: string | null
    created_at?: string
    created_by?: string | null
    source?: ExpectationSource
    context?: Json
    search_vector?: unknown
  }
  Relationships: [
    {
      foreignKeyName: "expectations_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "expectations_created_by_fkey"
      columns: ["created_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "expectations_superseded_by_fkey"
      columns: ["superseded_by"]
      isOneToOne: false
      referencedRelation: "expectations"
      referencedColumns: ["id"]
    },
  ]
}

export type ExceptionsTable = {
  Row: {
    id: string
    tenant_id: string
    expectation_id: string
    exception_type: ExceptionType
    status: ExceptionStatus
    actual_value: Json | null
    occurred_at: string | null
    deviation_amount: number | null
    deviation_unit: string | null
    detected_at: string
    detected_by_event: string | null
    acknowledged_at: string | null
    acknowledged_by: string | null
    resolved_at: string | null
    resolved_by: string | null
    resolution: Json | null
    root_cause: string | null
    corrective_action: string | null
    preventive_action: string | null
    metadata: Json
    search_vector: unknown
  }
  Insert: {
    id?: string
    tenant_id: string
    expectation_id: string
    exception_type: ExceptionType
    status?: ExceptionStatus
    actual_value?: Json | null
    occurred_at?: string | null
    deviation_amount?: number | null
    deviation_unit?: string | null
    detected_at?: string
    detected_by_event?: string | null
    acknowledged_at?: string | null
    acknowledged_by?: string | null
    resolved_at?: string | null
    resolved_by?: string | null
    resolution?: Json | null
    root_cause?: string | null
    corrective_action?: string | null
    preventive_action?: string | null
    metadata?: Json
    search_vector?: unknown
  }
  Update: {
    id?: string
    tenant_id?: string
    expectation_id?: string
    exception_type?: ExceptionType
    status?: ExceptionStatus
    actual_value?: Json | null
    occurred_at?: string | null
    deviation_amount?: number | null
    deviation_unit?: string | null
    detected_at?: string
    detected_by_event?: string | null
    acknowledged_at?: string | null
    acknowledged_by?: string | null
    resolved_at?: string | null
    resolved_by?: string | null
    resolution?: Json | null
    root_cause?: string | null
    corrective_action?: string | null
    preventive_action?: string | null
    metadata?: Json
    search_vector?: unknown
  }
  Relationships: [
    {
      foreignKeyName: "exceptions_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "exceptions_expectation_id_fkey"
      columns: ["expectation_id"]
      isOneToOne: false
      referencedRelation: "expectations"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "exceptions_acknowledged_by_fkey"
      columns: ["acknowledged_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "exceptions_resolved_by_fkey"
      columns: ["resolved_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
  ]
}

export type ExpectationsTables = {
  expectations: ExpectationsTable
  exceptions: ExceptionsTable
}

// Convenience types for use in components
export type Expectation = ExpectationsTable['Row']
export type ExpectationInsert = ExpectationsTable['Insert']
export type Exception = ExceptionsTable['Row']
export type ExceptionInsert = ExceptionsTable['Insert']

// Extended types with joined data
export interface ExpectationWithEntity extends Expectation {
  job?: {
    id: string
    job_number: string
    customer: string | null
  }
  operation?: {
    id: string
    operation_name: string
  }
}

export interface ExceptionWithExpectation extends Exception {
  expectation: Expectation
  acknowledger?: {
    id: string
    full_name: string | null
  }
  resolver?: {
    id: string
    full_name: string | null
  }
}
