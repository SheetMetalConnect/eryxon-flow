/**
 * Database RPC functions
 * Server-side functions callable via supabase.rpc()
 */

import type { Json } from './base'
import type { DatabaseEnums } from './enums'

export type DatabaseFunctions = {
  accept_invitation: {
    Args: { p_token: string; p_user_id: string }
    Returns: boolean
  }
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
      p_role?: DatabaseEnums["app_role"]
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
  create_operator_with_pin:
    | {
        Args: {
          p_employee_id: string
          p_full_name: string
          p_pin: string
          p_role?: DatabaseEnums["app_role"]
          p_tenant_id: string
        }
        Returns: string
      }
    | {
        Args: { p_employee_id?: string; p_full_name: string; p_pin: string }
        Returns: {
          employee_id: string
          message: string
          operator_id: string
        }[]
      }
  delete_tenant_data: { Args: { p_tenant_id: string }; Returns: Json }
  delete_user_account: { Args: never; Returns: Json }
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
      role: DatabaseEnums["app_role"]
      status: string
      tenant_id: string
      tenant_name: string
    }[]
  }
  get_job_issue_summary: {
    Args: { job_id_param: string }
    Returns: {
      highest_severity: DatabaseEnums["issue_severity"]
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
      plan: DatabaseEnums["subscription_plan"]
      status: DatabaseEnums["subscription_status"]
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
  get_part_image_url: {
    Args: { p_expires_in?: number; p_image_path: string }
    Returns: string
  }
  get_part_issue_summary: {
    Args: { part_id_param: string }
    Returns: {
      highest_severity: DatabaseEnums["issue_severity"]
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
  get_tenant_plan_limits: {
    Args: { p_tenant_id: string }
    Returns: {
      max_jobs: number
      max_parts_per_month: number
      max_storage_gb: number
      plan: DatabaseEnums["subscription_plan"]
      status: DatabaseEnums["subscription_status"]
    }[]
  }
  get_tenant_usage: {
    Args: { p_tenant_id: string }
    Returns: {
      current_jobs: number
      current_parts_this_month: number
      current_storage_gb: number
    }[]
  }
  log_activity: {
    Args: {
      p_action: string
      p_changes?: Json
      p_description?: string
      p_entity_id?: string
      p_entity_name?: string
      p_entity_type?: string
      p_metadata?: Json
    }
    Returns: string
  }
  mark_all_notifications_read: {
    Args: never
    Returns: undefined
  }
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
  toggle_notification_pin: {
    Args: { p_notification_id: string }
    Returns: boolean
  }
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
  verify_operator_pin: {
    Args: { p_employee_id: string; p_pin: string }
    Returns: {
      employee_id: string
      full_name: string
      operator_id: string
      verified: boolean
    }[]
  }
}
