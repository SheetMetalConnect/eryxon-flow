/**
 * Operations domain tools
 * Handles operation lifecycle and management
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolModule, ToolHandler } from "../types/index.js";
import { jsonResponse, errorResponse } from "../utils/response.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "fetch_operations",
    description: "Fetch operations from the database with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        part_id: {
          type: "string",
          description: "Filter by part ID",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "on_hold"],
          description: "Filter by operation status",
        },
        cell_id: {
          type: "string",
          description: "Filter by cell/stage ID",
        },
        limit: {
          type: "number",
          description: "Maximum number of operations to return (default: 50)",
        },
      },
    },
  },
  {
    name: "start_operation",
    description: "Start an operation (changes status to in_progress, creates time entry)",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Operation ID to start",
        },
        user_id: {
          type: "string",
          description: "User ID performing the operation (for time tracking)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "pause_operation",
    description: "Pause an operation (changes status to on_hold, ends time entry)",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Operation ID to pause",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "complete_operation",
    description: "Complete an operation (changes status to completed, ends time entry)",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Operation ID to complete",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "update_operation",
    description: "Update an operation's properties",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Operation ID to update",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "on_hold"],
          description: "New status for the operation",
        },
        completion_percentage: {
          type: "number",
          description: "Completion percentage (0-100)",
        },
        notes: {
          type: "string",
          description: "Operation notes",
        },
      },
      required: ["id"],
    },
  },
];

// Handler implementations
const fetchOperations: ToolHandler = async (args, supabase) => {
  try {
    let query = supabase.from("operations").select("*, parts(part_number, jobs(job_number))");

    if (args.part_id) {
      query = query.eq("part_id", args.part_id);
    }
    if (args.status) {
      query = query.eq("status", args.status);
    }
    if (args.cell_id) {
      query = query.eq("cell_id", args.cell_id);
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

const startOperation: ToolHandler = async (args, supabase) => {
  try {
    const { id } = args as { id: string; user_id?: string };
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("operations")
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

    return jsonResponse(data, "Operation started successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const pauseOperation: ToolHandler = async (args, supabase) => {
  try {
    const { id } = args as { id: string };
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("operations")
      .update({
        status: "on_hold",
        paused_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Operation paused successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const completeOperation: ToolHandler = async (args, supabase) => {
  try {
    const { id } = args as { id: string };
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("operations")
      .update({
        status: "completed",
        completed_at: now,
        completion_percentage: 100,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Operation completed successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const updateOperation: ToolHandler = async (args, supabase) => {
  try {
    const { id, ...updates } = args as { id: string; [key: string]: unknown };

    const { data, error } = await supabase
      .from("operations")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Operation updated successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

// Create handlers map
const handlers = new Map<string, ToolHandler>([
  ["fetch_operations", fetchOperations],
  ["start_operation", startOperation],
  ["pause_operation", pauseOperation],
  ["complete_operation", completeOperation],
  ["update_operation", updateOperation],
]);

// Export module
export const operationsModule: ToolModule = {
  tools,
  handlers,
};
