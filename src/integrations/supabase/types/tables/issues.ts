/**
 * Issues domain tables: issues, issue_categories, scrap_reasons
 * Quality management and NCR tracking
 */

import type { Json } from '../base'
import type { DatabaseEnums } from '../enums'

export type IssuesTable = {
  Row: {
    affected_quantity: number | null
    corrective_action: string | null
    created_at: string | null
    created_by: string
    description: string
    disposition: DatabaseEnums["ncr_disposition"] | null
    id: string
    image_paths: string[] | null
    issue_type: DatabaseEnums["issue_type"] | null
    ncr_category: DatabaseEnums["ncr_category"] | null
    operation_id: string
    preventive_action: string | null
    reported_by_id: string | null
    resolution_notes: string | null
    reviewed_at: string | null
    reviewed_by: string | null
    root_cause: string | null
    search_vector: unknown
    severity: DatabaseEnums["issue_severity"]
    status: DatabaseEnums["issue_status"] | null
    tenant_id: string
    title: string | null
    updated_at: string | null
    verification_required: boolean | null
  }
  Insert: {
    affected_quantity?: number | null
    corrective_action?: string | null
    created_at?: string | null
    created_by: string
    description: string
    disposition?: DatabaseEnums["ncr_disposition"] | null
    id?: string
    image_paths?: string[] | null
    issue_type?: DatabaseEnums["issue_type"] | null
    ncr_category?: DatabaseEnums["ncr_category"] | null
    operation_id: string
    preventive_action?: string | null
    reported_by_id?: string | null
    resolution_notes?: string | null
    reviewed_at?: string | null
    reviewed_by?: string | null
    root_cause?: string | null
    search_vector?: unknown
    severity: DatabaseEnums["issue_severity"]
    status?: DatabaseEnums["issue_status"] | null
    tenant_id: string
    title?: string | null
    updated_at?: string | null
    verification_required?: boolean | null
  }
  Update: {
    affected_quantity?: number | null
    corrective_action?: string | null
    created_at?: string | null
    created_by?: string
    description?: string
    disposition?: DatabaseEnums["ncr_disposition"] | null
    id?: string
    image_paths?: string[] | null
    issue_type?: DatabaseEnums["issue_type"] | null
    ncr_category?: DatabaseEnums["ncr_category"] | null
    operation_id?: string
    preventive_action?: string | null
    reported_by_id?: string | null
    resolution_notes?: string | null
    reviewed_at?: string | null
    reviewed_by?: string | null
    root_cause?: string | null
    search_vector?: unknown
    severity?: DatabaseEnums["issue_severity"]
    status?: DatabaseEnums["issue_status"] | null
    tenant_id?: string
    title?: string | null
    updated_at?: string | null
    verification_required?: boolean | null
  }
  Relationships: [
    {
      foreignKeyName: "issues_created_by_fkey"
      columns: ["created_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "issues_reported_by_id_fkey"
      columns: ["reported_by_id"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "issues_reviewed_by_fkey"
      columns: ["reviewed_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "issues_task_id_fkey"
      columns: ["operation_id"]
      isOneToOne: false
      referencedRelation: "operations"
      referencedColumns: ["id"]
    },
  ]
}

export type IssueCategoriesTable = {
  Row: {
    active: boolean | null
    code: string
    created_at: string | null
    description: string
    id: string
    severity_default: string | null
    tenant_id: string
    updated_at: string | null
  }
  Insert: {
    active?: boolean | null
    code: string
    created_at?: string | null
    description: string
    id?: string
    severity_default?: string | null
    tenant_id: string
    updated_at?: string | null
  }
  Update: {
    active?: boolean | null
    code?: string
    created_at?: string | null
    description?: string
    id?: string
    severity_default?: string | null
    tenant_id?: string
    updated_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "issue_categories_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type ScrapReasonsTable = {
  Row: {
    active: boolean
    category: string
    code: string
    created_at: string
    description: string
    id: string
    metadata: Json | null
    tenant_id: string
    updated_at: string
  }
  Insert: {
    active?: boolean
    category: string
    code: string
    created_at?: string
    description: string
    id?: string
    metadata?: Json | null
    tenant_id: string
    updated_at?: string
  }
  Update: {
    active?: boolean
    category?: string
    code?: string
    created_at?: string
    description?: string
    id?: string
    metadata?: Json | null
    tenant_id?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "scrap_reasons_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type IssuesTables = {
  issues: IssuesTable
  issue_categories: IssueCategoriesTable
  scrap_reasons: ScrapReasonsTable
}
