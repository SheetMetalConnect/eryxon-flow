/**
 * Tasks domain tools
 * Handles task queries and assignments
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolModule, ToolHandler } from "../types/index.js";
import { jsonResponse, errorResponse } from "../utils/response.js";

// Tool definitions
const tools: Tool[] = [
  {
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
  },
  {
    name: "update_task",
    description: "Update a task's status or properties",
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
          description: "New status for the task",
        },
        assigned_to: {
          type: "string",
          description: "Assign to user ID",
        },
      },
      required: ["id"],
    },
  },
];

// Handler implementations
const fetchTasks: ToolHandler = async (args, supabase) => {
  try {
    let query = supabase.from("tasks").select("*, parts(part_number), profiles(full_name)");

    if (args.part_id) {
      query = query.eq("part_id", args.part_id);
    }
    if (args.status) {
      query = query.eq("status", args.status);
    }
    if (args.assigned_to) {
      query = query.eq("assigned_to", args.assigned_to);
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

const updateTask: ToolHandler = async (args, supabase) => {
  try {
    const { id, ...updates } = args as { id: string; [key: string]: unknown };

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Task updated successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

// Create handlers map
const handlers = new Map<string, ToolHandler>([
  ["fetch_tasks", fetchTasks],
  ["update_task", updateTask],
]);

// Export module
export const tasksModule: ToolModule = {
  tools,
  handlers,
};
