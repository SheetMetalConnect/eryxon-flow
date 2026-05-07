/**
 * Shared types for the MCP server
 *
 * All enum types must match the PostgreSQL enum definitions exactly.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tool handler function signature
 */
export type ToolHandler = (
  args: Record<string, unknown>,
  supabase: SupabaseClient
) => Promise<ToolResult>;

/**
 * Tool result returned by handlers
 */
export interface ToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Tool module interface - each domain exports this
 */
export interface ToolModule {
  /** Tool definitions for this module */
  tools: Tool[];
  /** Map of tool names to their handlers */
  handlers: Map<string, ToolHandler>;
}

/**
 * Job status enum (DB: job_status)
 */
export type JobStatus = "not_started" | "in_progress" | "completed" | "on_hold";

/**
 * Part status enum (DB: job_status — parts reuse the same enum)
 */
export type PartStatus = "not_started" | "in_progress" | "completed" | "on_hold";

/**
 * Operation status enum (DB: task_status)
 */
export type OperationStatus = "not_started" | "in_progress" | "completed" | "on_hold";

/**
 * Issue/NCR status enum (DB: issue_status)
 */
export type IssueStatus = "pending" | "approved" | "rejected" | "closed";

/**
 * Severity level enum (DB: issue_severity)
 */
export type Severity = "low" | "medium" | "high" | "critical";

/**
 * NCR category enum (DB: ncr_category)
 */
export type NCRCategory =
  | "material_defect"
  | "dimensional"
  | "surface_finish"
  | "process_error"
  | "other";

/**
 * NCR disposition enum (DB: ncr_disposition)
 */
export type NCRDisposition =
  | "use_as_is"
  | "rework"
  | "scrap"
  | "return_to_supplier";
