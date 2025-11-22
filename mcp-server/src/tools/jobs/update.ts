/**
 * Jobs - Update Operations
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, ToolCategory } from "../../types/tools.js";
import { getDatabase } from "../../config/database.js";
import { buildUpdateQuery, executeQuery } from "../../lib/query-builder.js";
import { formatUpdateResponse } from "../../lib/response-formatter.js";
import { validateRequired } from "../../lib/error-handler.js";

/**
 * Tool definition for update_job
 */
export const updateJobDefinition: Tool = {
  name: "update_job",
  description: "Update a job's status or properties",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Job ID to update",
      },
      status: {
        type: "string",
        enum: ["not_started", "in_progress", "completed", "on_hold"],
        description: "New job status",
      },
      priority: {
        type: "string",
        enum: ["low", "normal", "high", "urgent"],
        description: "New priority level",
      },
      due_date: {
        type: "string",
        description: "New due date (ISO 8601 format)",
      },
    },
    required: ["id"],
  },
};

/**
 * Handler for update_job
 */
export const updateJobHandler: ToolHandler = async (args) => {
  validateRequired(args, ["id"], "update_job");

  const db = getDatabase();
  const { id, ...updates } = args;

  const query = buildUpdateQuery(db, "jobs", id, updates);
  const data = await executeQuery(query);

  return formatUpdateResponse("Job", data);
};

/**
 * Export tool configuration
 */
export const updateJobTool = {
  definition: updateJobDefinition,
  handler: updateJobHandler,
  category: ToolCategory.JOBS,
};
