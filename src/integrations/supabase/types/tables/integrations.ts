/**
 * Integrations domain tables: api_keys, webhooks, webhook_logs, integrations, installed_integrations
 * External integrations and API management
 */

import type { Json } from '../base'
import type { DatabaseEnums } from '../enums'

export type ApiKeysTable = {
  Row: {
    active: boolean | null
    created_at: string | null
    created_by: string
    id: string
    key_hash: string
    key_prefix: string
    last_used_at: string | null
    name: string
    tenant_id: string
  }
  Insert: {
    active?: boolean | null
    created_at?: string | null
    created_by: string
    id?: string
    key_hash: string
    key_prefix: string
    last_used_at?: string | null
    name: string
    tenant_id: string
  }
  Update: {
    active?: boolean | null
    created_at?: string | null
    created_by?: string
    id?: string
    key_hash?: string
    key_prefix?: string
    last_used_at?: string | null
    name?: string
    tenant_id?: string
  }
  Relationships: []
}

export type WebhooksTable = {
  Row: {
    active: boolean | null
    created_at: string | null
    events: string[]
    id: string
    secret_key: string
    tenant_id: string
    url: string
  }
  Insert: {
    active?: boolean | null
    created_at?: string | null
    events: string[]
    id?: string
    secret_key: string
    tenant_id: string
    url: string
  }
  Update: {
    active?: boolean | null
    created_at?: string | null
    events?: string[]
    id?: string
    secret_key?: string
    tenant_id?: string
    url?: string
  }
  Relationships: []
}

export type WebhookLogsTable = {
  Row: {
    created_at: string | null
    error_message: string | null
    event_type: string
    id: string
    payload: Json
    status_code: number | null
    webhook_id: string
  }
  Insert: {
    created_at?: string | null
    error_message?: string | null
    event_type: string
    id?: string
    payload: Json
    status_code?: number | null
    webhook_id: string
  }
  Update: {
    created_at?: string | null
    error_message?: string | null
    event_type?: string
    id?: string
    payload?: Json
    status_code?: number | null
    webhook_id?: string
  }
  Relationships: [
    {
      foreignKeyName: "webhook_logs_webhook_id_fkey"
      columns: ["webhook_id"]
      isOneToOne: false
      referencedRelation: "webhooks"
      referencedColumns: ["id"]
    },
  ]
}

export type IntegrationsTable = {
  Row: {
    banner_url: string | null
    category: DatabaseEnums["integration_category"]
    created_at: string | null
    demo_video_url: string | null
    description: string
    documentation_url: string | null
    features: Json | null
    github_repo_url: string | null
    id: string
    install_count: number | null
    install_url: string | null
    is_free: boolean | null
    logo_url: string | null
    long_description: string | null
    min_plan_tier: string | null
    name: string
    pricing_description: string | null
    pricing_url: string | null
    provider_email: string | null
    provider_name: string
    provider_url: string | null
    published_at: string | null
    rating_average: number | null
    rating_count: number | null
    requirements: Json | null
    requires_api_key: boolean | null
    screenshots: Json | null
    slug: string
    status: DatabaseEnums["integration_status"]
    supported_systems: Json | null
    updated_at: string | null
    version: string | null
    webhook_template: Json | null
  }
  Insert: {
    banner_url?: string | null
    category?: DatabaseEnums["integration_category"]
    created_at?: string | null
    demo_video_url?: string | null
    description: string
    documentation_url?: string | null
    features?: Json | null
    github_repo_url?: string | null
    id?: string
    install_count?: number | null
    install_url?: string | null
    is_free?: boolean | null
    logo_url?: string | null
    long_description?: string | null
    min_plan_tier?: string | null
    name: string
    pricing_description?: string | null
    pricing_url?: string | null
    provider_email?: string | null
    provider_name: string
    provider_url?: string | null
    published_at?: string | null
    rating_average?: number | null
    rating_count?: number | null
    requirements?: Json | null
    requires_api_key?: boolean | null
    screenshots?: Json | null
    slug: string
    status?: DatabaseEnums["integration_status"]
    supported_systems?: Json | null
    updated_at?: string | null
    version?: string | null
    webhook_template?: Json | null
  }
  Update: {
    banner_url?: string | null
    category?: DatabaseEnums["integration_category"]
    created_at?: string | null
    demo_video_url?: string | null
    description?: string
    documentation_url?: string | null
    features?: Json | null
    github_repo_url?: string | null
    id?: string
    install_count?: number | null
    install_url?: string | null
    is_free?: boolean | null
    logo_url?: string | null
    long_description?: string | null
    min_plan_tier?: string | null
    name?: string
    pricing_description?: string | null
    pricing_url?: string | null
    provider_email?: string | null
    provider_name?: string
    provider_url?: string | null
    published_at?: string | null
    rating_average?: number | null
    rating_count?: number | null
    requirements?: Json | null
    requires_api_key?: boolean | null
    screenshots?: Json | null
    slug?: string
    status?: DatabaseEnums["integration_status"]
    supported_systems?: Json | null
    updated_at?: string | null
    version?: string | null
    webhook_template?: Json | null
  }
  Relationships: []
}

export type InstalledIntegrationsTable = {
  Row: {
    api_key_id: string | null
    config: Json | null
    id: string
    installed_at: string | null
    installed_by: string | null
    integration_id: string
    is_active: boolean | null
    last_sync_at: string | null
    tenant_id: string
    updated_at: string | null
    webhook_id: string | null
  }
  Insert: {
    api_key_id?: string | null
    config?: Json | null
    id?: string
    installed_at?: string | null
    installed_by?: string | null
    integration_id: string
    is_active?: boolean | null
    last_sync_at?: string | null
    tenant_id: string
    updated_at?: string | null
    webhook_id?: string | null
  }
  Update: {
    api_key_id?: string | null
    config?: Json | null
    id?: string
    installed_at?: string | null
    installed_by?: string | null
    integration_id?: string
    is_active?: boolean | null
    last_sync_at?: string | null
    tenant_id?: string
    updated_at?: string | null
    webhook_id?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "installed_integrations_api_key_id_fkey"
      columns: ["api_key_id"]
      isOneToOne: false
      referencedRelation: "api_keys"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "installed_integrations_installed_by_fkey"
      columns: ["installed_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "installed_integrations_integration_id_fkey"
      columns: ["integration_id"]
      isOneToOne: false
      referencedRelation: "integrations"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "installed_integrations_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "installed_integrations_webhook_id_fkey"
      columns: ["webhook_id"]
      isOneToOne: false
      referencedRelation: "webhooks"
      referencedColumns: ["id"]
    },
  ]
}

export type IntegrationsTables = {
  api_keys: ApiKeysTable
  webhooks: WebhooksTable
  webhook_logs: WebhookLogsTable
  integrations: IntegrationsTable
  installed_integrations: InstalledIntegrationsTable
}
