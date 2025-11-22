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
      assignments: {
        Row: {
          assigned_by: string
          created_at: string | null
          id: string
          job_id: string | null
          operator_id: string
          part_id: string | null
          status: Database["public"]["Enums"]["assignment_status"] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_by: string
          created_at?: string | null
          id?: string
          job_id?: string | null
          operator_id: string
          part_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string
          created_at?: string | null
          id?: string
          job_id?: string | null
          operator_id?: string
          part_id?: string | null
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
        ]
      }
      cells: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          enforce_wip_limit: boolean | null
          icon_name: string | null
          id: string
          image_url: string | null
          name: string
          sequence: number
          show_capacity_warning: boolean | null
          tenant_id: string
          updated_at: string | null
          wip_limit: number | null
          wip_warning_threshold: number | null
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          enforce_wip_limit?: boolean | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          name: string
          sequence: number
          show_capacity_warning?: boolean | null
          tenant_id: string
          updated_at?: string | null
          wip_limit?: number | null
          wip_warning_threshold?: number | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          enforce_wip_limit?: boolean | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          name?: string
          sequence?: number
          show_capacity_warning?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          wip_limit?: number | null
          wip_warning_threshold?: number | null
        }
        Relationships: []
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
          due_date: string | null
          due_date_override: string | null
          id: string
          job_number: string
          metadata: Json | null
          notes: string | null
          search_vector: unknown
          status: Database["public"]["Enums"]["job_status"] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_cell_id?: string | null
          customer?: string | null
          due_date?: string | null
          due_date_override?: string | null
          id?: string
          job_number: string
          metadata?: Json | null
          notes?: string | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["job_status"] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_cell_id?: string | null
          customer?: string | null
          due_date?: string | null
          due_date_override?: string | null
          id?: string
          job_number?: string
          metadata?: Json | null
          notes?: string | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["job_status"] | null
          tenant_id?: string
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
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          estimated_time: number
          icon_name: string | null
          id: string
          metadata: Json | null
          notes: string | null
          operation_name: string
          part_id: string
          search_vector: unknown
          sequence: number
          status: Database["public"]["Enums"]["task_status"] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          actual_time?: number | null
          assigned_operator_id?: string | null
          cell_id: string
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          estimated_time: number
          icon_name?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          operation_name: string
          part_id: string
          search_vector?: unknown
          sequence: number
          status?: Database["public"]["Enums"]["task_status"] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          actual_time?: number | null
          assigned_operator_id?: string | null
          cell_id?: string
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          estimated_time?: number
          icon_name?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          operation_name?: string
          part_id?: string
          search_vector?: unknown
          sequence?: number
          status?: Database["public"]["Enums"]["task_status"] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
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
      parts: {
        Row: {
          created_at: string | null
          current_cell_id: string | null
          file_paths: string[] | null
          id: string
          image_paths: string[] | null
          job_id: string
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
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_cell_id?: string | null
          file_paths?: string[] | null
          id?: string
          image_paths?: string[] | null
          job_id: string
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
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_cell_id?: string | null
          file_paths?: string[] | null
          id?: string
          image_paths?: string[] | null
          job_id?: string
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
          tenant_id?: string
          updated_at?: string | null
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
          description: string | null
          id: string
          identifier: string | null
          location: string | null
          metadata: Json | null
          name: string
          status: string | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          identifier?: string | null
          location?: string | null
          metadata?: Json | null
          name: string
          status?: string | null
          tenant_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          identifier?: string | null
          location?: string | null
          metadata?: Json | null
          name?: string
          status?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
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
          billing_email: string | null
          company_name: string | null
          created_at: string | null
          current_jobs: number | null
          current_parts_this_month: number | null
          current_storage_gb: number | null
          demo_data_seeded_at: string | null
          demo_data_seeded_by: string | null
          demo_mode_acknowledged: boolean | null
          demo_mode_enabled: boolean | null
          id: string
          last_parts_reset_date: string | null
          max_jobs: number | null
          max_parts_per_month: number | null
          max_storage_gb: number | null
          name: string
          onboarding_completed_at: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          subscription_started_at: string | null
          subscription_updated_at: string | null
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_email?: string | null
          company_name?: string | null
          created_at?: string | null
          current_jobs?: number | null
          current_parts_this_month?: number | null
          current_storage_gb?: number | null
          demo_data_seeded_at?: string | null
          demo_data_seeded_by?: string | null
          demo_mode_acknowledged?: boolean | null
          demo_mode_enabled?: boolean | null
          id?: string
          last_parts_reset_date?: string | null
          max_jobs?: number | null
          max_parts_per_month?: number | null
          max_storage_gb?: number | null
          name: string
          onboarding_completed_at?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          subscription_started_at?: string | null
          subscription_updated_at?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_email?: string | null
          company_name?: string | null
          created_at?: string | null
          current_jobs?: number | null
          current_parts_this_month?: number | null
          current_storage_gb?: number | null
          demo_data_seeded_at?: string | null
          demo_data_seeded_by?: string | null
          demo_mode_acknowledged?: boolean | null
          demo_mode_enabled?: boolean | null
          id?: string
          last_parts_reset_date?: string | null
          max_jobs?: number | null
          max_parts_per_month?: number | null
          max_storage_gb?: number | null
          name?: string
          onboarding_completed_at?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          subscription_started_at?: string | null
          subscription_updated_at?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
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
      acknowledge_demo_mode: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
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
      check_jobs_due_soon: { Args: never; Returns: number }
      check_next_cell_capacity: {
        Args: { current_cell_id: string; tenant_id_param: string }
        Returns: Json
      }
      cleanup_expired_invitations: { Args: never; Returns: number }
      create_invitation: {
        Args: {
          p_email: string
          p_role?: Database["public"]["Enums"]["app_role"]
          p_tenant_id?: string
        }
        Returns: string
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
      disable_demo_mode: { Args: { p_tenant_id: string }; Returns: undefined }
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
      get_cell_qrm_metrics: {
        Args: { cell_id_param: string; tenant_id_param: string }
        Returns: Json
      }
      get_cell_wip_count: {
        Args: { cell_id_param: string; tenant_id_param: string }
        Returns: number
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
          actual_time: number
          cell_id: string
          cell_name: string
          completed_at: string
          estimated_time: number
          operation_id: string
          operation_name: string
          sequence: number
          status: Database["public"]["Enums"]["task_status"]
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
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
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
      seed_default_scrap_reasons: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      seed_demo_operators: { Args: { p_tenant_id: string }; Returns: undefined }
      seed_demo_resources: { Args: { p_tenant_id: string }; Returns: undefined }
      set_active_tenant: { Args: { p_tenant_id: string }; Returns: undefined }
      should_show_demo_banner: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      toggle_notification_pin: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      update_tenant_storage_usage: {
        Args: {
          p_operation?: string
          p_size_bytes: number
          p_tenant_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "operator" | "admin"
      assignment_status: "assigned" | "accepted" | "in_progress" | "completed"
      integration_category:
        | "erp"
        | "accounting"
        | "crm"
        | "inventory"
        | "shipping"
        | "analytics"
        | "other"
      integration_status: "draft" | "published" | "deprecated" | "archived"
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
      subscription_plan: "free" | "pro" | "premium"
      subscription_status: "active" | "cancelled" | "suspended" | "trial"
      task_status: "not_started" | "in_progress" | "completed" | "on_hold"
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
      subscription_plan: ["free", "pro", "premium"],
      subscription_status: ["active", "cancelled", "suspended", "trial"],
      task_status: ["not_started", "in_progress", "completed", "on_hold"],
    },
  },
} as const
