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
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold']).optional(),
  customer: z.string().optional(),
  limit: schemas.limit,
  offset: schemas.offset,
});

const createJobSchema = z.object({
  customer: z.string().min(1, 'Customer name required'),
  job_number: z.string().min(1, 'Job number required'),
  notes: z.string().optional(),
  due_date: z.string().datetime().optional(),
});

const updateJobSchema = z.object({
  id: schemas.id,
  status: schemas.jobStatus.optional(),
  notes: z.string().optional(),
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
    status: schemas.jobStatus.optional(),
    customer: z.string().optional(),
  },
  orderBy: { column: 'created_at', ascending: false },
});

// Status transition tools
// Note: jobs table only has status, created_at, updated_at — no dedicated timestamp fields
const { tool: startJobTool, handler: startJobHandler } = createStatusTransitionTool({
  tableName: 'jobs',
  toolName: 'start_job',
  description: 'Start a job (changes status to in_progress)',
  newStatus: 'in_progress',
  validTransitions: {
    'not_started': ['in_progress'],
    'on_hold': ['in_progress'],
  },
});

const { tool: stopJobTool, handler: stopJobHandler } = createStatusTransitionTool({
  tableName: 'jobs',
  toolName: 'stop_job',
  description: 'Stop/pause a job (changes status to on_hold)',
  newStatus: 'on_hold',
  validTransitions: {
    'in_progress': ['on_hold'],
  },
});

const { tool: completeJobTool, handler: completeJobHandler } = createStatusTransitionTool({
  tableName: 'jobs',
  toolName: 'complete_job',
  description: 'Complete a job (changes status to completed)',
  newStatus: 'completed',
  validTransitions: {
    'in_progress': ['completed'],
    'on_hold': ['completed'],
  },
});

const { tool: resumeJobTool, handler: resumeJobHandler } = createStatusTransitionTool({
  tableName: 'jobs',
  toolName: 'resume_job',
  description: 'Resume a paused job (changes status back to in_progress)',
  newStatus: 'in_progress',
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
      customer: { type: "string", description: "Customer name" },
      job_number: { type: "string", description: "Job number/identifier" },
      notes: { type: "string", description: "Job notes" },
      due_date: { type: "string", description: "Due date (ISO 8601 format)" },
    },
    required: ["customer", "job_number"],
  },
};

const createJobHandler: ToolHandler = async (args, supabase) => {
  try {
    const validated = validateArgs(args, createJobSchema);

    // Include tenant_id if configured (required by NOT NULL constraint)
    const insertData = process.env.TENANT_ID
      ? { ...validated, tenant_id: process.env.TENANT_ID }
      : validated;

    const { data, error } = await supabase
      .from("jobs")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      throw databaseError(`Failed to create job: ${error.message}`, error as Error);
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
      status: { type: "string", enum: ["not_started", "in_progress", "completed", "on_hold"], description: "New status" },
      notes: { type: "string", description: "Job notes" },
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
