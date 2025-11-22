/**
 * Operations Tools - Lifecycle and Substeps
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, ToolCategory } from "../../types/tools.js";
import { getDatabase } from "../../config/database.js";
import { buildCreateQuery, executeQuery } from "../../lib/query-builder.js";
import { formatMessageResponse, formatCreateResponse } from "../../lib/response-formatter.js";
import { validateRequired } from "../../lib/error-handler.js";

/**
 * Start Operation Tool
 */
const startOperationDefinition: Tool = {
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
};

const startOperationHandler: ToolHandler = async (args) => {
  validateRequired(args, ["id"], "start_operation");

  const db = getDatabase();
  const now = new Date().toISOString();

  const query = db
    .from("operations")
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
  return formatMessageResponse("Operation started successfully", data);
};

/**
 * Pause Operation Tool
 */
const pauseOperationDefinition: Tool = {
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
};

const pauseOperationHandler: ToolHandler = async (args) => {
  validateRequired(args, ["id"], "pause_operation");

  const db = getDatabase();
  const now = new Date().toISOString();

  const query = db
    .from("operations")
    .update({
      status: "on_hold",
      paused_at: now,
      updated_at: now,
    })
    .eq("id", args.id)
    .select()
    .single();

  const data = await executeQuery(query);
  return formatMessageResponse("Operation paused successfully", data);
};

/**
 * Complete Operation Tool
 */
const completeOperationDefinition: Tool = {
  name: "complete_operation",
  description: "Complete an operation (changes status to completed, sets completion to 100%)",
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
};

const completeOperationHandler: ToolHandler = async (args) => {
  validateRequired(args, ["id"], "complete_operation");

  const db = getDatabase();
  const now = new Date().toISOString();

  const query = db
    .from("operations")
    .update({
      status: "completed",
      completed_at: now,
      completion_percentage: 100,
      updated_at: now,
    })
    .eq("id", args.id)
    .select()
    .single();

  const data = await executeQuery(query);
  return formatMessageResponse("Operation completed successfully", data);
};

/**
 * Add Substep Tool
 */
const addSubstepDefinition: Tool = {
  name: "add_substep",
  description: "Add a substep to an operation with automatic sequencing",
  inputSchema: {
    type: "object",
    properties: {
      operation_id: {
        type: "string",
        description: "Operation ID to add substep to",
      },
      title: {
        type: "string",
        description: "Substep title",
      },
      description: {
        type: "string",
        description: "Substep description",
      },
      sequence: {
        type: "number",
        description: "Sequence number (auto-generated if not provided)",
      },
    },
    required: ["operation_id", "title"],
  },
};

const addSubstepHandler: ToolHandler = async (args) => {
  validateRequired(args, ["operation_id", "title"], "add_substep");

  const db = getDatabase();

  // If no sequence provided, get the next sequence number
  let sequence = args.sequence;
  if (!sequence) {
    const { data: existingSubsteps } = await db
      .from("operation_substeps")
      .select("sequence")
      .eq("operation_id", args.operation_id)
      .order("sequence", { ascending: false })
      .limit(1);

    sequence = existingSubsteps && existingSubsteps.length > 0
      ? existingSubsteps[0].sequence + 1
      : 1;
  }

  const substepData = {
    operation_id: args.operation_id,
    title: args.title,
    description: args.description,
    sequence,
    status: "pending",
  };

  const query = buildCreateQuery(db, "operation_substeps", substepData);
  const data = await executeQuery(query);

  return formatCreateResponse("Substep", data);
};

/**
 * Complete Substep Tool
 */
const completeSubstepDefinition: Tool = {
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
};

const completeSubstepHandler: ToolHandler = async (args) => {
  validateRequired(args, ["id"], "complete_substep");

  const db = getDatabase();
  const now = new Date().toISOString();

  const query = db
    .from("operation_substeps")
    .update({
      status: "completed",
      completed_at: now,
      updated_at: now,
    })
    .eq("id", args.id)
    .select()
    .single();

  const data = await executeQuery(query);
  return formatMessageResponse("Substep completed successfully", data);
};

/**
 * Export all operation tools
 */
export const operationTools = [
  {
    definition: startOperationDefinition,
    handler: startOperationHandler,
    category: ToolCategory.OPERATIONS,
  },
  {
    definition: pauseOperationDefinition,
    handler: pauseOperationHandler,
    category: ToolCategory.OPERATIONS,
  },
  {
    definition: completeOperationDefinition,
    handler: completeOperationHandler,
    category: ToolCategory.OPERATIONS,
  },
  {
    definition: addSubstepDefinition,
    handler: addSubstepHandler,
    category: ToolCategory.OPERATIONS,
  },
  {
    definition: completeSubstepDefinition,
    handler: completeSubstepHandler,
    category: ToolCategory.OPERATIONS,
  },
];
