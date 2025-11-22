/**
 * Issues Tools
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, ToolCategory } from "../../types/tools.js";
import { getDatabase } from "../../config/database.js";
import { executeQuery } from "../../lib/query-builder.js";
import { formatDataResponse } from "../../lib/response-formatter.js";

/**
 * Fetch Issues Tool
 */
const fetchIssuesDefinition: Tool = {
  name: "fetch_issues",
  description: "Fetch production issues with optional filters",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["open", "in_progress", "resolved", "closed"],
        description: "Filter by issue status",
      },
      severity: {
        type: "string",
        enum: ["low", "medium", "high", "critical"],
        description: "Filter by severity level",
      },
      limit: {
        type: "number",
        description: "Maximum number of issues to return (default: 50)",
      },
    },
  },
};

const fetchIssuesHandler: ToolHandler = async (args) => {
  const db = getDatabase();
  const { status, severity, limit = 50 } = args || {};

  let query = db
    .from("issues")
    .select("*, parts(part_number), profiles(full_name)");

  if (status) {
    query = query.eq("status", status);
  }

  if (severity) {
    query = query.eq("severity", severity);
  }

  query = query.limit(limit).order("created_at", { ascending: false });

  const data = await executeQuery(query);
  return formatDataResponse(data);
};

/**
 * Export all issue tools
 */
export const issueTools = [
  {
    definition: fetchIssuesDefinition,
    handler: fetchIssuesHandler,
    category: ToolCategory.ISSUES,
  },
];
