/**
 * Activity domain tables: activity_log, notifications
 * System activity tracking and user notifications
 */

import type { Json } from '../base'

export type ActivityLogTable = {
  Row: {
    action: string
    changes: Json | null
    created_at: string
    description: string | null
    entity_id: string | null
    entity_name: string | null
    entity_type: string | null
    id: string
    ip_address: unknown
    metadata: Json | null
    search_vector: unknown
    session_id: string | null
    tenant_id: string
    user_agent: string | null
    user_email: string | null
    user_id: string | null
    user_name: string | null
  }
  Insert: {
    action: string
    changes?: Json | null
    created_at?: string
    description?: string | null
    entity_id?: string | null
    entity_name?: string | null
    entity_type?: string | null
    id?: string
    ip_address?: unknown
    metadata?: Json | null
    search_vector?: unknown
    session_id?: string | null
    tenant_id: string
    user_agent?: string | null
    user_email?: string | null
    user_id?: string | null
    user_name?: string | null
  }
  Update: {
    action?: string
    changes?: Json | null
    created_at?: string
    description?: string | null
    entity_id?: string | null
    entity_name?: string | null
    entity_type?: string | null
    id?: string
    ip_address?: unknown
    metadata?: Json | null
    search_vector?: unknown
    session_id?: string | null
    tenant_id?: string
    user_agent?: string | null
    user_email?: string | null
    user_id?: string | null
    user_name?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "activity_log_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "activity_log_user_id_fkey"
      columns: ["user_id"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
  ]
}

export type NotificationsTable = {
  Row: {
    created_at: string
    dismissed: boolean
    dismissed_at: string | null
    id: string
    link: string | null
    message: string
    metadata: Json | null
    pinned: boolean
    pinned_at: string | null
    read: boolean
    read_at: string | null
    reference_id: string | null
    reference_type: string | null
    severity: string
    tenant_id: string
    title: string
    type: string
    user_id: string | null
  }
  Insert: {
    created_at?: string
    dismissed?: boolean
    dismissed_at?: string | null
    id?: string
    link?: string | null
    message: string
    metadata?: Json | null
    pinned?: boolean
    pinned_at?: string | null
    read?: boolean
    read_at?: string | null
    reference_id?: string | null
    reference_type?: string | null
    severity?: string
    tenant_id: string
    title: string
    type: string
    user_id?: string | null
  }
  Update: {
    created_at?: string
    dismissed?: boolean
    dismissed_at?: string | null
    id?: string
    link?: string | null
    message?: string
    metadata?: Json | null
    pinned?: boolean
    pinned_at?: string | null
    read?: boolean
    read_at?: string | null
    reference_id?: string | null
    reference_type?: string | null
    severity?: string
    tenant_id?: string
    title?: string
    type?: string
    user_id?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "notifications_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type ActivityTables = {
  activity_log: ActivityLogTable
  notifications: NotificationsTable
}
