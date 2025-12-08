/**
 * Billing domain tables: billing_waitlist, subscription_events, monthly_reset_logs
 * Subscription and billing management
 */

import type { Json } from '../base'
import type { DatabaseEnums } from '../enums'

export type BillingWaitlistTable = {
  Row: {
    company_name: string
    company_registration_number: string | null
    company_size: string | null
    contact_email: string
    contact_name: string
    contact_phone: string | null
    country_code: string
    created_at: string | null
    id: string
    industry: string | null
    interested_plan: DatabaseEnums["subscription_plan"] | null
    notes: string | null
    preferred_payment_method: DatabaseEnums["payment_provider"] | null
    status: DatabaseEnums["waitlist_status"] | null
    vat_number: string
    vat_valid: boolean | null
    vat_validated_at: string | null
  }
  Insert: {
    company_name: string
    company_registration_number?: string | null
    company_size?: string | null
    contact_email: string
    contact_name: string
    contact_phone?: string | null
    country_code: string
    created_at?: string | null
    id?: string
    industry?: string | null
    interested_plan?: DatabaseEnums["subscription_plan"] | null
    notes?: string | null
    preferred_payment_method?: DatabaseEnums["payment_provider"] | null
    status?: DatabaseEnums["waitlist_status"] | null
    vat_number: string
    vat_valid?: boolean | null
    vat_validated_at?: string | null
  }
  Update: {
    company_name?: string
    company_registration_number?: string | null
    company_size?: string | null
    contact_email?: string
    contact_name?: string
    contact_phone?: string | null
    country_code?: string
    created_at?: string | null
    id?: string
    industry?: string | null
    interested_plan?: DatabaseEnums["subscription_plan"] | null
    notes?: string | null
    preferred_payment_method?: DatabaseEnums["payment_provider"] | null
    status?: DatabaseEnums["waitlist_status"] | null
    vat_number?: string
    vat_valid?: boolean | null
    vat_validated_at?: string | null
  }
  Relationships: []
}

export type SubscriptionEventsTable = {
  Row: {
    created_at: string | null
    event_type: string
    id: string
    metadata: Json | null
    new_plan: DatabaseEnums["subscription_plan"] | null
    new_status: DatabaseEnums["subscription_status"] | null
    old_plan: DatabaseEnums["subscription_plan"] | null
    old_status: DatabaseEnums["subscription_status"] | null
    stripe_event_id: string | null
    tenant_id: string
  }
  Insert: {
    created_at?: string | null
    event_type: string
    id?: string
    metadata?: Json | null
    new_plan?: DatabaseEnums["subscription_plan"] | null
    new_status?: DatabaseEnums["subscription_status"] | null
    old_plan?: DatabaseEnums["subscription_plan"] | null
    old_status?: DatabaseEnums["subscription_status"] | null
    stripe_event_id?: string | null
    tenant_id: string
  }
  Update: {
    created_at?: string | null
    event_type?: string
    id?: string
    metadata?: Json | null
    new_plan?: DatabaseEnums["subscription_plan"] | null
    new_status?: DatabaseEnums["subscription_status"] | null
    old_plan?: DatabaseEnums["subscription_plan"] | null
    old_status?: DatabaseEnums["subscription_status"] | null
    stripe_event_id?: string | null
    tenant_id?: string
  }
  Relationships: [
    {
      foreignKeyName: "subscription_events_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type MonthlyResetLogsTable = {
  Row: {
    created_at: string
    error_message: string | null
    id: string
    previous_count: number
    reset_date: string
    reset_successful: boolean
    tenant_id: string
  }
  Insert: {
    created_at?: string
    error_message?: string | null
    id?: string
    previous_count: number
    reset_date?: string
    reset_successful?: boolean
    tenant_id: string
  }
  Update: {
    created_at?: string
    error_message?: string | null
    id?: string
    previous_count?: number
    reset_date?: string
    reset_successful?: boolean
    tenant_id?: string
  }
  Relationships: [
    {
      foreignKeyName: "monthly_reset_logs_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type BillingTables = {
  billing_waitlist: BillingWaitlistTable
  subscription_events: SubscriptionEventsTable
  monthly_reset_logs: MonthlyResetLogsTable
}
