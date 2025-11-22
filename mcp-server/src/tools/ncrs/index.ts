/**
 * NCRs (Non-Conformance Reports) Tools
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, ToolCategory } from "../../types/tools.js";
import { getDatabase } from "../../config/database.js";
import { buildFetchQuery, buildCreateQuery, executeQuery } from "../../lib/query-builder.js";
import { formatDataResponse, formatCreateResponse } from "../../lib/response-formatter.js";
import { validateRequired } from "../../lib/error-handler.js";

/**
 * Fetch NCRs Tool
 */
const fetchNcrsDefinition: Tool = {
  name: "fetch_ncrs",
  description: "Fetch Non-Conformance Reports with optional filters",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["open", "under_investigation", "resolved", "closed"],
        description: "Filter by NCR status",
      },
      severity: {
        type: "string",
        enum: ["minor", "major", "critical"],
        description: "Filter by severity level",
      },
      limit: {
        type: "number",
        description: "Maximum number of NCRs to return (default: 50)",
      },
    },
  },
};

const fetchNcrsHandler: ToolHandler = async (args) => {
  const db = getDatabase();
  const query = buildFetchQuery(
    db,
    "non_conformance_reports",
    args,
    "*, parts(part_number), jobs(job_number)"
  );
  const data = await executeQuery(query);
  return formatDataResponse(data);
};

/**
 * Create NCR Tool
 */
const createNcrDefinition: Tool = {
  name: "create_ncr",
  description: "Create a new Non-Conformance Report",
  inputSchema: {
    type: "object",
    properties: {
      part_id: {
        type: "string",
        description: "Part ID associated with this NCR",
      },
      job_id: {
        type: "string",
        description: "Job ID associated with this NCR",
      },
      title: {
        type: "string",
        description: "NCR title/summary",
      },
      description: {
        type: "string",
        description: "Detailed description of the non-conformance",
      },
      severity: {
        type: "string",
        enum: ["minor", "major", "critical"],
        description: "Severity level",
      },
      reported_by: {
        type: "string",
        description: "User ID of the reporter",
      },
    },
    required: ["title", "description", "severity"],
  },
};

const createNcrHandler: ToolHandler = async (args) => {
  validateRequired(args, ["title", "description", "severity"], "create_ncr");

  const db = getDatabase();

  const ncrData = {
    ...args,
    status: "open",
    created_at: new Date().toISOString(),
  };

  const query = buildCreateQuery(db, "non_conformance_reports", ncrData);
  const data = await executeQuery(query);

  return formatCreateResponse("Non-Conformance Report", data);
};

/**
 * Export all NCR tools
 */
export const ncrTools = [
  {
    definition: fetchNcrsDefinition,
    handler: fetchNcrsHandler,
    category: ToolCategory.NCRS,
  },
  {
    definition: createNcrDefinition,
    handler: createNcrHandler,
    category: ToolCategory.NCRS,
  },
];
