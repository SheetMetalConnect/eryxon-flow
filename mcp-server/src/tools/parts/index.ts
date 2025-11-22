/**
 * Parts Tools
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, ToolCategory } from "../../types/tools.js";
import { getDatabase } from "../../config/database.js";
import { buildFetchQuery, buildUpdateQuery, executeQuery } from "../../lib/query-builder.js";
import { formatDataResponse, formatUpdateResponse } from "../../lib/response-formatter.js";
import { validateRequired } from "../../lib/error-handler.js";

/**
 * Fetch Parts Tool
 */
const fetchPartsDefinition: Tool = {
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
};

const fetchPartsHandler: ToolHandler = async (args) => {
  const db = getDatabase();
  const query = buildFetchQuery(db, "parts", args, "*, jobs(job_number, customer_name)");
  const data = await executeQuery(query);
  return formatDataResponse(data);
};

/**
 * Update Part Tool
 */
const updatePartDefinition: Tool = {
  name: "update_part",
  description: "Update a part's status or current stage",
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
        description: "New part status",
      },
      current_stage: {
        type: "string",
        description: "Current manufacturing stage",
      },
    },
    required: ["id"],
  },
};

const updatePartHandler: ToolHandler = async (args) => {
  validateRequired(args, ["id"], "update_part");

  const db = getDatabase();
  const { id, ...updates } = args;

  const query = buildUpdateQuery(db, "parts", id, updates);
  const data = await executeQuery(query);

  return formatUpdateResponse("Part", data);
};

/**
 * Export all parts tools
 */
export const partTools = [
  {
    definition: fetchPartsDefinition,
    handler: fetchPartsHandler,
    category: ToolCategory.PARTS,
  },
  {
    definition: updatePartDefinition,
    handler: updatePartHandler,
    category: ToolCategory.PARTS,
  },
];
