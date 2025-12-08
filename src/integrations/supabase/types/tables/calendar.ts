/**
 * Calendar domain tables: factory_calendar
 * Factory scheduling and capacity planning
 */

export type FactoryCalendarTable = {
  Row: {
    capacity_multiplier: number | null
    closing_time: string | null
    created_at: string | null
    date: string
    day_type: string
    id: string
    name: string | null
    notes: string | null
    opening_time: string | null
    tenant_id: string
    updated_at: string | null
  }
  Insert: {
    capacity_multiplier?: number | null
    closing_time?: string | null
    created_at?: string | null
    date: string
    day_type?: string
    id?: string
    name?: string | null
    notes?: string | null
    opening_time?: string | null
    tenant_id: string
    updated_at?: string | null
  }
  Update: {
    capacity_multiplier?: number | null
    closing_time?: string | null
    created_at?: string | null
    date?: string
    day_type?: string
    id?: string
    name?: string | null
    notes?: string | null
    opening_time?: string | null
    tenant_id?: string
    updated_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "factory_calendar_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type CalendarTables = {
  factory_calendar: FactoryCalendarTable
}
