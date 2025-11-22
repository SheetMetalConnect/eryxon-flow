/**
 * Jobs - Create Operations
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, ToolCategory } from "../../types/tools.js";
import { getDatabase } from "../../config/database.js";
import { buildCreateQuery, executeQuery } from "../../lib/query-builder.js";
import { formatCreateResponse } from "../../lib/response-formatter.js";
import { validateRequired } from "../../lib/error-handler.js";

/**
 * Tool definition for create_job
 */
export const createJobDefinition: Tool = {
  name: "create_job",
  description: "Create a new job in the system",
  inputSchema: {
    type: "object",
    properties: {
      job_number: {
        type: "string",
        description: "Unique job number/identifier",
      },
      customer_name: {
        type: "string",
        description: "Customer name for this job",
      },
      description: {
        type: "string",
        description: "Job description",
      },
      status: {
        type: "string",
        enum: ["not_started", "in_progress", "completed", "on_hold"],
        description: "Initial job status (default: not_started)",
      },
      priority: {
        type: "string",
        enum: ["low", "normal", "high", "urgent"],
        description: "Priority level (default: normal)",
      },
      due_date: {
        type: "string",
        description: "Due date (ISO 8601 format)",
      },
    },
    required: ["job_number", "customer_name"],
  },
};

/**
 * Handler for create_job
 */
export const createJobHandler: ToolHandler = async (args) => {
  validateRequired(args, ["job_number", "customer_name"], "create_job");

  const db = getDatabase();

  // Set defaults
  const jobData = {
    ...args,
    status: args.status || "not_started",
    priority: args.priority || "normal",
  };

  const query = buildCreateQuery(db, "jobs", jobData);
  const data = await executeQuery(query);

  return formatCreateResponse("Job", data);
};

/**
 * Export tool configuration
 */
export const createJobTool = {
  definition: createJobDefinition,
  handler: createJobHandler,
  category: ToolCategory.JOBS,
};
