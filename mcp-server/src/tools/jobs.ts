/**
 * Jobs domain tools (REFACTORED with 2025 best practices)
 * Handles job CRUD operations and lifecycle management
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolModule, ToolHandler } from "../types/index.js";
import { z } from "zod";
import { schemas, validateArgs } from "../utils/validation.js";
import { structuredResponse, paginatedResponse, errorResponse } from "../utils/response.js";
import { createFetchTool, createStatusTransitionTool } from "../utils/tool-factories.js";
import { databaseError, notFoundError } from "../utils/errors.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const fetchJobsSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled']).optional(),
  customer: z.string().optional(),
  limit: schemas.limit,
  offset: schemas.offset,
});

const createJobSchema = z.object({
  customer_name: z.string().min(1, 'Customer name required'),
  job_number: z.string().min(1, 'Job number required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  due_date: z.string().datetime().optional(),
});

const updateJobSchema = z.object({
  id: schemas.id,
  status: z.enum(['pending', 'in_progress', 'completed', 'on_hold']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  due_date: z.string().datetime().optional(),
});

// ============================================================================
// TOOLS USING FACTORIES
// ============================================================================

// Fetch tool with pagination
const { tool: fetchJobsTool, handler: fetchJobsHandler } = createFetchTool({
  tableName: 'jobs',
  description: 'Fetch jobs from the database with optional filters and pagination',
  filterFields: {
    status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold']).optional(),
    customer: z.string().optional(),
  },
  orderBy: { column: 'created_at', ascending: false },
});

// Status transition tools
const { tool: startJobTool, handler: startJobHandler } = createStatusTransitionTool({
  tableName: 'jobs',
  description: 'Start a job (changes status to in_progress and tracks start time)',
  newStatus: 'in_progress',
  timestampField: 'started_at',
  additionalFields: {
    paused_at: null,
  },
  validTransitions: {
    'not_started': ['in_progress'],
    'on_hold': ['in_progress'],
  },
});

const { tool: stopJobTool, handler: stopJobHandler } = createStatusTransitionTool({
  tableName: 'jobs',
  description: 'Stop/pause a job (changes status to on_hold)',
  newStatus: 'on_hold',
  timestampField: 'paused_at',
  validTransitions: {
    'in_progress': ['on_hold'],
  },
});

const { tool: completeJobTool, handler: completeJobHandler } = createStatusTransitionTool({
  tableName: 'jobs',
  description: 'Complete a job (changes status to completed, calculates duration)',
  newStatus: 'completed',
  timestampField: 'completed_at',
  validTransitions: {
    'in_progress': ['completed'],
    'on_hold': ['completed'],
  },
});

const { tool: resumeJobTool, handler: resumeJobHandler } = createStatusTransitionTool({
  tableName: 'jobs',
  description: 'Resume a paused job (changes status back to in_progress)',
  newStatus: 'in_progress',
  timestampField: 'resumed_at',
  additionalFields: {
    paused_at: null,
  },
  validTransitions: {
    'on_hold': ['in_progress'],
  },
});

// ============================================================================
// CUSTOM TOOLS (not factorized)
// ============================================================================

const createJobTool: Tool = {
  name: "create_job",
  description: "Create a new job with validation",
  inputSchema: {
    type: "object",
    properties: {
      customer_name: { type: "string", description: "Customer name" },
      job_number: { type: "string", description: "Job number/identifier" },
      description: { type: "string", description: "Job description" },
      priority: { type: "string", enum: ["low", "normal", "high", "urgent"], description: "Job priority" },
      due_date: { type: "string", description: "Due date (ISO 8601 format)" },
    },
    required: ["customer_name", "job_number"],
  },
};

const createJobHandler: ToolHandler = async (args, supabase) => {
  try {
    const validated = validateArgs(args, createJobSchema);

    const { data, error } = await supabase
      .from("jobs")
      .insert([validated])
      .select()
      .single();

    if (error) {
      throw databaseError('Failed to create job', error as Error);
    }

    return structuredResponse(data, "Job created successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const updateJobTool: Tool = {
  name: "update_job",
  description: "Update a job's status or properties with validation",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Job ID to update" },
      status: { type: "string", enum: ["pending", "in_progress", "completed", "on_hold"], description: "New status" },
      priority: { type: "string", enum: ["low", "normal", "high", "urgent"], description: "New priority" },
      due_date: { type: "string", description: "New due date (ISO 8601 format)" },
    },
    required: ["id"],
  },
};

const updateJobHandler: ToolHandler = async (args, supabase) => {
  try {
    const validated = validateArgs(args, updateJobSchema);
    const { id, ...updates } = validated;

    const { data, error } = await supabase
      .from("jobs")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw notFoundError('job', id);
      }
      throw databaseError('Failed to update job', error as Error);
    }

    return structuredResponse(data, "Job updated successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

// ============================================================================
// MODULE EXPORTS
// ============================================================================

const tools: Tool[] = [
  fetchJobsTool,
  createJobTool,
  updateJobTool,
  startJobTool,
  stopJobTool,
  completeJobTool,
  resumeJobTool,
];

const handlers = new Map<string, ToolHandler>([
  ["fetch_jobs", fetchJobsHandler],
  ["create_job", createJobHandler],
  ["update_job", updateJobHandler],
  ["start_job", startJobHandler],
  ["stop_job", stopJobHandler],
  ["complete_job", completeJobHandler],
  ["resume_job", resumeJobHandler],
]);

export const jobsModule: ToolModule = {
  tools,
  handlers,
};
