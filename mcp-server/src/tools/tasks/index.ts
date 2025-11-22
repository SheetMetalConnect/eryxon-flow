/**
 * Tasks Tools
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, ToolCategory } from "../../types/tools.js";
import { getDatabase } from "../../config/database.js";
import { buildFetchQuery, buildUpdateQuery, executeQuery } from "../../lib/query-builder.js";
import { formatDataResponse, formatUpdateResponse } from "../../lib/response-formatter.js";
import { validateRequired } from "../../lib/error-handler.js";

/**
 * Fetch Tasks Tool
 */
const fetchTasksDefinition: Tool = {
  name: "fetch_tasks",
  description: "Fetch tasks from the database with optional filters",
  inputSchema: {
    type: "object",
    properties: {
      part_id: {
        type: "string",
        description: "Filter by part ID",
      },
      status: {
        type: "string",
        enum: ["pending", "in_progress", "completed", "paused"],
        description: "Filter by task status",
      },
      assigned_to: {
        type: "string",
        description: "Filter by assigned user ID",
      },
      limit: {
        type: "number",
        description: "Maximum number of tasks to return (default: 50)",
      },
    },
  },
};

const fetchTasksHandler: ToolHandler = async (args) => {
  const db = getDatabase();
  const query = buildFetchQuery(
    db,
    "tasks",
    args,
    "*, parts(part_number), profiles(full_name)"
  );
  const data = await executeQuery(query);
  return formatDataResponse(data);
};

/**
 * Update Task Tool
 */
const updateTaskDefinition: Tool = {
  name: "update_task",
  description: "Update a task's status or assigned user",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Task ID to update",
      },
      status: {
        type: "string",
        enum: ["pending", "in_progress", "completed", "paused"],
        description: "New task status",
      },
      assigned_to: {
        type: "string",
        description: "User ID to assign the task to",
      },
    },
    required: ["id"],
  },
};

const updateTaskHandler: ToolHandler = async (args) => {
  validateRequired(args, ["id"], "update_task");

  const db = getDatabase();
  const { id, ...updates } = args;

  const query = buildUpdateQuery(db, "tasks", id, updates);
  const data = await executeQuery(query);

  return formatUpdateResponse("Task", data);
};

/**
 * Export all task tools
 */
export const taskTools = [
  {
    definition: fetchTasksDefinition,
    handler: fetchTasksHandler,
    category: ToolCategory.TASKS,
  },
  {
    definition: updateTaskDefinition,
    handler: updateTaskHandler,
    category: ToolCategory.TASKS,
  },
];
