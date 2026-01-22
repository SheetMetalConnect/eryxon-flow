/**
 * Shared types for the MCP server
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
 * Job status enum
 */
export type JobStatus = "not_started" | "in_progress" | "completed" | "on_hold";

/**
 * Part status enum
 */
export type PartStatus = "pending" | "in_progress" | "completed" | "on_hold";

/**
 * Task status enum
 */
export type TaskStatus = "pending" | "in_progress" | "completed" | "paused";

/**
 * Operation status enum
 */
export type OperationStatus = "pending" | "in_progress" | "completed" | "on_hold";

/**
 * Issue/NCR status enum
 */
export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

/**
 * Severity level enum
 */
export type Severity = "low" | "medium" | "high" | "critical";

/**
 * Priority level enum
 */
export type Priority = "low" | "normal" | "high" | "urgent";

/**
 * NCR category enum
 */
export type NCRCategory =
  | "material"
  | "process"
  | "equipment"
  | "design"
  | "supplier"
  | "documentation"
  | "other";

/**
 * NCR disposition enum
 */
export type NCRDisposition =
  | "use_as_is"
  | "rework"
  | "repair"
  | "scrap"
  | "return_to_supplier";
