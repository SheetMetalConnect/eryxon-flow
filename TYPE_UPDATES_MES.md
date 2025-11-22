# TypeScript Types Updates for MES Data Fields

**File:** `src/integrations/supabase/types.ts`

This document describes the changes needed to the TypeScript types file to support the new MES data fields.

## 1. Update `parts` Table (around line 831)

Add the following fields to all three sections (Row, Insert, Update):

```typescript
// Add to Row section (line ~845):
material_cert_number: string | null
material_lot: string | null
material_supplier: string | null

// Add to Insert section (line ~863):
material_cert_number?: string | null
material_lot?: string | null
material_supplier?: string | null

// Add to Update section (line ~881):
material_cert_number?: string | null
material_lot?: string | null
material_supplier?: string | null
```

## 2. Update `time_entries` Table (around line 1209)

Add the following field to all three sections (Row, Insert, Update):

```typescript
// Add to Row section (line ~1220):
time_type: string

// Add to Insert section (line ~1232):
time_type?: string

// Add to Update section (line ~1244):
time_type?: string
```

## 3. Add New Table: `operation_quantities` (insert after `operations`, before `parts` ~line 831)

```typescript
operation_quantities: {
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
```

## 4. Add New Table: `scrap_reasons` (insert after `resources` ~line 1012, before `substep_template_items`)

```typescript
scrap_reasons: {
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
```

## Implementation Note

These types will be automatically generated when running `npm run update-types` after the SQL migration is applied. This document serves as a reference for manual updates if needed before the migration is run.

For development purposes before the migration is applied, you may manually add these type definitions to enable TypeScript support in the API handlers and UI components.
