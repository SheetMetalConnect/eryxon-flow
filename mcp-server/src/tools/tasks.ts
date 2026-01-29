/**
 * Tasks domain tools
 * Handles task queries and assignments
 */

import type { ToolModule, ToolHandler } from "../types/index.js";
import { z } from "zod";
import { schemas } from "../utils/validation.js";
import { createFetchTool, createUpdateTool } from "../utils/tool-factories.js";

// Fetch tasks with joins and filters
const { tool: fetchTasksTool, handler: fetchTasksHandler } = createFetchTool({
  tableName: 'tasks',
  description: 'Fetch tasks from the database with optional filters and pagination',
  selectFields: '*, parts(part_number), profiles(full_name)',
  filterFields: {
    part_id: schemas.id.optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'paused']).optional(),
    assigned_to: schemas.id.optional(),
  },
  orderBy: { column: 'created_at', ascending: false },
});

// Update task
const { tool: updateTaskTool, handler: updateTaskHandler } = createUpdateTool({
  tableName: 'tasks',
  description: "Update a task's status or properties",
  resourceName: 'task',
  updateSchema: z.object({
    id: schemas.id,
    status: z.enum(['pending', 'in_progress', 'completed', 'paused']).optional(),
    assigned_to: schemas.id.optional(),
  }),
});

// Export module
export const tasksModule: ToolModule = {
  tools: [fetchTasksTool, updateTaskTool],
  handlers: new Map<string, ToolHandler>([
    ['fetch_tasks', fetchTasksHandler],
    ['update_task', updateTaskHandler],
  ]),
};
