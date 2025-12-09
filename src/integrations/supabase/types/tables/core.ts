/**
 * Core tables: tenants, profiles, user_roles, invitations
 * These are the foundational tables that other tables depend on
 */

import type { Json } from '../base'
import type { DatabaseEnums } from '../enums'

export type TenantsTable = {
  Row: {
    abbreviation: string | null
    auto_stop_tracking: boolean | null
    billing_country_code: string | null
    billing_email: string | null
    billing_enabled: boolean | null
    company_name: string | null
    created_at: string | null
    current_jobs: number | null
    current_parts_this_month: number | null
    current_storage_gb: number | null
    demo_data_seeded_at: string | null
    demo_data_seeded_by: string | null
    demo_mode_acknowledged: boolean | null
    demo_mode_enabled: boolean | null
    factory_closing_time: string | null
    factory_opening_time: string | null
    grace_period_ends_at: string | null
    id: string
    last_parts_reset_date: string | null
    max_jobs: number | null
    max_parts_per_month: number | null
    max_storage_gb: number | null
    name: string
    next_operator_number: number | null
    onboarding_completed_at: string | null
    payment_failed_at: string | null
    plan: DatabaseEnums["subscription_plan"]
    preferred_payment_method: DatabaseEnums["payment_provider"] | null
    status: DatabaseEnums["subscription_status"]
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    subscription_started_at: string | null
    subscription_updated_at: string | null
    timezone: string | null
    trial_end: string | null
    trial_ends_at: string | null
    updated_at: string | null
    vat_number: string | null
    whitelabel_app_name: string | null
    whitelabel_enabled: boolean | null
    whitelabel_favicon_url: string | null
    whitelabel_logo_url: string | null
    whitelabel_primary_color: string | null
    working_days_mask: number | null
    // SSO fields (premium feature)
    sso_enabled: boolean | null
    sso_provider: string | null
    sso_domain: string | null
    sso_enforce_only: boolean | null
  }
  Insert: {
    abbreviation?: string | null
    auto_stop_tracking?: boolean | null
    billing_country_code?: string | null
    billing_email?: string | null
    billing_enabled?: boolean | null
    company_name?: string | null
    created_at?: string | null
    current_jobs?: number | null
    current_parts_this_month?: number | null
    current_storage_gb?: number | null
    demo_data_seeded_at?: string | null
    demo_data_seeded_by?: string | null
    demo_mode_acknowledged?: boolean | null
    demo_mode_enabled?: boolean | null
    factory_closing_time?: string | null
    factory_opening_time?: string | null
    grace_period_ends_at?: string | null
    id?: string
    last_parts_reset_date?: string | null
    max_jobs?: number | null
    max_parts_per_month?: number | null
    max_storage_gb?: number | null
    name: string
    next_operator_number?: number | null
    onboarding_completed_at?: string | null
    payment_failed_at?: string | null
    plan?: DatabaseEnums["subscription_plan"]
    preferred_payment_method?: DatabaseEnums["payment_provider"] | null
    status?: DatabaseEnums["subscription_status"]
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
    subscription_started_at?: string | null
    subscription_updated_at?: string | null
    timezone?: string | null
    trial_end?: string | null
    trial_ends_at?: string | null
    updated_at?: string | null
    vat_number?: string | null
    whitelabel_app_name?: string | null
    whitelabel_enabled?: boolean | null
    whitelabel_favicon_url?: string | null
    whitelabel_logo_url?: string | null
    whitelabel_primary_color?: string | null
    working_days_mask?: number | null
    // SSO fields (premium feature)
    sso_enabled?: boolean | null
    sso_provider?: string | null
    sso_domain?: string | null
    sso_enforce_only?: boolean | null
  }
  Update: {
    abbreviation?: string | null
    auto_stop_tracking?: boolean | null
    billing_country_code?: string | null
    billing_email?: string | null
    billing_enabled?: boolean | null
    company_name?: string | null
    created_at?: string | null
    current_jobs?: number | null
    current_parts_this_month?: number | null
    current_storage_gb?: number | null
    demo_data_seeded_at?: string | null
    demo_data_seeded_by?: string | null
    demo_mode_acknowledged?: boolean | null
    demo_mode_enabled?: boolean | null
    factory_closing_time?: string | null
    factory_opening_time?: string | null
    grace_period_ends_at?: string | null
    id?: string
    last_parts_reset_date?: string | null
    max_jobs?: number | null
    max_parts_per_month?: number | null
    max_storage_gb?: number | null
    name?: string
    next_operator_number?: number | null
    onboarding_completed_at?: string | null
    payment_failed_at?: string | null
    plan?: DatabaseEnums["subscription_plan"]
    preferred_payment_method?: DatabaseEnums["payment_provider"] | null
    status?: DatabaseEnums["subscription_status"]
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
    subscription_started_at?: string | null
    subscription_updated_at?: string | null
    timezone?: string | null
    trial_end?: string | null
    trial_ends_at?: string | null
    updated_at?: string | null
    vat_number?: string | null
    whitelabel_app_name?: string | null
    whitelabel_enabled?: boolean | null
    whitelabel_favicon_url?: string | null
    whitelabel_logo_url?: string | null
    whitelabel_primary_color?: string | null
    working_days_mask?: number | null
    // SSO fields (premium feature)
    sso_enabled?: boolean | null
    sso_provider?: string | null
    sso_domain?: string | null
    sso_enforce_only?: boolean | null
  }
  Relationships: []
}

