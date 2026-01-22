/**
 * Resources domain tables: resources, operation_resources, operators, materials
 * Manufacturing resources and materials management
 */

import type { Json } from '../base'

export type ResourcesTable = {
  Row: {
    active: boolean | null
    created_at: string | null
    deleted_at: string | null
    deleted_by: string | null
    description: string | null
    external_id: string | null
    external_source: string | null
    id: string
    identifier: string | null
    location: string | null
    metadata: Json | null
    name: string
    status: string | null
    synced_at: string | null
    tenant_id: string
    type: string
    updated_at: string | null
  }
  Insert: {
    active?: boolean | null
    created_at?: string | null
    deleted_at?: string | null
    deleted_by?: string | null
    description?: string | null
    external_id?: string | null
    external_source?: string | null
    id?: string
    identifier?: string | null
    location?: string | null
    metadata?: Json | null
    name: string
    status?: string | null
    synced_at?: string | null
    tenant_id: string
    type: string
    updated_at?: string | null
  }
  Update: {
    active?: boolean | null
    created_at?: string | null
    deleted_at?: string | null
    deleted_by?: string | null
    description?: string | null
    external_id?: string | null
    external_source?: string | null
    id?: string
    identifier?: string | null
    location?: string | null
    metadata?: Json | null
    name?: string
    status?: string | null
    synced_at?: string | null
    tenant_id?: string
    type?: string
    updated_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "resources_deleted_by_fkey"
      columns: ["deleted_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
  ]
}

export type OperationResourcesTable = {
  Row: {
    created_at: string | null
    id: string
    notes: string | null
    operation_id: string
    quantity: number | null
    resource_id: string
  }
  Insert: {
    created_at?: string | null
    id?: string
    notes?: string | null
    operation_id: string
    quantity?: number | null
    resource_id: string
  }
  Update: {
    created_at?: string | null
    id?: string
    notes?: string | null
    operation_id?: string
    quantity?: number | null
    resource_id?: string
  }
  Relationships: [
    {
      foreignKeyName: "operation_resources_operation_id_fkey"
      columns: ["operation_id"]
      isOneToOne: false
      referencedRelation: "operations"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "operation_resources_resource_id_fkey"
      columns: ["resource_id"]
      isOneToOne: false
      referencedRelation: "resources"
      referencedColumns: ["id"]
    },
  ]
}

export type OperatorsTable = {
  Row: {
    active: boolean | null
    created_at: string | null
    created_by: string | null
    employee_id: string
    full_name: string
    id: string
    pin_hash: string
    tenant_id: string
    updated_at: string | null
  }
  Insert: {
    active?: boolean | null
    created_at?: string | null
    created_by?: string | null
    employee_id: string
    full_name: string
    id?: string
    pin_hash: string
    tenant_id: string
    updated_at?: string | null
  }
  Update: {
    active?: boolean | null
    created_at?: string | null
    created_by?: string | null
    employee_id?: string
    full_name?: string
    id?: string
    pin_hash?: string
    tenant_id?: string
    updated_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "operators_created_by_fkey"
      columns: ["created_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "operators_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type MaterialsTable = {
  Row: {
    active: boolean | null
    color: string | null
    created_at: string | null
    description: string | null
    id: string
    name: string
    tenant_id: string
    updated_at: string | null
  }
  Insert: {
    active?: boolean | null
    color?: string | null
    created_at?: string | null
    description?: string | null
    id?: string
    name: string
    tenant_id: string
    updated_at?: string | null
  }
  Update: {
    active?: boolean | null
    color?: string | null
    created_at?: string | null
    description?: string | null
    id?: string
    name?: string
    tenant_id?: string
    updated_at?: string | null
  }
  Relationships: []
}

export type ResourcesTables = {
  resources: ResourcesTable
  operation_resources: OperationResourcesTable
  operators: OperatorsTable
  materials: MaterialsTable
}
