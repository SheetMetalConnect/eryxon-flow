/**
 * Operations domain tools
 * Handles operation lifecycle and management
 */

import type { ToolModule, ToolHandler } from "../types/index.js";
import { z } from "zod";
import { schemas } from "../utils/validation.js";
import { createFetchTool, createUpdateTool, createStatusTransitionTool } from "../utils/tool-factories.js";

// Fetch operations with joins and filters
const { tool: fetchOperationsTool, handler: fetchOperationsHandler } = createFetchTool({
  tableName: 'operations',
  description: 'Fetch operations from the database with optional filters and pagination',
  selectFields: '*, parts(part_number, jobs(job_number))',
  filterFields: {
    part_id: schemas.id.optional(),
    status: schemas.operationStatus.optional(),
    cell_id: schemas.id.optional(),
  },
  orderBy: { column: 'created_at', ascending: false },
});

// Start operation (status transition)
const { tool: startOperationTool, handler: startOperationHandler } = createStatusTransitionTool({
  tableName: 'operations',
  toolName: 'start_operation',
  description: 'Start an operation (changes status to in_progress, creates time entry)',
  newStatus: 'in_progress',
  timestampField: 'started_at',
  additionalFields: { paused_at: null },
});

// Pause operation (status transition)
const { tool: pauseOperationTool, handler: pauseOperationHandler } = createStatusTransitionTool({
  tableName: 'operations',
  toolName: 'pause_operation',
  description: 'Pause an operation (changes status to on_hold, ends time entry)',
  newStatus: 'on_hold',
  timestampField: 'paused_at',
});

// Complete operation (status transition)
const { tool: completeOperationTool, handler: completeOperationHandler } = createStatusTransitionTool({
  tableName: 'operations',
  toolName: 'complete_operation',
  description: 'Complete an operation (changes status to completed, ends time entry)',
  newStatus: 'completed',
  timestampField: 'completed_at',
  additionalFields: { completion_percentage: 100 },
});

// Update operation
const { tool: updateOperationTool, handler: updateOperationHandler } = createUpdateTool({
  tableName: 'operations',
  description: "Update an operation's properties",
  resourceName: 'operation',
  updateSchema: z.object({
    id: schemas.id,
    status: schemas.operationStatus.optional(),
    completion_percentage: z.number().min(0).max(100).optional(),
    notes: z.string().optional(),
  }),
});

// Export module
export const operationsModule: ToolModule = {
  tools: [
    fetchOperationsTool,
    startOperationTool,
    pauseOperationTool,
    completeOperationTool,
    updateOperationTool,
  ],
  handlers: new Map<string, ToolHandler>([
    ['fetch_operations', fetchOperationsHandler],
    ['start_operation', startOperationHandler],
    ['pause_operation', pauseOperationHandler],
    ['complete_operation', completeOperationHandler],
    ['update_operation', updateOperationHandler],
  ]),
};
