/**
 * MCP (Model Context Protocol) domain tables
 * MCP server configuration, authentication, health, and logging
 */

import type { Json } from '../base'

export type McpAuthenticationKeysTable = {
  Row: {
    allowed_tools: Json | null
    created_at: string | null
    created_by: string | null
    description: string | null
    enabled: boolean
    environment: string
    id: string
    key_hash: string
    key_prefix: string
    last_used_at: string | null
    name: string
    rate_limit: number | null
    tenant_id: string
    updated_at: string | null
    usage_count: number | null
  }
  Insert: {
    allowed_tools?: Json | null
    created_at?: string | null
    created_by?: string | null
    description?: string | null
    enabled?: boolean
    environment?: string
    id?: string
    key_hash: string
    key_prefix: string
    last_used_at?: string | null
    name: string
    rate_limit?: number | null
    tenant_id: string
    updated_at?: string | null
    usage_count?: number | null
  }
  Update: {
    allowed_tools?: Json | null
    created_at?: string | null
    created_by?: string | null
    description?: string | null
    enabled?: boolean
    environment?: string
    id?: string
    key_hash?: string
    key_prefix?: string
    last_used_at?: string | null
    name?: string
    rate_limit?: number | null
    tenant_id?: string
    updated_at?: string | null
    usage_count?: number | null
  }
  Relationships: [
    {
      foreignKeyName: "mcp_authentication_keys_created_by_fkey"
      columns: ["created_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "mcp_authentication_keys_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type McpKeyUsageLogsTable = {
  Row: {
    created_at: string | null
    error_message: string | null
    id: string
    ip_address: unknown
    key_id: string | null
    response_time_ms: number | null
    success: boolean
    tenant_id: string
    tool_arguments: Json | null
    tool_name: string
    user_agent: string | null
  }
  Insert: {
    created_at?: string | null
    error_message?: string | null
    id?: string
    ip_address?: unknown
    key_id?: string | null
    response_time_ms?: number | null
    success: boolean
    tenant_id: string
    tool_arguments?: Json | null
    tool_name: string
    user_agent?: string | null
  }
  Update: {
    created_at?: string | null
    error_message?: string | null
    id?: string
    ip_address?: unknown
    key_id?: string | null
    response_time_ms?: number | null
    success?: boolean
    tenant_id?: string
    tool_arguments?: Json | null
    tool_name?: string
    user_agent?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "mcp_key_usage_logs_key_id_fkey"
      columns: ["key_id"]
      isOneToOne: false
      referencedRelation: "mcp_authentication_keys"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "mcp_key_usage_logs_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type McpServerConfigTable = {
  Row: {
    created_at: string | null
    enabled: boolean
    features: Json | null
    id: string
    last_connected_at: string | null
    server_name: string
    server_version: string
    supabase_url: string
    tenant_id: string
    updated_at: string | null
  }
  Insert: {
    created_at?: string | null
    enabled?: boolean
    features?: Json | null
    id?: string
    last_connected_at?: string | null
    server_name?: string
    server_version?: string
    supabase_url: string
    tenant_id: string
    updated_at?: string | null
  }
  Update: {
    created_at?: string | null
    enabled?: boolean
    features?: Json | null
    id?: string
    last_connected_at?: string | null
    server_name?: string
    server_version?: string
    supabase_url?: string
    tenant_id?: string
    updated_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "mcp_server_config_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: true
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type McpServerHealthTable = {
  Row: {
    created_at: string | null
    error_message: string | null
    id: string
    last_check: string | null
    metadata: Json | null
    response_time_ms: number | null
    status: string
    tenant_id: string
  }
  Insert: {
    created_at?: string | null
    error_message?: string | null
    id?: string
    last_check?: string | null
    metadata?: Json | null
    response_time_ms?: number | null
    status: string
    tenant_id: string
  }
  Update: {
    created_at?: string | null
    error_message?: string | null
    id?: string
    last_check?: string | null
    metadata?: Json | null
    response_time_ms?: number | null
    status?: string
    tenant_id?: string
  }
  Relationships: [
    {
      foreignKeyName: "mcp_server_health_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type McpServerLogsTable = {
  Row: {
    created_at: string | null
    event_type: string
    id: string
    message: string
    metadata: Json | null
    tenant_id: string
  }
  Insert: {
    created_at?: string | null
    event_type: string
    id?: string
    message: string
    metadata?: Json | null
    tenant_id: string
  }
  Update: {
    created_at?: string | null
    event_type?: string
    id?: string
    message?: string
    metadata?: Json | null
    tenant_id?: string
  }
  Relationships: [
    {
      foreignKeyName: "mcp_server_logs_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type McpEndpointsTable = {
  Row: {
    id: string
    tenant_id: string
    name: string
    token_hash: string
    token_prefix: string
    enabled: boolean
    created_at: string | null
    created_by: string | null
    last_used_at: string | null
    usage_count: number
  }
  Insert: {
    id?: string
    tenant_id: string
    name: string
    token_hash: string
    token_prefix: string
    enabled?: boolean
    created_at?: string | null
    created_by?: string | null
    last_used_at?: string | null
    usage_count?: number
  }
  Update: {
    id?: string
    tenant_id?: string
    name?: string
    token_hash?: string
    token_prefix?: string
    enabled?: boolean
    created_at?: string | null
    created_by?: string | null
    last_used_at?: string | null
    usage_count?: number
  }
  Relationships: [
    {
      foreignKeyName: "mcp_endpoints_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "mcp_endpoints_created_by_fkey"
      columns: ["created_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
  ]
}

export type McpTables = {
  mcp_authentication_keys: McpAuthenticationKeysTable
  mcp_endpoints: McpEndpointsTable
  mcp_key_usage_logs: McpKeyUsageLogsTable
  mcp_server_config: McpServerConfigTable
  mcp_server_health: McpServerHealthTable
  mcp_server_logs: McpServerLogsTable
}
