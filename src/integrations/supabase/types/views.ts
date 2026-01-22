/**
 * Database views
 * Read-only views that combine data from multiple tables
 */

import type { DatabaseEnums } from './enums'

export type IssuesWithContextView = {
  Row: {
    created_at: string | null
    created_by: string | null
    creator_name: string | null
    customer: string | null
    description: string | null
    id: string | null
    image_paths: string[] | null
    job_id: string | null
    job_number: string | null
    operation_id: string | null
    operation_name: string | null
    part_id: string | null
    part_number: string | null
    resolution_notes: string | null
    reviewed_at: string | null
    reviewed_by: string | null
    reviewer_name: string | null
    search_vector: unknown
    severity: DatabaseEnums["issue_severity"] | null
    status: DatabaseEnums["issue_status"] | null
    tenant_id: string | null
    updated_at: string | null
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
    {
      foreignKeyName: "parts_job_id_fkey"
      columns: ["job_id"]
      isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "tasks_part_id_fkey"
      columns: ["part_id"]
      isOneToOne: false
      referencedRelation: "parts"
      referencedColumns: ["id"]
    },
  ]
}

export type DatabaseViews = {
  issues_with_context: IssuesWithContextView
}
