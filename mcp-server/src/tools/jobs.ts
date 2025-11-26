/**
 * Jobs domain tools
 * Handles job CRUD operations and lifecycle management
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolModule, ToolHandler } from "../types/index.js";
import { jsonResponse, errorResponse } from "../utils/response.js";

// Tool definitions
const tools: Tool[] = [
  {
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
  },
  {
    name: "create_job",
    description: "Create a new job",
    inputSchema: {
      type: "object",
      properties: {
        customer_name: {
          type: "string",
          description: "Customer name",
        },
        job_number: {
          type: "string",
          description: "Job number/identifier",
        },
        description: {
          type: "string",
          description: "Job description",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
          description: "Job priority",
        },
        due_date: {
          type: "string",
          description: "Due date (ISO 8601 format)",
        },
      },
      required: ["customer_name", "job_number"],
    },
  },
  {
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
          enum: ["pending", "in_progress", "completed", "on_hold"],
          description: "New status for the job",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
          description: "New priority for the job",
        },
        due_date: {
          type: "string",
          description: "New due date (ISO 8601 format)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "start_job",
    description: "Start a job (changes status to in_progress and tracks start time)",
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
  },
  {
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
  },
  {
    name: "complete_job",
    description: "Complete a job (changes status to completed, calculates duration)",
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
  },
  {
    name: "resume_job",
    description: "Resume a paused job (changes status back to in_progress)",
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
  },
];

// Handler implementations
const fetchJobs: ToolHandler = async (args, supabase) => {
  try {
    let query = supabase.from("jobs").select("*");

    if (args.status) {
      query = query.eq("status", args.status);
    }

    const limit = typeof args.limit === "number" ? args.limit : 50;
    query = query.limit(limit).order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
};

const createJob: ToolHandler = async (args, supabase) => {
  try {
    const { data, error } = await supabase
      .from("jobs")
      .insert([args])
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Job created successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const updateJob: ToolHandler = async (args, supabase) => {
  try {
    const { id, ...updates } = args as { id: string; [key: string]: unknown };

    const { data, error } = await supabase
      .from("jobs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Job updated successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const startJob: ToolHandler = async (args, supabase) => {
  try {
    const { id } = args as { id: string };
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("jobs")
      .update({
        status: "in_progress",
        started_at: now,
        paused_at: null,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Job started successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const stopJob: ToolHandler = async (args, supabase) => {
  try {
    const { id } = args as { id: string };
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("jobs")
      .update({
        status: "on_hold",
        paused_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Job stopped successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const completeJob: ToolHandler = async (args, supabase) => {
  try {
    const { id } = args as { id: string };
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("jobs")
      .update({
        status: "completed",
        completed_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Job completed successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const resumeJob: ToolHandler = async (args, supabase) => {
  try {
    const { id } = args as { id: string };
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("jobs")
      .update({
        status: "in_progress",
        resumed_at: now,
        paused_at: null,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Job resumed successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

// Create handlers map
const handlers = new Map<string, ToolHandler>([
  ["fetch_jobs", fetchJobs],
  ["create_job", createJob],
  ["update_job", updateJob],
  ["start_job", startJob],
  ["stop_job", stopJob],
  ["complete_job", completeJob],
  ["resume_job", resumeJob],
]);

// Export module
export const jobsModule: ToolModule = {
  tools,
  handlers,
};
