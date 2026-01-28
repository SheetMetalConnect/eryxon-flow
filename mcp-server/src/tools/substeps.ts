/**
 * Substeps domain tools
 * Handles operation substep management
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolModule, ToolHandler } from "../types/index.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { schemas, validateArgs } from "../utils/validation.js";
import { structuredResponse, errorResponse } from "../utils/response.js";
import { databaseError } from "../utils/errors.js";
import { createFetchTool, createUpdateTool } from "../utils/tool-factories.js";

// Fetch substeps for an operation
const { tool: fetchSubstepsTool, handler: fetchSubstepsHandler } = createFetchTool({
  tableName: 'substeps',
  description: 'Fetch substeps for an operation with optional completion filter',
  filterFields: {
    operation_id: schemas.id,
    completed: z.boolean().optional(),
  },
  orderBy: { column: 'sequence', ascending: true },
});

// Update substep
const { tool: updateSubstepTool, handler: updateSubstepHandler } = createUpdateTool({
  tableName: 'substeps',
  description: "Update a substep's properties",
  resourceName: 'substep',
  updateSchema: z.object({
    id: schemas.id,
    description: z.string().optional(),
    sequence: z.number().int().min(1).optional(),
    completed: z.boolean().optional(),
  }),
});

// Custom tool definitions
const addSubstepTool: Tool = {
  name: "add_substep",
  description: "Add a substep to an operation",
  inputSchema: {
    type: "object",
    properties: {
      operation_id: { type: "string", description: "Operation ID to add substep to" },
      description: { type: "string", description: "Description of the substep" },
      sequence: { type: "number", description: "Sequence/order of the substep (auto-assigned if not provided)" },
    },
    required: ["operation_id", "description"],
  },
};

const completeSubstepTool: Tool = {
  name: "complete_substep",
  description: "Mark a substep as completed",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Substep ID to complete" },
    },
    required: ["id"],
  },
};

const deleteSubstepTool: Tool = {
  name: "delete_substep",
  description: "Delete a substep",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Substep ID to delete" },
    },
    required: ["id"],
  },
};

// Custom handlers
const addSubstepSchema = z.object({
  operation_id: schemas.id,
  description: z.string().min(1),
  sequence: z.number().int().min(1).optional(),
});

const addSubstep: ToolHandler = async (args: Record<string, unknown>, supabase: SupabaseClient) => {
  try {
    const { operation_id, description, sequence } = validateArgs(args, addSubstepSchema);

    // Get next sequence if not provided (with retry on conflict to handle race conditions)
    let finalSequence = sequence;
    let retries = 3;
    let data: any = null;
    let error: any = null;

    while (retries > 0) {
      if (typeof finalSequence !== "number") {
        // Use RPC to atomically get next sequence (avoids race condition)
        const { data: nextSeq, error: seqError } = await supabase.rpc("get_next_substep_sequence", {
          p_operation_id: operation_id,
        });

        if (!seqError && typeof nextSeq === "number") {
          finalSequence = nextSeq;
        } else {
          // Fallback to client-side calculation if RPC not available
          const { data: maxSeq } = await supabase
            .from("substeps")
            .select("sequence")
            .eq("operation_id", operation_id)
            .order("sequence", { ascending: false })
            .limit(1)
            .single();

          finalSequence = (maxSeq?.sequence ?? 0) + 1;
        }
      }

      const result = await supabase
        .from("substeps")
        .insert({
          operation_id,
          description,
          sequence: finalSequence,
          completed: false,
        })
        .select()
        .single();

      data = result.data;
      error = result.error;

      // Check for unique constraint violation (sequence conflict)
      if (error?.code === "23505" && retries > 1) {
        // Retry with fresh sequence calculation
        finalSequence = undefined as any;
        retries--;
        continue;
      }

      // Success or non-retryable error
      break;
    }

    if (error) {
      throw databaseError("Failed to add substep", error as Error);
    }

    return structuredResponse(data, "Substep added successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const completeSubstepSchema = z.object({
  id: schemas.id,
});

const completeSubstep: ToolHandler = async (args: Record<string, unknown>, supabase: SupabaseClient) => {
  try {
    const { id } = validateArgs(args, completeSubstepSchema);

    const { data, error } = await supabase
      .from("substeps")
      .update({
        completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw databaseError("Failed to complete substep", error as Error);
    }

    return structuredResponse(data, "Substep completed successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const deleteSubstepSchema = z.object({
  id: schemas.id,
});

const deleteSubstep: ToolHandler = async (args: Record<string, unknown>, supabase: SupabaseClient) => {
  try {
    const { id } = validateArgs(args, deleteSubstepSchema);

    const { error } = await supabase.from("substeps").delete().eq("id", id);

    if (error) {
      throw databaseError("Failed to delete substep", error as Error);
    }

    return structuredResponse({ id, deleted: true }, "Substep deleted successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

// Export module
export const substepsModule: ToolModule = {
  tools: [
    fetchSubstepsTool,
    addSubstepTool,
    completeSubstepTool,
    updateSubstepTool,
    deleteSubstepTool,
  ],
  handlers: new Map<string, ToolHandler>([
    ['fetch_substeps', fetchSubstepsHandler],
    ['add_substep', addSubstep],
    ['complete_substep', completeSubstep],
    ['update_substep', updateSubstepHandler],
    ['delete_substep', deleteSubstep],
  ]),
};
