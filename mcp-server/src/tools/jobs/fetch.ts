/**
 * Jobs - Fetch Operations
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, ToolCategory } from "../../types/tools.js";
import { getDatabase } from "../../config/database.js";
import { buildFetchQuery, executeQuery } from "../../lib/query-builder.js";
import { formatDataResponse } from "../../lib/response-formatter.js";

/**
 * Tool definition for fetch_jobs
 */
export const fetchJobsDefinition: Tool = {
  name: "fetch_jobs",
  description: "Fetch jobs from the database with optional filters",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["not_started", "in_progress", "completed", "on_hold"],
        description: "Filter by job status",
      },
      limit: {
        type: "number",
        description: "Maximum number of jobs to return (default: 50)",
      },
    },
  },
};

/**
 * Handler for fetch_jobs
 */
export const fetchJobsHandler: ToolHandler = async (args) => {
  const db = getDatabase();
  const query = buildFetchQuery(db, "jobs", args);
  const data = await executeQuery(query);
  return formatDataResponse(data);
};

/**
 * Export tool configuration
 */
export const fetchJobsTool = {
  definition: fetchJobsDefinition,
  handler: fetchJobsHandler,
  category: ToolCategory.JOBS,
};
