/**
 * Issues & NCR domain tools
 * Handles issue tracking and Non-Conformance Reports
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolModule, ToolHandler } from "../types/index.js";
import { jsonResponse, errorResponse } from "../utils/response.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "fetch_issues",
    description: "Fetch issues/defects from the database",
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
          description: "Filter by severity",
        },
        limit: {
          type: "number",
          description: "Maximum number of issues to return (default: 50)",
        },
      },
    },
  },
  {
    name: "create_ncr",
    description: "Create a Non-Conformance Report (NCR) with comprehensive tracking",
    inputSchema: {
      type: "object",
      properties: {
        operation_id: {
          type: "string",
          description: "Operation where the non-conformance occurred",
        },
        title: {
          type: "string",
          description: "Short title/summary of the NCR",
        },
        description: {
          type: "string",
          description: "Detailed description of the non-conformance",
        },
        severity: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Severity level of the NCR",
        },
        ncr_category: {
          type: "string",
          enum: ["material", "process", "equipment", "design", "supplier", "documentation", "other"],
          description: "Category of the non-conformance",
        },
        affected_quantity: {
          type: "number",
          description: "Number of parts affected",
        },
        disposition: {
          type: "string",
          enum: ["use_as_is", "rework", "repair", "scrap", "return_to_supplier"],
          description: "Disposition decision for affected parts",
        },
        root_cause: {
          type: "string",
          description: "Root cause analysis",
        },
        corrective_action: {
          type: "string",
          description: "Immediate corrective action taken",
        },
        preventive_action: {
          type: "string",
          description: "Preventive action to avoid recurrence",
        },
        reported_by_id: {
          type: "string",
          description: "User ID who reported the NCR",
        },
      },
      required: ["operation_id", "title", "severity"],
    },
  },
  {
    name: "fetch_ncrs",
    description: "Fetch Non-Conformance Reports with filtering",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["open", "in_progress", "resolved", "closed"],
          description: "Filter by NCR status",
        },
        severity: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Filter by severity",
        },
        ncr_category: {
          type: "string",
          enum: ["material", "process", "equipment", "design", "supplier", "documentation", "other"],
          description: "Filter by category",
        },
        limit: {
          type: "number",
          description: "Maximum number of NCRs to return (default: 50)",
        },
      },
    },
  },
  {
    name: "update_issue",
    description: "Update an issue's status or properties",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Issue ID to update",
        },
        status: {
          type: "string",
          enum: ["open", "in_progress", "resolved", "closed"],
          description: "New status for the issue",
        },
        severity: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "New severity level",
        },
        resolution_notes: {
          type: "string",
          description: "Notes about how the issue was resolved",
        },
      },
      required: ["id"],
    },
  },
];

// Handler implementations
const fetchIssues: ToolHandler = async (args, supabase) => {
  try {
    let query = supabase.from("issues").select("*, parts(part_number), profiles(full_name)");

    if (args.status) {
      query = query.eq("status", args.status);
    }
    if (args.severity) {
      query = query.eq("severity", args.severity);
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

const createNcr: ToolHandler = async (args, supabase) => {
  try {
    const ncrArgs = args as Record<string, unknown>;

    // Generate NCR number
    const { data: ncrNumber } = await supabase.rpc("generate_ncr_number", {
      p_tenant_id: (ncrArgs.tenant_id as string) || "00000000-0000-0000-0000-000000000000",
    });

    const ncrData = {
      operation_id: ncrArgs.operation_id,
      title: ncrArgs.title,
      description: ncrArgs.description,
      severity: ncrArgs.severity,
      issue_type: "ncr",
      ncr_number: ncrNumber,
      ncr_category: ncrArgs.ncr_category,
      root_cause: ncrArgs.root_cause,
      corrective_action: ncrArgs.corrective_action,
      preventive_action: ncrArgs.preventive_action,
      affected_quantity: ncrArgs.affected_quantity,
      disposition: ncrArgs.disposition,
      reported_by_id: ncrArgs.reported_by_id,
      status: "open",
    };

    const { data, error } = await supabase.from("issues").insert(ncrData).select().single();

    if (error) throw error;

    return jsonResponse(data, "NCR created successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const fetchNcrs: ToolHandler = async (args, supabase) => {
  try {
    let query = supabase
      .from("issues")
      .select("*, operations(operation_name, parts(part_number, jobs(job_number)))")
      .eq("issue_type", "ncr");

    if (args.status) {
      query = query.eq("status", args.status);
    }
    if (args.severity) {
      query = query.eq("severity", args.severity);
    }
    if (args.ncr_category) {
      query = query.eq("ncr_category", args.ncr_category);
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

const updateIssue: ToolHandler = async (args, supabase) => {
  try {
    const { id, ...updates } = args as { id: string; [key: string]: unknown };

    const { data, error } = await supabase
      .from("issues")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data, "Issue updated successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

// Create handlers map
const handlers = new Map<string, ToolHandler>([
  ["fetch_issues", fetchIssues],
  ["create_ncr", createNcr],
  ["fetch_ncrs", fetchNcrs],
  ["update_issue", updateIssue],
]);

// Export module
export const issuesModule: ToolModule = {
  tools,
  handlers,
};
