/**
 * Jobs - Lifecycle Operations
 * Handles start, stop, complete, and resume operations
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, ToolCategory } from "../../types/tools.js";
import { getDatabase } from "../../config/database.js";
import { executeQuery } from "../../lib/query-builder.js";
import { formatMessageResponse } from "../../lib/response-formatter.js";
import { validateRequired } from "../../lib/error-handler.js";

/**
 * Start Job Tool
 */
export const startJobDefinition: Tool = {
  name: "start_job",
  description: "Start a job (changes status to in_progress)",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Job ID to start",
      },
    },
    required: ["id"],
  },
};

export const startJobHandler: ToolHandler = async (args) => {
  validateRequired(args, ["id"], "start_job");

  const db = getDatabase();
  const now = new Date().toISOString();

  const query = db
    .from("jobs")
    .update({
      status: "in_progress",
      started_at: now,
      paused_at: null,
      updated_at: now,
    })
    .eq("id", args.id)
    .select()
    .single();

  const data = await executeQuery(query);
  return formatMessageResponse("Job started successfully", data);
};

/**
 * Stop Job Tool
 */
export const stopJobDefinition: Tool = {
  name: "stop_job",
  description: "Stop/pause a job (changes status to on_hold)",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Job ID to stop",
      },
    },
    required: ["id"],
  },
};

export const stopJobHandler: ToolHandler = async (args) => {
  validateRequired(args, ["id"], "stop_job");

  const db = getDatabase();
  const now = new Date().toISOString();

  const query = db
    .from("jobs")
    .update({
      status: "on_hold",
      paused_at: now,
      updated_at: now,
    })
    .eq("id", args.id)
    .select()
    .single();

  const data = await executeQuery(query);
  return formatMessageResponse("Job stopped successfully", data);
};

/**
 * Complete Job Tool
 */
export const completeJobDefinition: Tool = {
  name: "complete_job",
  description: "Complete a job (changes status to completed)",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Job ID to complete",
      },
    },
    required: ["id"],
  },
};

export const completeJobHandler: ToolHandler = async (args) => {
  validateRequired(args, ["id"], "complete_job");

  const db = getDatabase();
  const now = new Date().toISOString();

  const query = db
    .from("jobs")
    .update({
      status: "completed",
      completed_at: now,
      updated_at: now,
    })
    .eq("id", args.id)
    .select()
    .single();

  const data = await executeQuery(query);
  return formatMessageResponse("Job completed successfully", data);
};

/**
 * Resume Job Tool
 */
export const resumeJobDefinition: Tool = {
  name: "resume_job",
  description: "Resume a paused job (changes status to in_progress)",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Job ID to resume",
      },
    },
    required: ["id"],
  },
};

export const resumeJobHandler: ToolHandler = async (args) => {
  validateRequired(args, ["id"], "resume_job");

  const db = getDatabase();
  const now = new Date().toISOString();

  const query = db
    .from("jobs")
    .update({
      status: "in_progress",
      resumed_at: now,
      paused_at: null,
      updated_at: now,
    })
    .eq("id", args.id)
    .select()
    .single();

  const data = await executeQuery(query);
  return formatMessageResponse("Job resumed successfully", data);
};

/**
 * Export all job lifecycle tools
 */
export const jobLifecycleTools = [
  {
    definition: startJobDefinition,
    handler: startJobHandler,
    category: ToolCategory.JOBS,
  },
  {
    definition: stopJobDefinition,
    handler: stopJobHandler,
    category: ToolCategory.JOBS,
  },
  {
    definition: completeJobDefinition,
    handler: completeJobHandler,
    category: ToolCategory.JOBS,
  },
  {
    definition: resumeJobDefinition,
    handler: resumeJobHandler,
    category: ToolCategory.JOBS,
  },
];
