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
          id: string
          image_url: string | null
          name: string
          sequence: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          sequence: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          sequence?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      issues: {
        Row: {
          created_at: string | null
          created_by: string
          description: string
          id: string
          image_paths: string[] | null
          operation_id: string
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: Database["public"]["Enums"]["issue_severity"]
          status: Database["public"]["Enums"]["issue_status"] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description: string
          id?: string
          image_paths?: string[] | null
          operation_id: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string
          id?: string
          image_paths?: string[] | null
          operation_id?: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"] | null
          tenant_id?: string
          updated_at?: string | null
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
          id: string
          notes: string | null
          operation_name: string
          part_id: string
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
          id?: string
          notes?: string | null
          operation_name: string
          part_id: string
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
          id?: string
          notes?: string | null
          operation_name?: string
          part_id?: string
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
          metadata: Json | null
          notes: string | null
          parent_part_id: string | null
          part_number: string
          quantity: number | null
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
          metadata?: Json | null
          notes?: string | null
          parent_part_id?: string | null
          part_number: string
          quantity?: number | null
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
          metadata?: Json | null
          notes?: string | null
          parent_part_id?: string | null
          part_number?: string
          quantity?: number | null
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
          full_name: string
          id: string
          is_machine: boolean | null
          mock_data_imported: boolean | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          tour_completed: boolean | null
          updated_at: string | null
          username: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_machine?: boolean | null
          mock_data_imported?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          tour_completed?: boolean | null
          updated_at?: string | null
          username: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_machine?: boolean | null
          mock_data_imported?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          role?: Database["public"]["Enums"]["app_role"]
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
      substeps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
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
          created_at: string | null
          current_jobs: number | null
          current_parts_this_month: number | null
          current_storage_gb: number | null
          id: string
          last_parts_reset_date: string | null
          max_jobs: number | null
          max_parts_per_month: number | null
          max_storage_gb: number | null
          name: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          subscription_started_at: string | null
          subscription_updated_at: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_email?: string | null
          created_at?: string | null
          current_jobs?: number | null
          current_parts_this_month?: number | null
          current_storage_gb?: number | null
          id?: string
          last_parts_reset_date?: string | null
          max_jobs?: number | null
          max_parts_per_month?: number | null
          max_storage_gb?: number | null
          name: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          subscription_started_at?: string | null
          subscription_updated_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_email?: string | null
          created_at?: string | null
          current_jobs?: number | null
          current_parts_this_month?: number | null
          current_storage_gb?: number | null
          id?: string
          last_parts_reset_date?: string | null
          max_jobs?: number | null
          max_parts_per_month?: number | null
          max_storage_gb?: number | null
          name?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          subscription_started_at?: string | null
          subscription_updated_at?: string | null
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
      [_ in never]: never
    }
    Functions: {
      can_create_job: { Args: { p_tenant_id: string }; Returns: boolean }
      can_create_parts: {
        Args: { p_quantity?: number; p_tenant_id: string }
        Returns: boolean
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
      reset_monthly_parts_counters: {
        Args: never
        Returns: {
          message: string
          previous_count: number
          success: boolean
          tenant_id: string
        }[]
      }
    }
    Enums: {
      app_role: "operator" | "admin"
      assignment_status: "assigned" | "accepted" | "in_progress" | "completed"
      issue_severity: "low" | "medium" | "high" | "critical"
      issue_status: "pending" | "approved" | "rejected" | "closed"
      job_status: "not_started" | "in_progress" | "completed" | "on_hold"
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
      issue_severity: ["low", "medium", "high", "critical"],
      issue_status: ["pending", "approved", "rejected", "closed"],
      job_status: ["not_started", "in_progress", "completed", "on_hold"],
      subscription_plan: ["free", "pro", "premium"],
      subscription_status: ["active", "cancelled", "suspended", "trial"],
      task_status: ["not_started", "in_progress", "completed", "on_hold"],
    },
  },
} as const
