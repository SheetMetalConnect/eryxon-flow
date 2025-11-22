/**
 * Tool Type Definitions
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Tool handler function signature
 */
export type ToolHandler = (args: any) => Promise<ToolResponse>;

/**
 * Tool response format
 */
export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Tool definition with handler
 */
export interface ToolDefinition {
  definition: Tool;
  handler: ToolHandler;
}

/**
 * Tool category for organization
 */
export enum ToolCategory {
  JOBS = "jobs",
  PARTS = "parts",
  TASKS = "tasks",
  ISSUES = "issues",
  NCRS = "ncrs",
  OPERATIONS = "operations",
  METRICS = "metrics",
}

/**
 * Query filter options
 */
export interface QueryFilters {
  status?: string;
  limit?: number;
  [key: string]: any;
}

/**
 * Update operation result
 */
export interface UpdateResult {
  success: boolean;
  data?: any;
  error?: string;
}
