export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_log: {
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
      api_keys: {
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
      api_usage_logs: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          date: string
          id: string
          requests_count: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          requests_count?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          requests_count?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assigned_by: string
          created_at: string | null
          id: string
          job_id: string | null
          operator_id: string | null
          part_id: string | null
          shop_floor_operator_id: string | null
          status: Database["public"]["Enums"]["assignment_status"] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_by: string
          created_at?: string | null
          id?: string
          job_id?: string | null
          operator_id?: string | null
          part_id?: string | null
          shop_floor_operator_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string
          created_at?: string | null
          id?: string
          job_id?: string | null
          operator_id?: string | null
          part_id?: string | null
          shop_floor_operator_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_shop_floor_operator_id_fkey"
            columns: ["shop_floor_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_entries: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          operator_id: string | null
          profile_id: string | null
          shift_id: string | null
          status: string
          target_hours: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          profile_id?: string | null
          shift_id?: string | null
          status?: string
          target_hours?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          profile_id?: string | null
          shift_id?: string | null
          status?: string
          target_hours?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_entries_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "factory_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_waitlist: {
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
          interested_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          notes: string | null
          preferred_payment_method:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          status: Database["public"]["Enums"]["waitlist_status"] | null
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
          interested_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          notes?: string | null
          preferred_payment_method?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          status?: Database["public"]["Enums"]["waitlist_status"] | null
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
          interested_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          notes?: string | null
          preferred_payment_method?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          status?: Database["public"]["Enums"]["waitlist_status"] | null
          vat_number?: string
          vat_valid?: boolean | null
          vat_validated_at?: string | null
        }
        Relationships: []
      }
      cells: {
        Row: {
          active: boolean | null
          capacity_hours_per_day: number | null
          color: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          enforce_wip_limit: boolean | null
          external_id: string | null
          external_source: string | null
          icon_name: string | null
          id: string
          image_url: string | null
          name: string
          sequence: number
          show_capacity_warning: boolean | null
          synced_at: string | null
          tenant_id: string
          updated_at: string | null
          wip_limit: number | null
          wip_warning_threshold: number | null
        }
        Insert: {
          active?: boolean | null
          capacity_hours_per_day?: number | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          enforce_wip_limit?: boolean | null
          external_id?: string | null
          external_source?: string | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          name: string
          sequence: number
          show_capacity_warning?: boolean | null
          synced_at?: string | null
          tenant_id: string
          updated_at?: string | null
          wip_limit?: number | null
          wip_warning_threshold?: number | null
        }
        Update: {
          active?: boolean | null
          capacity_hours_per_day?: number | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          enforce_wip_limit?: boolean | null
          external_id?: string | null
          external_source?: string | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          name?: string
          sequence?: number
          show_capacity_warning?: boolean | null
          synced_at?: string | null
          tenant_id?: string
          updated_at?: string | null
          wip_limit?: number | null
          wip_warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cells_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exceptions: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          actual_value: Json | null
          corrective_action: string | null
          detected_at: string
          detected_by_event: string | null
          deviation_amount: number | null
          deviation_unit: string | null
          exception_type: Database["public"]["Enums"]["exception_type"]
          expectation_id: string
          id: string
          metadata: Json | null
          occurred_at: string | null
          preventive_action: string | null
          resolution: Json | null
          resolved_at: string | null
          resolved_by: string | null
          root_cause: string | null
          search_vector: unknown
          status: Database["public"]["Enums"]["exception_status"]
          tenant_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_value?: Json | null
          corrective_action?: string | null
          detected_at?: string
          detected_by_event?: string | null
          deviation_amount?: number | null
          deviation_unit?: string | null
          exception_type: Database["public"]["Enums"]["exception_type"]
          expectation_id: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          preventive_action?: string | null
          resolution?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["exception_status"]
          tenant_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_value?: Json | null
          corrective_action?: string | null
          detected_at?: string
          detected_by_event?: string | null
          deviation_amount?: number | null
          deviation_unit?: string | null
          exception_type?: Database["public"]["Enums"]["exception_type"]
          expectation_id?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          preventive_action?: string | null
          resolution?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["exception_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exceptions_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exceptions_expectation_id_fkey"
            columns: ["expectation_id"]
            isOneToOne: false
            referencedRelation: "expectations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exceptions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exceptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expectations: {
        Row: {
          belief_statement: string
          context: Json | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          expectation_type: Database["public"]["Enums"]["expectation_type"]
          expected_at: string | null
          expected_value: Json
          id: string
          search_vector: unknown
          source: string
          superseded_at: string | null
          superseded_by: string | null
          tenant_id: string
          version: number
        }
        Insert: {
          belief_statement: string
          context?: Json | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          expectation_type: Database["public"]["Enums"]["expectation_type"]
          expected_at?: string | null
          expected_value: Json
          id?: string
          search_vector?: unknown
          source: string
          superseded_at?: string | null
          superseded_by?: string | null
          tenant_id: string
          version?: number
        }
        Update: {
          belief_statement?: string
          context?: Json | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          expectation_type?: Database["public"]["Enums"]["expectation_type"]
          expected_at?: string | null
          expected_value?: Json
          id?: string
          search_vector?: unknown
          source?: string
          superseded_at?: string | null
          superseded_by?: string | null
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "expectations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expectations_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "expectations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expectations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_calendar: {
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
      factory_capacity_overrides: {
        Row: {
          capacity_multiplier: number | null
          created_at: string | null
          date: string
          id: string
          reason: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          capacity_multiplier?: number | null
          created_at?: string | null
          date: string
          id?: string
          reason?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          capacity_multiplier?: number | null
          created_at?: string | null
          date?: string
          id?: string
          reason?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factory_capacity_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_holidays: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_recurring: boolean | null
          name: string
          start_date: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_recurring?: boolean | null
          name: string
          start_date: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_recurring?: boolean | null
          name?: string
          start_date?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factory_holidays_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_shifts: {
        Row: {
          active_days: number[] | null
          code: string | null
          color: string | null
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean | null
          name: string
          start_time: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          active_days?: number[] | null
          code?: string | null
          color?: string | null
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          name: string
          start_time: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          active_days?: number[] | null
          code?: string | null
          color?: string | null
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_time?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factory_shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      installed_integrations: {
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
      integrations: {
        Row: {
          banner_url: string | null
          category: Database["public"]["Enums"]["integration_category"]
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
          status: Database["public"]["Enums"]["integration_status"]
          supported_systems: Json | null
          updated_at: string | null
          version: string | null
          webhook_template: Json | null
        }
        Insert: {
          banner_url?: string | null
          category?: Database["public"]["Enums"]["integration_category"]
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
          status?: Database["public"]["Enums"]["integration_status"]
          supported_systems?: Json | null
          updated_at?: string | null
          version?: string | null
          webhook_template?: Json | null
        }
        Update: {
          banner_url?: string | null
          category?: Database["public"]["Enums"]["integration_category"]
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
          status?: Database["public"]["Enums"]["integration_status"]
          supported_systems?: Json | null
          updated_at?: string | null
          version?: string | null
          webhook_template?: Json | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          metadata: Json | null
          role: Database["public"]["Enums"]["app_role"]
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
          role?: Database["public"]["Enums"]["app_role"]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      issue_categories: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          description: string
          id: string
          severity_default: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          description: string
          id?: string
          severity_default?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          description?: string
          id?: string
          severity_default?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issue_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          affected_quantity: number | null
          corrective_action: string | null
          created_at: string | null
          created_by: string
          description: string
          disposition: Database["public"]["Enums"]["ncr_disposition"] | null
          id: string
          image_paths: string[] | null
          issue_type: Database["public"]["Enums"]["issue_type"] | null
          ncr_category: Database["public"]["Enums"]["ncr_category"] | null
          operation_id: string
          preventive_action: string | null
          reported_by_id: string | null
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          root_cause: string | null
          search_vector: unknown
          severity: Database["public"]["Enums"]["issue_severity"]
          status: Database["public"]["Enums"]["issue_status"] | null
          tenant_id: string
          title: string | null
          updated_at: string | null
          verification_required: boolean | null
        }
        Insert: {
          affected_quantity?: number | null
          corrective_action?: string | null
          created_at?: string | null
          created_by: string
          description: string
          disposition?: Database["public"]["Enums"]["ncr_disposition"] | null
          id?: string
          image_paths?: string[] | null
          issue_type?: Database["public"]["Enums"]["issue_type"] | null
          ncr_category?: Database["public"]["Enums"]["ncr_category"] | null
          operation_id: string
          preventive_action?: string | null
          reported_by_id?: string | null
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          root_cause?: string | null
          search_vector?: unknown
          severity: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"] | null
          tenant_id: string
          title?: string | null
          updated_at?: string | null
          verification_required?: boolean | null
        }
        Update: {
          affected_quantity?: number | null
          corrective_action?: string | null
          created_at?: string | null
          created_by?: string
          description?: string
          disposition?: Database["public"]["Enums"]["ncr_disposition"] | null
          id?: string
          image_paths?: string[] | null
          issue_type?: Database["public"]["Enums"]["issue_type"] | null
          ncr_category?: Database["public"]["Enums"]["ncr_category"] | null
          operation_id?: string
          preventive_action?: string | null
          reported_by_id?: string | null
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          root_cause?: string | null
          search_vector?: unknown
          severity?: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"] | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
          verification_required?: boolean | null
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
            foreignKeyName: "issues_reported_by_id_fkey"
            columns: ["reported_by_id"]
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
        ]
      }
      jobs: {
        Row: {
          created_at: string | null
          current_cell_id: string | null
          customer: string | null
          deleted_at: string | null
          deleted_by: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_country: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_postal_code: string | null
          due_date: string | null
          due_date_override: string | null
          external_id: string | null
          external_source: string | null
          id: string
          job_number: string
          metadata: Json | null
          notes: string | null
          package_count: number | null
          search_vector: unknown
          status: Database["public"]["Enums"]["job_status"] | null
          sync_hash: string | null
          synced_at: string | null
          tenant_id: string
          total_volume_m3: number | null
          total_weight_kg: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_cell_id?: string | null
          customer?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_country?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_postal_code?: string | null
          due_date?: string | null
          due_date_override?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          job_number: string
          metadata?: Json | null
          notes?: string | null
          package_count?: number | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["job_status"] | null
          sync_hash?: string | null
          synced_at?: string | null
          tenant_id: string
          total_volume_m3?: number | null
          total_weight_kg?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_cell_id?: string | null
          customer?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_country?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_postal_code?: string | null
          due_date?: string | null
          due_date_override?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          job_number?: string
          metadata?: Json | null
          notes?: string | null
          package_count?: number | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["job_status"] | null
          sync_hash?: string | null
          synced_at?: string | null
          tenant_id?: string
          total_volume_m3?: number | null
          total_weight_kg?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_current_stage_id_fkey"
            columns: ["current_cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
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
      mcp_authentication_keys: {
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
      mcp_endpoints: {
        Row: {
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          id: string
          last_used_at: string | null
          name: string
          tenant_id: string
          token_hash: string
          token_prefix: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          last_used_at?: string | null
          name: string
          tenant_id: string
          token_hash: string
          token_prefix: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          last_used_at?: string | null
          name?: string
          tenant_id?: string
          token_hash?: string
          token_prefix?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_endpoints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_key_usage_logs: {
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
      mcp_server_config: {
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
      mcp_server_health: {
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
      mcp_server_logs: {
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
      monthly_reset_logs: {
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
      mqtt_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          latency_ms: number | null
          mqtt_publisher_id: string
          payload: Json
          success: boolean
          topic: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          latency_ms?: number | null
          mqtt_publisher_id: string
          payload: Json
          success?: boolean
          topic: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          latency_ms?: number | null
          mqtt_publisher_id?: string
          payload?: Json
          success?: boolean
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "mqtt_logs_mqtt_publisher_id_fkey"
            columns: ["mqtt_publisher_id"]
            isOneToOne: false
            referencedRelation: "mqtt_publishers"
            referencedColumns: ["id"]
          },
        ]
      }
      mqtt_publishers: {
        Row: {
          active: boolean | null
          broker_url: string
          created_at: string | null
          created_by: string | null
          default_area: string | null
          default_enterprise: string | null
          default_site: string | null
          description: string | null
          events: string[]
          id: string
          last_connected_at: string | null
          last_error: string | null
          name: string
          password: string | null
          port: number
          tenant_id: string
          topic_pattern: string
          updated_at: string | null
          use_tls: boolean | null
          username: string | null
        }
        Insert: {
          active?: boolean | null
          broker_url: string
          created_at?: string | null
          created_by?: string | null
          default_area?: string | null
          default_enterprise?: string | null
          default_site?: string | null
          description?: string | null
          events?: string[]
          id?: string
          last_connected_at?: string | null
          last_error?: string | null
          name: string
          password?: string | null
          port?: number
          tenant_id: string
          topic_pattern?: string
          updated_at?: string | null
          use_tls?: boolean | null
          username?: string | null
        }
        Update: {
          active?: boolean | null
          broker_url?: string
          created_at?: string | null
          created_by?: string | null
          default_area?: string | null
          default_enterprise?: string | null
          default_site?: string | null
          description?: string | null
          events?: string[]
          id?: string
          last_connected_at?: string | null
          last_error?: string | null
          name?: string
          password?: string | null
          port?: number
          tenant_id?: string
          topic_pattern?: string
          updated_at?: string | null
          use_tls?: boolean | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mqtt_publishers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mqtt_publishers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
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
      operation_day_allocations: {
        Row: {
          cell_id: string
          created_at: string | null
          date: string
          end_time: string
          hours_allocated: number
          id: string
          operation_id: string
          start_time: string
          tenant_id: string
        }
        Insert: {
          cell_id: string
          created_at?: string | null
          date: string
          end_time: string
          hours_allocated: number
          id?: string
          operation_id: string
          start_time: string
          tenant_id: string
        }
        Update: {
          cell_id?: string
          created_at?: string | null
          date?: string
          end_time?: string
          hours_allocated?: number
          id?: string
          operation_id?: string
          start_time?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_day_allocations_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_day_allocations_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_day_allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      operation_quantity_scrap_reasons: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          operation_quantity_id: string
          quantity: number
          scrap_reason_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          operation_quantity_id: string
          quantity?: number
          scrap_reason_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          operation_quantity_id?: string
          quantity?: number
          scrap_reason_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_quantity_scrap_reasons_operation_quantity_id_fkey"
            columns: ["operation_quantity_id"]
            isOneToOne: false
            referencedRelation: "operation_quantities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_quantity_scrap_reasons_scrap_reason_id_fkey"
            columns: ["scrap_reason_id"]
            isOneToOne: false
            referencedRelation: "scrap_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_resources: {
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
      operations: {
        Row: {
          actual_time: number | null
          assigned_operator_id: string | null
          cell_id: string
          changeover_time: number | null
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          estimated_time: number
          external_id: string | null
          external_source: string | null
          icon_name: string | null
          id: string
          metadata: Json | null
          notes: string | null
          operation_name: string
          part_id: string
          planned_end: string | null
          planned_start: string | null
          run_time_per_unit: number | null
          search_vector: unknown
          sequence: number
          setup_time: number | null
          status: Database["public"]["Enums"]["task_status"] | null
          synced_at: string | null
          tenant_id: string
          updated_at: string | null
          wait_time: number | null
        }
        Insert: {
          actual_time?: number | null
          assigned_operator_id?: string | null
          cell_id: string
          changeover_time?: number | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          estimated_time: number
          external_id?: string | null
          external_source?: string | null
          icon_name?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          operation_name: string
          part_id: string
          planned_end?: string | null
          planned_start?: string | null
          run_time_per_unit?: number | null
          search_vector?: unknown
          sequence: number
          setup_time?: number | null
          status?: Database["public"]["Enums"]["task_status"] | null
          synced_at?: string | null
          tenant_id: string
          updated_at?: string | null
          wait_time?: number | null
        }
        Update: {
          actual_time?: number | null
          assigned_operator_id?: string | null
          cell_id?: string
          changeover_time?: number | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          estimated_time?: number
          external_id?: string | null
          external_source?: string | null
          icon_name?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          operation_name?: string
          part_id?: string
          planned_end?: string | null
          planned_start?: string | null
          run_time_per_unit?: number | null
          search_vector?: unknown
          sequence?: number
          setup_time?: number | null
          status?: Database["public"]["Enums"]["task_status"] | null
          synced_at?: string | null
          tenant_id?: string
          updated_at?: string | null
          wait_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operations_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_operator_id_fkey"
            columns: ["assigned_operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_stage_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          employee_id: string
          failed_attempts: number | null
          full_name: string
          id: string
          last_login_at: string | null
          locked_until: string | null
          pin_hash: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          failed_attempts?: number | null
          full_name: string
          id?: string
          last_login_at?: string | null
          locked_until?: string | null
          pin_hash: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          failed_attempts?: number | null
          full_name?: string
          id?: string
          last_login_at?: string | null
          locked_until?: string | null
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
      parts: {
        Row: {
          cnc_program_name: string | null
          created_at: string | null
          current_cell_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          drawing_no: string | null
          external_id: string | null
          external_source: string | null
          file_paths: string[] | null
          height_mm: number | null
          id: string
          image_paths: string[] | null
          is_bullet_card: boolean | null
          job_id: string
          length_mm: number | null
          material: string
          material_cert_number: string | null
          material_lot: string | null
          material_supplier: string | null
          metadata: Json | null
          notes: string | null
          parent_part_id: string | null
          part_number: string
          quantity: number | null
          search_vector: unknown
          status: Database["public"]["Enums"]["job_status"] | null
          sync_hash: string | null
          synced_at: string | null
          tenant_id: string
          updated_at: string | null
          weight_kg: number | null
          width_mm: number | null
        }
        Insert: {
          cnc_program_name?: string | null
          created_at?: string | null
          current_cell_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          drawing_no?: string | null
          external_id?: string | null
          external_source?: string | null
          file_paths?: string[] | null
          height_mm?: number | null
          id?: string
          image_paths?: string[] | null
          is_bullet_card?: boolean | null
          job_id: string
          length_mm?: number | null
          material: string
          material_cert_number?: string | null
          material_lot?: string | null
          material_supplier?: string | null
          metadata?: Json | null
          notes?: string | null
          parent_part_id?: string | null
          part_number: string
          quantity?: number | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["job_status"] | null
          sync_hash?: string | null
          synced_at?: string | null
          tenant_id: string
          updated_at?: string | null
          weight_kg?: number | null
          width_mm?: number | null
        }
        Update: {
          cnc_program_name?: string | null
          created_at?: string | null
          current_cell_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          drawing_no?: string | null
          external_id?: string | null
          external_source?: string | null
          file_paths?: string[] | null
          height_mm?: number | null
          id?: string
          image_paths?: string[] | null
          is_bullet_card?: boolean | null
          job_id?: string
          length_mm?: number | null
          material?: string
          material_cert_number?: string | null
          material_lot?: string | null
          material_supplier?: string | null
          metadata?: Json | null
          notes?: string | null
          parent_part_id?: string | null
          part_number?: string
          quantity?: number | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["job_status"] | null
          sync_hash?: string | null
          synced_at?: string | null
          tenant_id?: string
          updated_at?: string | null
          weight_kg?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_current_stage_id_fkey"
            columns: ["current_cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "parts_parent_part_id_fkey"
            columns: ["parent_part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
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
          role: Database["public"]["Enums"]["app_role"]
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
          role: Database["public"]["Enums"]["app_role"]
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
          role?: Database["public"]["Enums"]["app_role"]
          search_vector?: unknown
          tenant_id?: string
          tour_completed?: boolean | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      resources: {
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
      shipment_jobs: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          delivery_notes: string | null
          delivery_signature: string | null
          id: string
          job_id: string
          loaded_at: string | null
          loaded_by: string | null
          loading_sequence: number | null
          metadata: Json | null
          notes: string | null
          packages_count: number | null
          shipment_id: string
          tenant_id: string
          updated_at: string | null
          volume_m3: number | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          delivery_signature?: string | null
          id?: string
          job_id: string
          loaded_at?: string | null
          loaded_by?: string | null
          loading_sequence?: number | null
          metadata?: Json | null
          notes?: string | null
          packages_count?: number | null
          shipment_id: string
          tenant_id: string
          updated_at?: string | null
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          delivery_signature?: string | null
          id?: string
          job_id?: string
          loaded_at?: string | null
          loaded_by?: string | null
          loading_sequence?: number | null
          metadata?: Json | null
          notes?: string | null
          packages_count?: number | null
          shipment_id?: string
          tenant_id?: string
          updated_at?: string | null
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_jobs_loaded_by_fkey"
            columns: ["loaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_jobs_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          current_volume_m3: number | null
          current_weight_kg: number | null
          description: string | null
          destination_address: string | null
          destination_city: string | null
          destination_country: string | null
          destination_lat: number | null
          destination_lng: number | null
          destination_name: string | null
          destination_postal_code: string | null
          distance_km: number | null
          driver_name: string | null
          driver_phone: string | null
          estimated_arrival: string | null
          estimated_duration_minutes: number | null
          id: string
          items_count: number | null
          max_height_cm: number | null
          max_length_cm: number | null
          max_volume_m3: number | null
          max_weight_kg: number | null
          max_width_cm: number | null
          metadata: Json | null
          name: string | null
          notes: string | null
          origin_address: string | null
          origin_city: string | null
          origin_country: string | null
          origin_lat: number | null
          origin_lng: number | null
          origin_name: string | null
          origin_postal_code: string | null
          route_notes: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          shipment_number: string
          shipping_cost: number | null
          status: Database["public"]["Enums"]["shipment_status"]
          tenant_id: string
          updated_at: string | null
          vehicle_identifier: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Insert: {
          actual_arrival?: string | null
          actual_departure?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          current_volume_m3?: number | null
          current_weight_kg?: number | null
          description?: string | null
          destination_address?: string | null
          destination_city?: string | null
          destination_country?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          destination_postal_code?: string | null
          distance_km?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          estimated_arrival?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          items_count?: number | null
          max_height_cm?: number | null
          max_length_cm?: number | null
          max_volume_m3?: number | null
          max_weight_kg?: number | null
          max_width_cm?: number | null
          metadata?: Json | null
          name?: string | null
          notes?: string | null
          origin_address?: string | null
          origin_city?: string | null
          origin_country?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_name?: string | null
          origin_postal_code?: string | null
          route_notes?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          shipment_number: string
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["shipment_status"]
          tenant_id: string
          updated_at?: string | null
          vehicle_identifier?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Update: {
          actual_arrival?: string | null
          actual_departure?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          current_volume_m3?: number | null
          current_weight_kg?: number | null
          description?: string | null
          destination_address?: string | null
          destination_city?: string | null
          destination_country?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          destination_postal_code?: string | null
          distance_km?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          estimated_arrival?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          items_count?: number | null
          max_height_cm?: number | null
          max_length_cm?: number | null
          max_volume_m3?: number | null
          max_weight_kg?: number | null
          max_width_cm?: number | null
          metadata?: Json | null
          name?: string | null
          notes?: string | null
          origin_address?: string | null
          origin_city?: string | null
          origin_country?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_name?: string | null
          origin_postal_code?: string | null
          route_notes?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          shipment_number?: string
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["shipment_status"]
          tenant_id?: string
          updated_at?: string | null
          vehicle_identifier?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          new_plan: Database["public"]["Enums"]["subscription_plan"] | null
          new_status: Database["public"]["Enums"]["subscription_status"] | null
          old_plan: Database["public"]["Enums"]["subscription_plan"] | null
          old_status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_event_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          new_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          new_status?: Database["public"]["Enums"]["subscription_status"] | null
          old_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          old_status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_event_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          new_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          new_status?: Database["public"]["Enums"]["subscription_status"] | null
          old_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          old_status?: Database["public"]["Enums"]["subscription_status"] | null
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
      substep_template_items: {
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
      substep_templates: {
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
      substeps: {
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
      tenants: {
        Row: {
          abbreviation: string | null
          api_requests_reset_at: string | null
          api_requests_today: number | null
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
          external_feature_flags_config: Json | null
          factory_closing_time: string | null
          factory_opening_time: string | null
          feature_flags: Json | null
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
          plan: Database["public"]["Enums"]["subscription_plan"]
          preferred_payment_method:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_started_at: string | null
          subscription_updated_at: string | null
          timezone: string | null
          trial_end: string | null
          trial_ends_at: string | null
          updated_at: string | null
          use_external_feature_flags: boolean | null
          vat_number: string | null
          whitelabel_app_name: string | null
          whitelabel_enabled: boolean | null
          whitelabel_favicon_url: string | null
          whitelabel_logo_url: string | null
          whitelabel_primary_color: string | null
          working_days_mask: number | null
        }
        Insert: {
          abbreviation?: string | null
          api_requests_reset_at?: string | null
          api_requests_today?: number | null
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
          external_feature_flags_config?: Json | null
          factory_closing_time?: string | null
          factory_opening_time?: string | null
          feature_flags?: Json | null
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
          plan?: Database["public"]["Enums"]["subscription_plan"]
          preferred_payment_method?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_started_at?: string | null
          subscription_updated_at?: string | null
          timezone?: string | null
          trial_end?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          use_external_feature_flags?: boolean | null
          vat_number?: string | null
          whitelabel_app_name?: string | null
          whitelabel_enabled?: boolean | null
          whitelabel_favicon_url?: string | null
          whitelabel_logo_url?: string | null
          whitelabel_primary_color?: string | null
          working_days_mask?: number | null
        }
        Update: {
          abbreviation?: string | null
          api_requests_reset_at?: string | null
          api_requests_today?: number | null
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
          external_feature_flags_config?: Json | null
          factory_closing_time?: string | null
          factory_opening_time?: string | null
          feature_flags?: Json | null
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
          plan?: Database["public"]["Enums"]["subscription_plan"]
          preferred_payment_method?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_started_at?: string | null
          subscription_updated_at?: string | null
          timezone?: string | null
          trial_end?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          use_external_feature_flags?: boolean | null
          vat_number?: string | null
          whitelabel_app_name?: string | null
          whitelabel_enabled?: boolean | null
          whitelabel_favicon_url?: string | null
          whitelabel_logo_url?: string | null
          whitelabel_primary_color?: string | null
          working_days_mask?: number | null
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          created_at: string | null
          duration: number | null
          end_time: string | null
          id: string
          is_paused: boolean | null
          notes: string | null
          operation_id: string
          operator_id: string
          start_time: string
          tenant_id: string
          time_type: string
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          end_time?: string | null
          id?: string
          is_paused?: boolean | null
          notes?: string | null
          operation_id: string
          operator_id: string
          start_time?: string
          tenant_id: string
          time_type?: string
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          end_time?: string | null
          id?: string
          is_paused?: boolean | null
          notes?: string | null
          operation_id?: string
          operator_id?: string
          start_time?: string
          tenant_id?: string
          time_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entry_pauses: {
        Row: {
          created_at: string | null
          duration: number | null
          id: string
          paused_at: string
          resumed_at: string | null
          time_entry_id: string
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          id?: string
          paused_at?: string
          resumed_at?: string | null
          time_entry_id: string
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          id?: string
          paused_at?: string
          resumed_at?: string | null
          time_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entry_pauses_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
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
      webhooks: {
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
    }
    Views: {
      issues_with_context: {
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
          severity: Database["public"]["Enums"]["issue_severity"] | null
          status: Database["public"]["Enums"]["issue_status"] | null
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
    }
    Functions: {
      accept_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: boolean
      }
      acknowledge_demo_mode: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      acknowledge_exception: {
        Args: { p_exception_id: string }
        Returns: undefined
      }
      auto_close_stale_attendance: { Args: never; Returns: number }
      can_create_job: { Args: { p_tenant_id: string }; Returns: boolean }
      can_create_parts: {
        Args: { p_quantity?: number; p_tenant_id: string }
        Returns: boolean
      }
      can_upload_file: {
        Args: { p_file_size_bytes: number; p_tenant_id: string }
        Returns: {
          allowed: boolean
          current_gb: number
          max_gb: number
          reason: string
        }[]
      }
      cancel_invitation: { Args: { p_invitation_id: string }; Returns: boolean }
      check_jobs_due_soon: { Args: never; Returns: number }
      check_mcp_tool_permission: {
        Args: { p_key_id: string; p_tool_name: string }
        Returns: boolean
      }
      check_next_cell_capacity: {
        Args: { current_cell_id: string; tenant_id_param: string }
        Returns: Json
      }
      cleanup_expired_invitations: { Args: never; Returns: number }
      cleanup_old_mqtt_logs: { Args: never; Returns: undefined }
      clear_demo_data: {
        Args: { p_tenant_id: string }
        Returns: {
          deleted_count: number
          message: string
          table_name: string
        }[]
      }
      create_invitation: {
        Args: {
          p_email: string
          p_role?: Database["public"]["Enums"]["app_role"]
          p_tenant_id?: string
        }
        Returns: string
      }
      create_job_completion_expectation: {
        Args: {
          p_created_by?: string
          p_due_date: string
          p_job_id: string
          p_source?: string
          p_tenant_id: string
        }
        Returns: string
      }
      create_mcp_endpoint: {
        Args: { p_name: string; p_tenant_id?: string }
        Returns: {
          endpoint_id: string
          endpoint_name: string
          token: string
          token_prefix: string
        }[]
      }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_metadata?: Json
          p_reference_id?: string
          p_reference_type?: string
          p_severity: string
          p_tenant_id: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_operator_with_pin:
        | {
            Args: { p_employee_id?: string; p_full_name: string; p_pin: string }
            Returns: {
              employee_id: string
              message: string
              operator_id: string
            }[]
          }
        | {
            Args: {
              p_employee_id: string
              p_full_name: string
              p_pin: string
              p_role?: Database["public"]["Enums"]["app_role"]
              p_tenant_id: string
            }
            Returns: string
          }
      delete_tenant_data: { Args: { p_tenant_id: string }; Returns: Json }
      delete_user_account: { Args: never; Returns: Json }
      disable_demo_mode: { Args: { p_tenant_id: string }; Returns: undefined }
      dismiss_exception: {
        Args: { p_exception_id: string; p_reason?: string }
        Returns: undefined
      }
      dismiss_notification: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      dispatch_webhook: {
        Args: { p_data: Json; p_event_type: string; p_tenant_id: string }
        Returns: undefined
      }
      enable_demo_mode: {
        Args: { p_tenant_id: string; p_user_id?: string }
        Returns: undefined
      }
      generate_mcp_key: {
        Args: {
          p_allowed_tools?: Json
          p_created_by?: string
          p_description?: string
          p_environment?: string
          p_name: string
          p_tenant_id: string
        }
        Returns: {
          api_key: string
          key_id: string
          key_prefix: string
        }[]
      }
      generate_shipment_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      generate_sync_hash: { Args: { payload: Json }; Returns: string }
      generate_tenant_abbreviation: {
        Args: { p_name: string }
        Returns: string
      }
      get_activity_logs: {
        Args: {
          p_action?: string
          p_entity_type?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: {
          action: string
          changes: Json
          created_at: string
          description: string
          entity_id: string
          entity_name: string
          entity_type: string
          id: string
          metadata: Json
          user_email: string
          user_name: string
        }[]
      }
      get_activity_stats: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          activities_by_action: Json
          activities_by_entity: Json
          total_activities: number
          unique_users: number
        }[]
      }
      get_api_usage_stats: {
        Args: { p_tenant_id?: string }
        Returns: {
          daily_limit: number
          reset_at: string
          this_month_requests: number
          today_requests: number
        }[]
      }
      get_cell_qrm_metrics: {
        Args: { cell_id_param: string; tenant_id_param: string }
        Returns: Json
      }
      get_cell_wip_count: {
        Args: { cell_id_param: string; tenant_id_param: string }
        Returns: number
      }
      get_exception_stats: {
        Args: { p_tenant_id?: string }
        Returns: {
          acknowledged_count: number
          avg_resolution_time_hours: number
          dismissed_count: number
          open_count: number
          resolved_count: number
          total_count: number
        }[]
      }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          invited_by_name: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          tenant_id: string
          tenant_name: string
        }[]
      }
      get_job_issue_summary: {
        Args: { job_id_param: string }
        Returns: {
          highest_severity: Database["public"]["Enums"]["issue_severity"]
          pending_count: number
          total_count: number
        }[]
      }
      get_mcp_key_stats: {
        Args: { p_key_id: string }
        Returns: {
          avg_response_time_ms: number
          failed_requests: number
          last_24h_requests: number
          most_used_tools: Json
          successful_requests: number
          total_requests: number
        }[]
      }
      get_mcp_server_config: {
        Args: never
        Returns: {
          enabled: boolean
          features: Json
          id: string
          last_connected_at: string
          server_name: string
          server_version: string
          supabase_url: string
        }[]
      }
      get_my_tenant_subscription: {
        Args: never
        Returns: {
          current_jobs: number
          current_parts_this_month: number
          current_storage_gb: number
          max_jobs: number
          max_parts_per_month: number
          max_storage_gb: number
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
        }[]
      }
      get_operation_scrap_analysis: {
        Args: { p_operation_id: string }
        Returns: {
          occurrence_count: number
          percentage_of_total: number
          scrap_reason_category: string
          scrap_reason_code: string
          scrap_reason_description: string
          scrap_reason_id: string
          total_quantity: number
        }[]
      }
      get_operation_total_quantities: {
        Args: { p_operation_id: string }
        Returns: {
          total_good: number
          total_produced: number
          total_rework: number
          total_scrap: number
          yield_percentage: number
        }[]
      }
      get_operator_assignments: {
        Args: { p_operator_id: string }
        Returns: {
          assigned_at: string
          assigned_by_name: string
          assignment_id: string
          customer: string
          job_id: string
          job_number: string
          part_id: string
          part_number: string
          status: string
        }[]
      }
      get_operator_attendance_status: {
        Args: { p_operator_id: string }
        Returns: {
          clock_in_time: string
          current_duration_minutes: number
          is_clocked_in: boolean
          shift_name: string
          target_hours: number
        }[]
      }
      get_part_image_url: {
        Args: { p_expires_in?: number; p_image_path: string }
        Returns: string
      }
      get_part_issue_summary: {
        Args: { part_id_param: string }
        Returns: {
          highest_severity: Database["public"]["Enums"]["issue_severity"]
          pending_count: number
          total_count: number
        }[]
      }
      get_part_routing: {
        Args: { p_part_id: string }
        Returns: {
          actual_hours: number
          cell_id: string
          cell_name: string
          description: string
          estimated_hours: number
          operation_id: string
          operation_number: string
          sequence: number
          status: string
        }[]
      }
      get_storage_quota: {
        Args: never
        Returns: {
          current_mb: number
          is_unlimited: boolean
          max_mb: number
          remaining_mb: number
          used_percentage: number
        }[]
      }
      get_tenant_feature_flags: {
        Args: { p_tenant_id?: string }
        Returns: Json
      }
      get_tenant_info: {
        Args: never
        Returns: {
          company_name: string
          id: string
          name: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
        }[]
      }
      get_tenant_quota: {
        Args: { p_tenant_id: string }
        Returns: {
          current_jobs: number
          current_parts: number
          current_storage: number
          max_jobs: number
          max_parts: number
          max_storage: number
        }[]
      }
      get_tenant_usage_stats: {
        Args: never
        Returns: {
          active_jobs: number
          completed_jobs: number
          parts_this_month: number
          total_admins: number
          total_jobs: number
          total_operators: number
          total_parts: number
        }[]
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_api_usage: {
        Args: { p_api_key_id?: string; p_tenant_id: string }
        Returns: number
      }
      is_demo_mode: { Args: { p_tenant_id: string }; Returns: boolean }
      is_root_admin: { Args: never; Returns: boolean }
      list_all_tenants: {
        Args: never
        Returns: {
          company_name: string
          created_at: string
          id: string
          name: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          user_count: number
        }[]
      }
      list_operators: {
        Args: never
        Returns: {
          active: boolean
          created_at: string
          employee_id: string
          full_name: string
          id: string
          last_login_at: string
          locked_until: string
        }[]
      }
      log_activity_and_webhook: {
        Args: {
          p_action: string
          p_changes?: Json
          p_description: string
          p_entity_id: string
          p_entity_name: string
          p_entity_type: string
          p_metadata?: Json
          p_tenant_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      log_mcp_key_usage: {
        Args: {
          p_error_message?: string
          p_ip_address?: unknown
          p_key_id: string
          p_response_time_ms?: number
          p_success?: boolean
          p_tenant_id: string
          p_tool_arguments?: Json
          p_tool_name: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_mcp_server_activity: {
        Args: {
          p_event_type: string
          p_message: string
          p_metadata?: Json
          p_tenant_id: string
        }
        Returns: string
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      operator_clock_in: {
        Args: { p_notes?: string; p_operator_id: string }
        Returns: string
      }
      operator_clock_out: {
        Args: { p_notes?: string; p_operator_id: string }
        Returns: boolean
      }
      regenerate_mcp_token: {
        Args: { p_endpoint_id: string }
        Returns: {
          endpoint_id: string
          endpoint_name: string
          token: string
          token_prefix: string
        }[]
      }
      reset_monthly_parts_counters: {
        Args: never
        Returns: {
          message: string
          previous_count: number
          success: boolean
          tenant_id: string
        }[]
      }
      reset_operator_pin: {
        Args: { p_new_pin: string; p_operator_id: string }
        Returns: boolean
      }
      resolve_exception: {
        Args: {
          p_corrective_action?: string
          p_exception_id: string
          p_preventive_action?: string
          p_resolution?: Json
          p_root_cause?: string
        }
        Returns: undefined
      }
      seed_default_scrap_reasons: {
        Args: { p_tenant_id: string }
        Returns: {
          inserted_count: number
          message: string
        }[]
      }
      seed_demo_operators: {
        Args: { p_tenant_id: string }
        Returns: {
          created_count: number
          message: string
        }[]
      }
      seed_demo_resources: {
        Args: { p_tenant_id: string }
        Returns: {
          created_count: number
          message: string
        }[]
      }
      set_active_tenant: { Args: { p_tenant_id: string }; Returns: undefined }
      should_show_demo_banner: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      supersede_expectation: {
        Args: {
          p_context?: Json
          p_created_by?: string
          p_expectation_id: string
          p_new_expected_at: string
          p_new_expected_value: Json
          p_source?: string
        }
        Returns: string
      }
      toggle_notification_pin: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      unlock_operator: { Args: { p_operator_id: string }; Returns: boolean }
      update_mcp_server_health: {
        Args: {
          p_error_message?: string
          p_metadata?: Json
          p_response_time_ms?: number
          p_status: string
          p_tenant_id: string
        }
        Returns: string
      }
      update_tenant_feature_flags: {
        Args: { p_flags: Json; p_tenant_id: string }
        Returns: Json
      }
      update_tenant_storage_usage: {
        Args: {
          p_operation?: string
          p_size_bytes: number
          p_tenant_id: string
        }
        Returns: undefined
      }
      validate_mcp_key: {
        Args: { p_api_key: string }
        Returns: {
          allowed_tools: Json
          environment: string
          key_id: string
          rate_limit: number
          tenant_id: string
        }[]
      }
      validate_mcp_token: {
        Args: { p_token: string }
        Returns: {
          endpoint_id: string
          endpoint_name: string
          tenant_id: string
          valid: boolean
        }[]
      }
      verify_operator_pin: {
        Args: { p_employee_id: string; p_pin: string }
        Returns: {
          attempts_remaining: number
          employee_id: string
          error_code: string
          error_message: string
          full_name: string
          locked_until_ts: string
          operator_id: string
          success: boolean
          tenant_id: string
        }[]
      }
    }
    Enums: {
      app_role: "operator" | "admin"
      assignment_status: "assigned" | "accepted" | "in_progress" | "completed"
      exception_status: "open" | "acknowledged" | "resolved" | "dismissed"
      exception_type: "late" | "early" | "non_occurrence" | "exceeded" | "under"
      expectation_type: "completion_time" | "duration" | "quantity" | "delivery"
      integration_category:
        | "erp"
        | "accounting"
        | "crm"
        | "inventory"
        | "shipping"
        | "analytics"
        | "other"
      integration_status: "draft" | "published" | "deprecated" | "archived"
      invoice_payment_status:
        | "pending"
        | "sent"
        | "viewed"
        | "paid"
        | "overdue"
        | "cancelled"
        | "refunded"
      issue_severity: "low" | "medium" | "high" | "critical"
      issue_status: "pending" | "approved" | "rejected" | "closed"
      issue_type: "general" | "ncr"
      job_status: "not_started" | "in_progress" | "completed" | "on_hold"
      ncr_category:
        | "material_defect"
        | "dimensional"
        | "surface_finish"
        | "process_error"
        | "other"
      ncr_disposition: "scrap" | "rework" | "use_as_is" | "return_to_supplier"
      payment_provider: "invoice" | "stripe" | "sumup"
      payment_transaction_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "cancelled"
      payment_transaction_type: "charge" | "refund" | "chargeback" | "dispute"
      shipment_status:
        | "draft"
        | "planned"
        | "loading"
        | "in_transit"
        | "delivered"
        | "cancelled"
      subscription_plan: "free" | "pro" | "premium" | "enterprise"
      subscription_status: "active" | "cancelled" | "suspended" | "trial"
      task_status: "not_started" | "in_progress" | "completed" | "on_hold"
      vehicle_type:
        | "truck"
        | "van"
        | "car"
        | "bike"
        | "freight"
        | "air"
        | "sea"
        | "rail"
        | "other"
      waitlist_status: "pending" | "approved" | "rejected" | "converted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["operator", "admin"],
      assignment_status: ["assigned", "accepted", "in_progress", "completed"],
      exception_status: ["open", "acknowledged", "resolved", "dismissed"],
      exception_type: ["late", "early", "non_occurrence", "exceeded", "under"],
      expectation_type: ["completion_time", "duration", "quantity", "delivery"],
      integration_category: [
        "erp",
        "accounting",
        "crm",
        "inventory",
        "shipping",
        "analytics",
        "other",
      ],
      integration_status: ["draft", "published", "deprecated", "archived"],
      invoice_payment_status: [
        "pending",
        "sent",
        "viewed",
        "paid",
        "overdue",
        "cancelled",
        "refunded",
      ],
      issue_severity: ["low", "medium", "high", "critical"],
      issue_status: ["pending", "approved", "rejected", "closed"],
      issue_type: ["general", "ncr"],
      job_status: ["not_started", "in_progress", "completed", "on_hold"],
      ncr_category: [
        "material_defect",
        "dimensional",
        "surface_finish",
        "process_error",
        "other",
      ],
      ncr_disposition: ["scrap", "rework", "use_as_is", "return_to_supplier"],
      payment_provider: ["invoice", "stripe", "sumup"],
      payment_transaction_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "cancelled",
      ],
      payment_transaction_type: ["charge", "refund", "chargeback", "dispute"],
      shipment_status: [
        "draft",
        "planned",
        "loading",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      subscription_plan: ["free", "pro", "premium", "enterprise"],
      subscription_status: ["active", "cancelled", "suspended", "trial"],
      task_status: ["not_started", "in_progress", "completed", "on_hold"],
      vehicle_type: [
        "truck",
        "van",
        "car",
        "bike",
        "freight",
        "air",
        "sea",
        "rail",
        "other",
      ],
      waitlist_status: ["pending", "approved", "rejected", "converted"],
    },
  },
} as const
