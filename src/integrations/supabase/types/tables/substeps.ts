/**
 * Substeps domain tables: substeps, substep_templates, substep_template_items
 * Operation substep management and templates
 */

export type SubstepsTable = {
  Row: {
    completed_at: string | null
    completed_by: string | null
    created_at: string | null
    icon_name: string | null
    id: string
    name: string
    notes: string | null
    operation_id: string
    sequence: number
    status: string | null
    tenant_id: string
    updated_at: string | null
  }
  Insert: {
    completed_at?: string | null
    completed_by?: string | null
    created_at?: string | null
    icon_name?: string | null
    id?: string
    name: string
    notes?: string | null
    operation_id: string
    sequence: number
    status?: string | null
    tenant_id: string
    updated_at?: string | null
  }
  Update: {
    completed_at?: string | null
    completed_by?: string | null
    created_at?: string | null
    icon_name?: string | null
    id?: string
    name?: string
    notes?: string | null
    operation_id?: string
    sequence?: number
    status?: string | null
    tenant_id?: string
    updated_at?: string | null
  }
  Relationships: []
}

export type SubstepTemplatesTable = {
  Row: {
    created_at: string | null
    created_by: string | null
    description: string | null
    id: string
    is_global: boolean | null
    name: string
    operation_type: string | null
    tenant_id: string
    updated_at: string | null
  }
  Insert: {
    created_at?: string | null
    created_by?: string | null
    description?: string | null
    id?: string
    is_global?: boolean | null
    name: string
    operation_type?: string | null
    tenant_id: string
    updated_at?: string | null
  }
  Update: {
    created_at?: string | null
    created_by?: string | null
    description?: string | null
    id?: string
    is_global?: boolean | null
    name?: string
    operation_type?: string | null
    tenant_id?: string
    updated_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "substep_templates_created_by_fkey"
      columns: ["created_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "substep_templates_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type SubstepTemplateItemsTable = {
  Row: {
    created_at: string | null
    id: string
    name: string
    notes: string | null
    sequence: number
    template_id: string
    updated_at: string | null
  }
  Insert: {
    created_at?: string | null
    id?: string
    name: string
    notes?: string | null
    sequence: number
    template_id: string
    updated_at?: string | null
  }
  Update: {
    created_at?: string | null
    id?: string
    name?: string
    notes?: string | null
    sequence?: number
    template_id?: string
    updated_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "substep_template_items_template_id_fkey"
      columns: ["template_id"]
      isOneToOne: false
      referencedRelation: "substep_templates"
      referencedColumns: ["id"]
    },
  ]
}

export type SubstepsTables = {
  substeps: SubstepsTable
  substep_templates: SubstepTemplatesTable
  substep_template_items: SubstepTemplateItemsTable
}
