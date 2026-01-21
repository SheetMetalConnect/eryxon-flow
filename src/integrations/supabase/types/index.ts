/**
 * Supabase types barrel export
 *
 * This modular structure allows AI agents to work with smaller, focused files
 * instead of a single massive types file. Each domain has its own file:
 *
 * - base.ts: Json type and InternalSupabaseConfig
 * - enums.ts: All database enums + EnumConstants
 * - tables/: Domain-grouped table definitions
 *   - core.ts: tenants, profiles, user_roles, invitations
 *   - jobs.ts: jobs, parts, operations, cells, assignments
 *   - issues.ts: issues, issue_categories, scrap_reasons
 *   - time-tracking.ts: time_entries, operation_quantities, etc.
 *   - billing.ts: billing_waitlist, subscription_events
 *   - integrations.ts: api_keys, webhooks, integrations, etc.
 *   - mcp.ts: MCP server tables
 *   - mqtt.ts: MQTT publisher tables
 *   - resources.ts: resources, operators, materials
 *   - activity.ts: activity_log, notifications
 *   - calendar.ts: factory_calendar
 *   - substeps.ts: substeps and templates
 * - views.ts: Database views
 * - functions.ts: RPC functions
 * - helpers.ts: Tables<>, TablesInsert<>, TablesUpdate<>, Enums<>
 * - database.ts: Main Database type combining all modules
 *
 * Usage:
 * ```tsx
 * import type { Database, Tables, TablesInsert } from '@/integrations/supabase/types'
 *
 * type Job = Tables<'jobs'>
 * type JobInsert = TablesInsert<'jobs'>
 * ```
 */

// Main Database type
export type { Database, Json } from './database'

// Helper types for common operations
export type { Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes } from './helpers'

// Enum types and constants
export type { DatabaseEnums } from './enums'
export { EnumConstants } from './enums'

// Backward compatibility: Constants.public.Enums structure
export const Constants = {
  public: {
    Enums: {} as typeof import('./enums').EnumConstants
  }
} as const

// Initialize Constants at runtime
import { EnumConstants as EC } from './enums'
;(Constants.public as any).Enums = EC

// Re-export all table types for direct access if needed
export * from './tables'

// Re-export view types
export type { DatabaseViews, IssuesWithContextView } from './views'

// Re-export function types
export type { DatabaseFunctions } from './functions'
