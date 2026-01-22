/**
 * Substeps domain tools
 * Handles operation substep management
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolModule, ToolHandler } from "../types/index.js";
import { jsonResponse, errorResponse } from "../utils/response.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "fetch_substeps",
    description: "Fetch substeps for an operation",
    inputSchema: {
      type: "object",
      properties: {
        operation_id: {
          type: "string",
          description: "Operation ID to fetch substeps for",
        },
        completed: {
          type: "boolean",
          description: "Filter by completion status",
        },
      },
      required: ["operation_id"],
    },
  },
  {
    name: "add_substep",
    description: "Add a substep to an operation",
    inputSchema: {
      type: "object",
      properties: {
        operation_id: {
          type: "string",
          description: "Operation ID to add substep to",
        },
        description: {
          type: "string",
          description: "Description of the substep",
        },
        sequence: {
          type: "number",
          description: "Sequence/order of the substep (auto-assigned if not provided)",
        },
      },
      required: ["operation_id", "description"],
    },
  },
  {
    name: "complete_substep",
    description: "Mark a substep as completed",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Substep ID to complete",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "update_substep",
    description: "Update a substep's properties",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Substep ID to update",
        },
        description: {
          type: "string",
          description: "New description",
        },
        sequence: {
          type: "number",
          description: "New sequence number",
        },
        completed: {
          type: "boolean",
          description: "Completion status",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_substep",
    description: "Delete a substep",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Substep ID to delete",
        },
      },
      required: ["id"],
    },
  },
];

// Handler implementations
const fetchSubsteps: ToolHandler = async (args, supabase) => {
  try {
    const { operation_id, completed } = args as { operation_id: string; completed?: boolean };

    let query = supabase
      .from("substeps")
      .select("*")
      .eq("operation_id", operation_id)
      .order("sequence", { ascending: true });

    if (typeof completed === "boolean") {
      query = query.eq("completed", completed);
    }

    const { data, error } = await query;

    if (error) throw error;

    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
};

const addSubstep: ToolHandler = async (args, supabase) => {
  try {
    const { operation_id, description, sequence } = args as {
      operation_id: string;
      description: string;
      sequence?: number;
    };

    // Get next sequence if not provided
    let finalSequence = sequence;
    if (typeof finalSequence !== "number") {
      const { data: maxSeq } = await supabase
        .from("substeps")
        .select("sequence")
        .eq("operation_id", operation_id)
        .order("sequence", { ascending: false })
        .limit(1)
        .single();

      finalSequence = (maxSeq?.sequence ?? 0) + 1;
    }

    const { data, error } = await supabase
      .from("substeps")
      .insert({
        operation_id,
        description,
        sequence: finalSequence,
        completed: false,
      })
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Substep added successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const completeSubstep: ToolHandler = async (args, supabase) => {
  try {
    const { id } = args as { id: string };

    const { data, error } = await supabase
      .from("substeps")
      .update({
        completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Substep completed successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const updateSubstep: ToolHandler = async (args, supabase) => {
  try {
    const { id, ...updates } = args as { id: string; [key: string]: unknown };

    const { data, error } = await supabase
      .from("substeps")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Substep updated successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const deleteSubstep: ToolHandler = async (args, supabase) => {
  try {
    const { id } = args as { id: string };

    const { error } = await supabase.from("substeps").delete().eq("id", id);

    if (error) throw error;

    return jsonResponse({ id, deleted: true }, "Substep deleted successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

// Create handlers map
const handlers = new Map<string, ToolHandler>([
  ["fetch_substeps", fetchSubsteps],
  ["add_substep", addSubstep],
  ["complete_substep", completeSubstep],
  ["update_substep", updateSubstep],
  ["delete_substep", deleteSubstep],
]);

// Export module
export const substepsModule: ToolModule = {
  tools,
  handlers,
};
