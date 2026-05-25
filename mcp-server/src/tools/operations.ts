/**
 * Operations domain tools
 * Handles operation lifecycle and management
 *
 * Schema uses task_status enum: not_started, in_progress, completed, on_hold
 * Timestamp columns: created_at, updated_at, completed_at, synced_at, deleted_at
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
  description: 'Start an operation (changes status to in_progress)',
  newStatus: 'in_progress',
  validTransitions: {
    'not_started': ['in_progress'],
    'on_hold': ['in_progress'],
  },
});

// Pause operation (status transition)
const { tool: pauseOperationTool, handler: pauseOperationHandler } = createStatusTransitionTool({
  tableName: 'operations',
  toolName: 'pause_operation',
  description: 'Pause an operation (changes status to on_hold)',
  newStatus: 'on_hold',
  validTransitions: {
    'in_progress': ['on_hold'],
  },
});

// Complete operation (status transition)
const { tool: completeOperationTool, handler: completeOperationHandler } = createStatusTransitionTool({
  tableName: 'operations',
  toolName: 'complete_operation',
  description: 'Complete an operation (changes status to completed)',
  newStatus: 'completed',
  timestampField: 'completed_at',
  additionalFields: { completion_percentage: 100 },
  validTransitions: {
    'in_progress': ['completed'],
    'on_hold': ['completed'],
  },
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
