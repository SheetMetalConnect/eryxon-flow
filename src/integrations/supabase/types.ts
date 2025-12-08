/**
 * Supabase Database Types
 *
 * This file re-exports from the modular types structure for backward compatibility.
 * The types are now organized in smaller, domain-focused files under ./types/
 *
 * For new code, you can import directly from the modular structure:
 * ```tsx
 * import type { Tables, TablesInsert } from '@/integrations/supabase/types'
 * ```
 *
 * Module structure:
 * - types/base.ts: Json type, InternalSupabaseConfig
 * - types/enums.ts: All database enums + EnumConstants
 * - types/tables/: Domain-grouped table definitions
 *   - core.ts: tenants, profiles, user_roles, invitations
 *   - jobs.ts: jobs, parts, operations, cells, assignments
 *   - issues.ts: issues, issue_categories, scrap_reasons
 *   - time-tracking.ts: time_entries, operation_quantities, etc.
 *   - billing.ts: billing_waitlist, subscription_events
 *   - integrations.ts: api_keys, webhooks, integrations, etc.
 *   - mcp.ts: MCP server tables
 *   - mqtt.ts: MQTT publisher tables
 *   - shipping.ts: shipments, shipment_jobs
 *   - resources.ts: resources, operators, materials
 *   - activity.ts: activity_log, notifications
 *   - calendar.ts: factory_calendar
 *   - substeps.ts: substeps and templates
 * - types/views.ts: Database views
 * - types/functions.ts: RPC functions
 * - types/helpers.ts: Tables<>, TablesInsert<>, TablesUpdate<>, Enums<>
 * - types/database.ts: Main Database type combining all modules
 */

// Re-export everything from the modular structure
export type {
  Json,
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
  DatabaseEnums,
  DatabaseViews,
  DatabaseFunctions,
} from './types'

export { EnumConstants } from './types'

// Backward compatibility: Export Constants in the original format
import { EnumConstants } from './types'

export const Constants = {
  public: {
    Enums: EnumConstants,
  },
} as const
