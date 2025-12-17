/**
 * Issues & NCR domain tools
 * Handles issue tracking, Non-Conformance Reports, and quality analytics
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
  {
    name: "get_issue_analytics",
    description: "Get aggregated issue statistics and metrics for quality analysis",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to analyze (default: 30)",
        },
        group_by: {
          type: "string",
          enum: ["severity", "status", "category", "cell", "operation"],
          description: "Group results by this field",
        },
      },
    },
  },
  {
    name: "get_issue_trends",
    description: "Get issue trends over time for pattern analysis",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to analyze (default: 30)",
        },
        interval: {
          type: "string",
          enum: ["daily", "weekly"],
          description: "Aggregation interval (default: daily)",
        },
      },
    },
  },
  {
    name: "get_root_cause_analysis",
    description: "Analyze common root causes and corrective actions across issues",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to analyze (default: 90)",
        },
        min_occurrences: {
          type: "number",
          description: "Minimum occurrences to include (default: 2)",
        },
      },
    },
  },
  {
    name: "suggest_quality_improvements",
    description: "AI-driven suggestions based on issue patterns and quality data",
    inputSchema: {
      type: "object",
      properties: {
        focus_area: {
          type: "string",
          enum: ["recurring_issues", "high_severity", "slow_resolution", "cell_problems"],
          description: "Area to focus suggestions on",
        },
      },
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

const getIssueAnalytics: ToolHandler = async (args, supabase) => {
  try {
    const days = typeof args.days === "number" ? args.days : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch issues with related data
    const { data: issues, error } = await supabase
      .from("issues")
      .select(`
        id, severity, status, issue_type, ncr_category, created_at, updated_at,
        operations(operation_name, cell_id, cells(name))
      `)
      .gte("created_at", startDate.toISOString());

    if (error) throw error;

    // Calculate aggregations
    const analytics = {
      total_issues: issues?.length || 0,
      by_severity: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
      by_category: {} as Record<string, number>,
      by_cell: {} as Record<string, number>,
      avg_resolution_days: 0,
      period_days: days,
    };

    let resolvedCount = 0;
    let totalResolutionDays = 0;

    issues?.forEach((issue: any) => {
      // By severity
      const severity = issue.severity || "unknown";
      analytics.by_severity[severity] = (analytics.by_severity[severity] || 0) + 1;

      // By status
      const status = issue.status || "unknown";
      analytics.by_status[status] = (analytics.by_status[status] || 0) + 1;

      // By category (NCRs only)
      if (issue.ncr_category) {
        analytics.by_category[issue.ncr_category] = (analytics.by_category[issue.ncr_category] || 0) + 1;
      }

      // By cell
      const cellName = issue.operations?.cells?.name || "Unknown";
      analytics.by_cell[cellName] = (analytics.by_cell[cellName] || 0) + 1;

      // Resolution time calculation
      if (issue.status === "resolved" || issue.status === "closed") {
        const created = new Date(issue.created_at);
        const updated = new Date(issue.updated_at);
        const daysDiff = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        totalResolutionDays += daysDiff;
        resolvedCount++;
      }
    });

    analytics.avg_resolution_days = resolvedCount > 0 ? Math.round((totalResolutionDays / resolvedCount) * 10) / 10 : 0;

    return jsonResponse(analytics);
  } catch (error) {
    return errorResponse(error);
  }
};

const getIssueTrends: ToolHandler = async (args, supabase) => {
  try {
    const days = typeof args.days === "number" ? args.days : 30;
    const interval = args.interval === "weekly" ? "weekly" : "daily";
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: issues, error } = await supabase
      .from("issues")
      .select("id, severity, status, created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Group by date interval
    const trends: Record<string, { total: number; by_severity: Record<string, number> }> = {};

    issues?.forEach((issue: any) => {
      const date = new Date(issue.created_at);
      let key: string;

      if (interval === "weekly") {
        // Get week start (Monday)
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(date.setDate(diff));
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = date.toISOString().split("T")[0];
      }

      if (!trends[key]) {
        trends[key] = { total: 0, by_severity: {} };
      }
      trends[key].total++;
      const severity = issue.severity || "unknown";
      trends[key].by_severity[severity] = (trends[key].by_severity[severity] || 0) + 1;
    });

    // Convert to array sorted by date
    const trendArray = Object.entries(trends)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return jsonResponse({
      interval,
      period_days: days,
      data: trendArray,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

const getRootCauseAnalysis: ToolHandler = async (args, supabase) => {
  try {
    const days = typeof args.days === "number" ? args.days : 90;
    const minOccurrences = typeof args.min_occurrences === "number" ? args.min_occurrences : 2;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: issues, error } = await supabase
      .from("issues")
      .select(`
        id, root_cause, corrective_action, preventive_action, severity, status, ncr_category,
        operations(operation_name, cells(name))
      `)
      .gte("created_at", startDate.toISOString())
      .not("root_cause", "is", null);

    if (error) throw error;

    // Analyze root causes
    const rootCauses: Record<string, { count: number; severities: string[]; cells: string[]; corrective_actions: string[] }> = {};

    issues?.forEach((issue: any) => {
      const rootCause = issue.root_cause?.toLowerCase().trim();
      if (!rootCause) return;

      if (!rootCauses[rootCause]) {
        rootCauses[rootCause] = { count: 0, severities: [], cells: [], corrective_actions: [] };
      }
      rootCauses[rootCause].count++;
      if (issue.severity) rootCauses[rootCause].severities.push(issue.severity);
      if (issue.operations?.cells?.name) rootCauses[rootCause].cells.push(issue.operations.cells.name);
      if (issue.corrective_action) rootCauses[rootCause].corrective_actions.push(issue.corrective_action);
    });

    // Filter and format results
    const analysis = Object.entries(rootCauses)
      .filter(([, data]) => data.count >= minOccurrences)
      .map(([cause, data]) => ({
        root_cause: cause,
        occurrence_count: data.count,
        most_common_severity: getMostCommon(data.severities),
        affected_cells: [...new Set(data.cells)],
        sample_corrective_actions: [...new Set(data.corrective_actions)].slice(0, 3),
      }))
      .sort((a, b) => b.occurrence_count - a.occurrence_count);

    return jsonResponse({
      period_days: days,
      min_occurrences: minOccurrences,
      total_with_root_cause: issues?.length || 0,
      common_root_causes: analysis,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

const suggestQualityImprovements: ToolHandler = async (args, supabase) => {
  try {
    const focusArea = args.focus_area || "recurring_issues";

    // Fetch recent issues with context
    const { data: issues, error } = await supabase
      .from("issues")
      .select(`
        id, title, description, severity, status, ncr_category, root_cause, 
        corrective_action, created_at, updated_at,
        operations(operation_name, cells(name))
      `)
      .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    const suggestions: { type: string; priority: string; suggestion: string; evidence: string }[] = [];

    if (focusArea === "recurring_issues" || focusArea === "cell_problems") {
      // Analyze by cell
      const cellIssues: Record<string, number> = {};
      issues?.forEach((issue: any) => {
        const cell = issue.operations?.cells?.name || "Unknown";
        cellIssues[cell] = (cellIssues[cell] || 0) + 1;
      });

      const problematicCells = Object.entries(cellIssues)
        .filter(([, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1]);

      problematicCells.forEach(([cell, count]) => {
        suggestions.push({
          type: "cell_review",
          priority: count >= 5 ? "high" : "medium",
          suggestion: `Review processes in ${cell} cell - ${count} issues in last 90 days`,
          evidence: `High issue concentration indicates potential systematic problems`,
        });
      });
    }

    if (focusArea === "high_severity" || focusArea === "recurring_issues") {
      // Check critical/high severity issues
      const criticalIssues = issues?.filter((i: any) => i.severity === "critical" || i.severity === "high") || [];
      if (criticalIssues.length > 0) {
        const unresolvedCritical = criticalIssues.filter((i: any) => i.status !== "resolved" && i.status !== "closed");
        if (unresolvedCritical.length > 0) {
          suggestions.push({
            type: "urgent_resolution",
            priority: "critical",
            suggestion: `${unresolvedCritical.length} high/critical severity issues remain unresolved`,
            evidence: `Unresolved critical issues pose quality and safety risks`,
          });
        }
      }
    }

    if (focusArea === "slow_resolution") {
      // Check for slow resolution
      const slowIssues = issues?.filter((i: any) => {
        if (i.status === "resolved" || i.status === "closed") return false;
        const created = new Date(i.created_at);
        const daysOpen = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
        return daysOpen > 7;
      }) || [];

      if (slowIssues.length > 0) {
        suggestions.push({
          type: "process_improvement",
          priority: "medium",
          suggestion: `${slowIssues.length} issues open for more than 7 days - review resolution process`,
          evidence: `Long resolution times may indicate resource constraints or unclear ownership`,
        });
      }
    }

    // Category analysis
    const categoryCount: Record<string, number> = {};
    issues?.forEach((i: any) => {
      if (i.ncr_category) {
        categoryCount[i.ncr_category] = (categoryCount[i.ncr_category] || 0) + 1;
      }
    });

    const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];
    if (topCategory && topCategory[1] >= 5) {
      suggestions.push({
        type: "category_focus",
        priority: "medium",
        suggestion: `Focus on ${topCategory[0]} issues - highest category with ${topCategory[1]} occurrences`,
        evidence: `Concentrated issue category suggests targeted improvement opportunity`,
      });
    }

    return jsonResponse({
      focus_area: focusArea,
      total_issues_analyzed: issues?.length || 0,
      suggestions,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

// Helper function
function getMostCommon(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const counts: Record<string, number> = {};
  arr.forEach((item) => {
    counts[item] = (counts[item] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// Create handlers map
const handlers = new Map<string, ToolHandler>([
  ["fetch_issues", fetchIssues],
  ["create_ncr", createNcr],
  ["fetch_ncrs", fetchNcrs],
  ["update_issue", updateIssue],
  ["get_issue_analytics", getIssueAnalytics],
  ["get_issue_trends", getIssueTrends],
  ["get_root_cause_analysis", getRootCauseAnalysis],
  ["suggest_quality_improvements", suggestQualityImprovements],
]);

// Export module
export const issuesModule: ToolModule = {
  tools,
  handlers,
};