export type ProfilesTable = {
  Row: {
    active: boolean | null
    created_at: string | null
    email: string
    employee_id: string | null
    full_name: string
    has_email_login: boolean | null
    id: string
    is_machine: boolean | null
    is_root_admin: boolean | null
    mock_data_imported: boolean | null
    onboarding_completed: boolean | null
    onboarding_step: number | null
    pin_hash: string | null
    role: DatabaseEnums["app_role"]
    search_vector: unknown
    tenant_id: string
    tour_completed: boolean | null
    updated_at: string | null
    username: string
  }
  Insert: {
    active?: boolean | null
    created_at?: string | null
    email: string
    employee_id?: string | null
    full_name: string
    has_email_login?: boolean | null
    id: string
    is_machine?: boolean | null
    is_root_admin?: boolean | null
    mock_data_imported?: boolean | null
    onboarding_completed?: boolean | null
    onboarding_step?: number | null
    pin_hash?: string | null
    role: DatabaseEnums["app_role"]
    search_vector?: unknown
    tenant_id: string
    tour_completed?: boolean | null
    updated_at?: string | null
    username: string
  }
  Update: {
    active?: boolean | null
    created_at?: string | null
    email?: string
    employee_id?: string | null
    full_name?: string
    has_email_login?: boolean | null
    id?: string
    is_machine?: boolean | null
    is_root_admin?: boolean | null
    mock_data_imported?: boolean | null
    onboarding_completed?: boolean | null
    onboarding_step?: number | null
    pin_hash?: string | null
    role?: DatabaseEnums["app_role"]
    search_vector?: unknown
    tenant_id?: string
    tour_completed?: boolean | null
    updated_at?: string | null
    username?: string
  }
  Relationships: []
}

export type UserRolesTable = {
  Row: {
    created_at: string | null
    id: string
    role: DatabaseEnums["app_role"]
    user_id: string
  }
  Insert: {
    created_at?: string | null
    id?: string
    role: DatabaseEnums["app_role"]
    user_id: string
  }
  Update: {
    created_at?: string | null
    id?: string
    role?: DatabaseEnums["app_role"]
    user_id?: string
  }
  Relationships: []
}

export type InvitationsTable = {
  Row: {
    accepted_at: string | null
    accepted_by: string | null
    created_at: string | null
    email: string
    expires_at: string
    id: string
    invited_by: string
    metadata: Json | null
    role: DatabaseEnums["app_role"]
    status: string
    tenant_id: string
    token: string
    updated_at: string | null
  }
  Insert: {
    accepted_at?: string | null
    accepted_by?: string | null
    created_at?: string | null
    email: string
    expires_at?: string
    id?: string
    invited_by: string
    metadata?: Json | null
    role?: DatabaseEnums["app_role"]
    status?: string
    tenant_id: string
    token: string
    updated_at?: string | null
  }
  Update: {
    accepted_at?: string | null
    accepted_by?: string | null
    created_at?: string | null
    email?: string
    expires_at?: string
    id?: string
    invited_by?: string
    metadata?: Json | null
    role?: DatabaseEnums["app_role"]
    status?: string
    tenant_id?: string
    token?: string
    updated_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "invitations_accepted_by_fkey"
      columns: ["accepted_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "invitations_invited_by_fkey"
      columns: ["invited_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "invitations_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type CoreTables = {
  tenants: TenantsTable
  profiles: ProfilesTable
  user_roles: UserRolesTable
  invitations: InvitationsTable
}
