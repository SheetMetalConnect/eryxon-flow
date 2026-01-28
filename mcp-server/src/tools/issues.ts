/**
 * Issues & NCR domain tools
 * Handles issue tracking, Non-Conformance Reports, and quality analytics
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolModule, ToolHandler } from "../types/index.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { schemas, validateArgs } from "../utils/validation.js";
import { structuredResponse, errorResponse } from "../utils/response.js";
import { databaseError } from "../utils/errors.js";
import { createFetchTool, createUpdateTool } from "../utils/tool-factories.js";

// Fetch issues with filters
const { tool: fetchIssuesTool, handler: fetchIssuesHandler } = createFetchTool({
  tableName: 'issues',
  description: 'Fetch issues/defects from the database with optional filters and pagination',
  selectFields: '*, parts(part_number), profiles(full_name)',
  filterFields: {
    status: schemas.issueStatus.optional(),
    severity: schemas.issueSeverity.optional(),
  },
  orderBy: { column: 'created_at', ascending: false },
});

// Fetch NCRs with filters
const { tool: fetchNcrsTool, handler: fetchNcrsHandler } = createFetchTool({
  tableName: 'issues',
  description: 'Fetch Non-Conformance Reports with filtering and pagination',
  selectFields: '*, operations(operation_name, parts(part_number, jobs(job_number)))',
  filterFields: {
    issue_type: z.literal('ncr').default('ncr'),
    status: schemas.issueStatus.optional(),
    severity: schemas.issueSeverity.optional(),
    ncr_category: z.enum(['material', 'process', 'equipment', 'design', 'supplier', 'documentation', 'other']).optional(),
  },
  orderBy: { column: 'created_at', ascending: false },
});

// Update issue
const { tool: updateIssueTool, handler: updateIssueHandler } = createUpdateTool({
  tableName: 'issues',
  description: "Update an issue's status or properties",
  resourceName: 'issue',
  updateSchema: z.object({
    id: schemas.id,
    status: schemas.issueStatus.optional(),
    severity: schemas.issueSeverity.optional(),
    resolution_notes: z.string().optional(),
  }),
});

// Custom tool definitions
const createNcrTool: Tool = {
  name: "create_ncr",
  description: "Create a Non-Conformance Report (NCR) with comprehensive tracking",
  inputSchema: {
    type: "object",
    properties: {
      operation_id: { type: "string", description: "Operation where the non-conformance occurred" },
      title: { type: "string", description: "Short title/summary of the NCR" },
      description: { type: "string", description: "Detailed description of the non-conformance" },
      severity: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Severity level" },
      ncr_category: { type: "string", enum: ["material", "process", "equipment", "design", "supplier", "documentation", "other"] },
      affected_quantity: { type: "number", description: "Number of parts affected" },
      disposition: { type: "string", enum: ["use_as_is", "rework", "repair", "scrap", "return_to_supplier"] },
      root_cause: { type: "string", description: "Root cause analysis" },
      corrective_action: { type: "string", description: "Immediate corrective action taken" },
      preventive_action: { type: "string", description: "Preventive action to avoid recurrence" },
      reported_by_id: { type: "string", description: "User ID who reported the NCR" },
    },
    required: ["operation_id", "title", "severity", "ncr_category"],
  },
};

const getIssueAnalyticsTool: Tool = {
  name: "get_issue_analytics",
  description: "Get aggregated issue statistics and metrics for quality analysis",
  inputSchema: {
    type: "object",
    properties: {
      days: { type: "number", description: "Number of days to analyze (default: 30)" },
      group_by: { type: "string", enum: ["severity", "status", "category", "cell", "operation"] },
    },
  },
};

const getIssueTrendsTool: Tool = {
  name: "get_issue_trends",
  description: "Get issue trends over time for pattern analysis",
  inputSchema: {
    type: "object",
    properties: {
      days: { type: "number", description: "Number of days to analyze (default: 30)" },
      interval: { type: "string", enum: ["daily", "weekly"], description: "Aggregation interval" },
    },
  },
};

const getRootCauseAnalysisTool: Tool = {
  name: "get_root_cause_analysis",
  description: "Analyze common root causes and corrective actions across issues",
  inputSchema: {
    type: "object",
    properties: {
      days: { type: "number", description: "Number of days to analyze (default: 90)" },
      min_occurrences: { type: "number", description: "Minimum occurrences to include (default: 2)" },
    },
  },
};

const suggestQualityImprovementsTool: Tool = {
  name: "suggest_quality_improvements",
  description: "AI-driven suggestions based on issue patterns and quality data",
  inputSchema: {
    type: "object",
    properties: {
      focus_area: { type: "string", enum: ["recurring_issues", "high_severity", "slow_resolution", "cell_problems"] },
    },
  },
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

// Custom handlers with validation
const createNcr: ToolHandler = async (args: Record<string, unknown>, supabase: SupabaseClient) => {
  try {
    const validated = validateArgs(args, z.object({
      operation_id: schemas.id,
      title: z.string().min(1),
      description: z.string().optional(),
      severity: schemas.issueSeverity,
      ncr_category: z.enum(['material', 'process', 'equipment', 'design', 'supplier', 'documentation', 'other']),
      affected_quantity: z.number().int().min(0).optional(),
      disposition: z.enum(['use_as_is', 'rework', 'repair', 'scrap', 'return_to_supplier']).optional(),
      root_cause: z.string().optional(),
      corrective_action: z.string().optional(),
      preventive_action: z.string().optional(),
      reported_by_id: schemas.id.optional(),
      tenant_id: schemas.id.optional(),
    }));

    // Generate NCR number
    const { data: ncrNumber } = await supabase.rpc("generate_ncr_number", {
      p_tenant_id: validated.tenant_id || "00000000-0000-0000-0000-000000000000",
    });

    const { data, error } = await supabase
      .from("issues")
      .insert({
        operation_id: validated.operation_id,
        title: validated.title,
        description: validated.description,
        severity: validated.severity,
        issue_type: "ncr",
        ncr_number: ncrNumber,
        ncr_category: validated.ncr_category,
        root_cause: validated.root_cause,
        corrective_action: validated.corrective_action,
        preventive_action: validated.preventive_action,
        affected_quantity: validated.affected_quantity,
        disposition: validated.disposition,
        reported_by_id: validated.reported_by_id,
        status: "open",
      })
      .select()
      .single();

    if (error) throw databaseError("Failed to create NCR", error as Error);
    return structuredResponse(data, "NCR created successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const getIssueAnalytics: ToolHandler = async (args: Record<string, unknown>, supabase: SupabaseClient) => {
  try {
    const { days } = validateArgs(args, z.object({ days: z.number().int().min(1).max(365).optional().default(30) }));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: issues, error } = await supabase
      .from("issues")
      .select(`id, severity, status, issue_type, ncr_category, created_at, updated_at, operations(operation_name, cell_id, cells(name))`)
      .gte("created_at", startDate.toISOString());

    if (error) throw databaseError("Failed to fetch issue analytics", error as Error);

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
      analytics.by_severity[issue.severity || "unknown"] = (analytics.by_severity[issue.severity || "unknown"] || 0) + 1;
      analytics.by_status[issue.status || "unknown"] = (analytics.by_status[issue.status || "unknown"] || 0) + 1;
      if (issue.ncr_category) {
        analytics.by_category[issue.ncr_category] = (analytics.by_category[issue.ncr_category] || 0) + 1;
      }
      const cellName = issue.operations?.cells?.name || "Unknown";
      analytics.by_cell[cellName] = (analytics.by_cell[cellName] || 0) + 1;

      if (issue.status === "resolved" || issue.status === "closed") {
        const daysDiff = (new Date(issue.updated_at).getTime() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60 * 24);
        totalResolutionDays += daysDiff;
        resolvedCount++;
      }
    });

    analytics.avg_resolution_days = resolvedCount > 0 ? Math.round((totalResolutionDays / resolvedCount) * 10) / 10 : 0;
    return structuredResponse(analytics);
  } catch (error) {
    return errorResponse(error);
  }
};

const getIssueTrends: ToolHandler = async (args: Record<string, unknown>, supabase: SupabaseClient) => {
  try {
    const { days, interval } = validateArgs(args, z.object({
      days: z.number().int().min(1).max(365).optional().default(30),
      interval: z.enum(['daily', 'weekly']).optional().default('daily'),
    }));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: issues, error } = await supabase
      .from("issues")
      .select("id, severity, status, created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw databaseError("Failed to fetch issue trends", error as Error);

    const trends: Record<string, { total: number; by_severity: Record<string, number> }> = {};

    issues?.forEach((issue: any) => {
      const date = new Date(issue.created_at);
      let key: string;

      if (interval === "weekly") {
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(date.setDate(diff));
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = date.toISOString().split("T")[0];
      }

      if (!trends[key]) trends[key] = { total: 0, by_severity: {} };
      trends[key].total++;
      const severity = issue.severity || "unknown";
      trends[key].by_severity[severity] = (trends[key].by_severity[severity] || 0) + 1;
    });

    const trendArray = Object.entries(trends)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return structuredResponse({ interval, period_days: days, data: trendArray });
  } catch (error) {
    return errorResponse(error);
  }
};

const getRootCauseAnalysis: ToolHandler = async (args: Record<string, unknown>, supabase: SupabaseClient) => {
  try {
    const { days, min_occurrences } = validateArgs(args, z.object({
      days: z.number().int().min(1).max(365).optional().default(90),
      min_occurrences: z.number().int().min(1).optional().default(2),
    }));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: issues, error } = await supabase
      .from("issues")
      .select(`id, root_cause, corrective_action, preventive_action, severity, status, ncr_category, operations(operation_name, cells(name))`)
      .gte("created_at", startDate.toISOString())
      .not("root_cause", "is", null);

    if (error) throw databaseError("Failed to fetch root cause data", error as Error);

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

    const analysis = Object.entries(rootCauses)
      .filter(([, data]) => data.count >= min_occurrences)
      .map(([cause, data]) => ({
        root_cause: cause,
        occurrence_count: data.count,
        most_common_severity: getMostCommon(data.severities),
        affected_cells: [...new Set(data.cells)],
        sample_corrective_actions: [...new Set(data.corrective_actions)].slice(0, 3),
      }))
      .sort((a, b) => b.occurrence_count - a.occurrence_count);

    return structuredResponse({
      period_days: days,
      min_occurrences,
      total_with_root_cause: issues?.length || 0,
      common_root_causes: analysis,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

const suggestQualityImprovements: ToolHandler = async (args: Record<string, unknown>, supabase: SupabaseClient) => {
  try {
    const { focus_area } = validateArgs(args, z.object({
      focus_area: z.enum(['recurring_issues', 'high_severity', 'slow_resolution', 'cell_problems']).optional().default('recurring_issues'),
    }));

    const { data: issues, error } = await supabase
      .from("issues")
      .select(`id, title, description, severity, status, ncr_category, root_cause, corrective_action, created_at, updated_at, operations(operation_name, cells(name))`)
      .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false });

    if (error) throw databaseError("Failed to fetch issues for suggestions", error as Error);

    const suggestions: { type: string; priority: string; suggestion: string; evidence: string }[] = [];

    if (focus_area === "recurring_issues" || focus_area === "cell_problems") {
      const cellIssues: Record<string, number> = {};
      issues?.forEach((issue: any) => {
        const cell = issue.operations?.cells?.name || "Unknown";
        cellIssues[cell] = (cellIssues[cell] || 0) + 1;
      });

      Object.entries(cellIssues)
        .filter(([, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cell, count]) => {
          suggestions.push({
            type: "cell_review",
            priority: count >= 5 ? "high" : "medium",
            suggestion: `Review processes in ${cell} cell - ${count} issues in last 90 days`,
            evidence: `High issue concentration indicates potential systematic problems`,
          });
        });
    }

    if (focus_area === "high_severity" || focus_area === "recurring_issues") {
      const criticalIssues = issues?.filter((i: any) => i.severity === "critical" || i.severity === "high") || [];
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

    if (focus_area === "slow_resolution") {
      const slowIssues = issues?.filter((i: any) => {
        if (i.status === "resolved" || i.status === "closed") return false;
        const daysOpen = (Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24);
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

    return structuredResponse({ focus_area, total_issues_analyzed: issues?.length || 0, suggestions });
  } catch (error) {
    return errorResponse(error);
  }
};

// Export module
export const issuesModule: ToolModule = {
  tools: [
    fetchIssuesTool,
    createNcrTool,
    fetchNcrsTool,
    updateIssueTool,
    getIssueAnalyticsTool,
    getIssueTrendsTool,
    getRootCauseAnalysisTool,
    suggestQualityImprovementsTool,
  ],
  handlers: new Map<string, ToolHandler>([
    ['fetch_issues', fetchIssuesHandler],
    ['create_ncr', createNcr],
    ['fetch_ncrs', fetchNcrsHandler],
    ['update_issue', updateIssueHandler],
    ['get_issue_analytics', getIssueAnalytics],
    ['get_issue_trends', getIssueTrends],
    ['get_root_cause_analysis', getRootCauseAnalysis],
    ['suggest_quality_improvements', suggestQualityImprovements],
  ]),
};
