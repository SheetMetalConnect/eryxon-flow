/**
 * Parts domain tools
 * Handles part tracking and updates
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolModule, ToolHandler } from "../types/index.js";
import { jsonResponse, errorResponse } from "../utils/response.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "fetch_parts",
    description: "Fetch parts from the database with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "Filter by job ID",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "on_hold"],
          description: "Filter by part status",
        },
        limit: {
          type: "number",
          description: "Maximum number of parts to return (default: 50)",
        },
      },
    },
  },
  {
    name: "update_part",
    description: "Update a part's status or properties",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Part ID to update",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "on_hold"],
          description: "New status for the part",
        },
        current_stage_id: {
          type: "string",
          description: "New current stage ID",
        },
        drawing_no: {
          type: "string",
          description: "Drawing number reference",
        },
        cnc_program_name: {
          type: "string",
          description: "CNC program name for machine operators (generates QR code)",
        },
        is_bullet_card: {
          type: "boolean",
          description: "QRM bullet card flag - indicates rush/priority order",
        },
      },
      required: ["id"],
    },
  },
];

// Handler implementations
const fetchParts: ToolHandler = async (args, supabase) => {
  try {
    let query = supabase.from("parts").select("*, jobs(job_number, customer_name)");

    if (args.job_id) {
      query = query.eq("job_id", args.job_id);
    }
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

const updatePart: ToolHandler = async (args, supabase) => {
  try {
    const { id, ...updates } = args as { id: string; [key: string]: unknown };

    const { data, error } = await supabase
      .from("parts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Part updated successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

// Create handlers map
const handlers = new Map<string, ToolHandler>([
  ["fetch_parts", fetchParts],
  ["update_part", updatePart],
]);

// Export module
export const partsModule: ToolModule = {
  tools,
  handlers,
};
