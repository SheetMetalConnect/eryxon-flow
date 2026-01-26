/**
 * Main Database type
 * Combines all modular type definitions into the complete Database interface
 */

import type { Json, InternalSupabaseConfig } from './base'
import type { DatabaseEnums } from './enums'
import type { DatabaseViews } from './views'
import type { DatabaseFunctions } from './functions'

// Import all table types
import type {
  TenantsTable,
  ProfilesTable,
  UserRolesTable,
  InvitationsTable,
} from './tables/core'
import type {
  JobsTable,
  PartsTable,
  OperationsTable,
  CellsTable,
  AssignmentsTable,
} from './tables/jobs'
import type {
  IssuesTable,
  IssueCategoriesTable,
  ScrapReasonsTable,
} from './tables/issues'
import type {
  TimeEntriesTable,
  TimeEntryPausesTable,
  OperationQuantitiesTable,
  OperationDayAllocationsTable,
} from './tables/time-tracking'
import type {
  ApiKeysTable,
  WebhooksTable,
  WebhookLogsTable,
  IntegrationsTable,
  InstalledIntegrationsTable,
} from './tables/integrations'
import type {
  McpAuthenticationKeysTable,
  McpKeyUsageLogsTable,
  McpServerConfigTable,
  McpServerHealthTable,
  McpServerLogsTable,
} from './tables/mcp'
import type {
  MqttPublishersTable,
  MqttLogsTable,
} from './tables/mqtt'
import type {
  ResourcesTable,
  OperationResourcesTable,
  OperatorsTable,
  MaterialsTable,
} from './tables/resources'
import type {
  ActivityLogTable,
  NotificationsTable,
} from './tables/activity'
import type {
  FactoryCalendarTable,
} from './tables/calendar'
import type {
  SubstepsTable,
  SubstepTemplatesTable,
  SubstepTemplateItemsTable,
} from './tables/substeps'

/**
 * Complete Database type for Supabase client
 * This is the main type used with createClient<Database>()
 */
export type Database = {
  __InternalSupabase: InternalSupabaseConfig
  public: {
    Tables: {
      // Core tables
      tenants: TenantsTable
      profiles: ProfilesTable
      user_roles: UserRolesTable
      invitations: InvitationsTable

      // Jobs domain
      jobs: JobsTable
      parts: PartsTable
      operations: OperationsTable
      cells: CellsTable
      assignments: AssignmentsTable

      // Issues domain
      issues: IssuesTable
      issue_categories: IssueCategoriesTable
      scrap_reasons: ScrapReasonsTable

      // Time tracking domain
      time_entries: TimeEntriesTable
      time_entry_pauses: TimeEntryPausesTable
      operation_quantities: OperationQuantitiesTable
      operation_day_allocations: OperationDayAllocationsTable

      // Integrations domain
      api_keys: ApiKeysTable
      webhooks: WebhooksTable
      webhook_logs: WebhookLogsTable
      integrations: IntegrationsTable
      installed_integrations: InstalledIntegrationsTable

      // MCP domain
      mcp_authentication_keys: McpAuthenticationKeysTable
      mcp_key_usage_logs: McpKeyUsageLogsTable
      mcp_server_config: McpServerConfigTable
      mcp_server_health: McpServerHealthTable
      mcp_server_logs: McpServerLogsTable

      // MQTT domain
      mqtt_publishers: MqttPublishersTable
      mqtt_logs: MqttLogsTable

      // Resources domain
      resources: ResourcesTable
      operation_resources: OperationResourcesTable
      operators: OperatorsTable
      materials: MaterialsTable

      // Activity domain
      activity_log: ActivityLogTable
      notifications: NotificationsTable

      // Calendar domain
      factory_calendar: FactoryCalendarTable

      // Substeps domain
      substeps: SubstepsTable
      substep_templates: SubstepTemplatesTable
      substep_template_items: SubstepTemplateItemsTable
    }
    Views: DatabaseViews
    Functions: DatabaseFunctions
    Enums: DatabaseEnums
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Re-export Json for convenience
export type { Json }
