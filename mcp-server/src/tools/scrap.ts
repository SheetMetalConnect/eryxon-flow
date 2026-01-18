/**
 * Scrap & Quality Analytics domain tools
 * Handles scrap tracking, yield metrics, and quality analytics
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolModule, ToolHandler } from "../types/index.js";
import { jsonResponse, errorResponse } from "../utils/response.js";

// Tool definitions
const tools: Tool[] = [
  {
    name: "fetch_scrap_reasons",
    description: "Get all configured scrap reason codes",
    inputSchema: {
      type: "object",
      properties: {
        active_only: {
          type: "boolean",
          description: "Only return active scrap reasons (default: true)",
        },
      },
    },
  },
  {
    name: "report_scrap",
    description: "Report scrap quantity for an operation",
    inputSchema: {
      type: "object",
      properties: {
        operation_id: {
          type: "string",
          description: "Operation ID where scrap occurred",
        },
        quantity_scrap: {
          type: "number",
          description: "Number of parts scrapped",
        },
        scrap_reason_id: {
          type: "string",
          description: "Scrap reason code ID",
        },
        notes: {
          type: "string",
          description: "Additional notes about the scrap",
        },
        recorded_by: {
          type: "string",
          description: "User ID who recorded the scrap",
        },
      },
      required: ["operation_id", "quantity_scrap"],
    },
  },
  {
    name: "get_scrap_analytics",
    description: "Get aggregated scrap statistics by reason, cell, or operation",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to analyze (default: 30)",
        },
        group_by: {
          type: "string",
          enum: ["reason", "cell", "operation", "material"],
          description: "Group results by this field (default: reason)",
        },
      },
    },
  },
  {
    name: "get_scrap_trends",
    description: "Get scrap trends over time for pattern analysis",
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
    name: "get_yield_metrics",
    description: "Calculate yield and quality metrics across operations",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to analyze (default: 30)",
        },
        cell_id: {
          type: "string",
          description: "Filter by specific cell",
        },
      },
    },
  },
  {
    name: "get_scrap_pareto",
    description: "Get Pareto analysis of scrap reasons (80/20 rule)",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to analyze (default: 30)",
        },
        top_n: {
          type: "number",
          description: "Number of top reasons to return (default: 10)",
        },
      },
    },
  },
  {
    name: "get_quality_score",
    description: "Calculate overall quality health score based on yield, issues, and resolution time",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to analyze (default: 30)",
        },
      },
    },
  },
];

// Handler implementations
const fetchScrapReasons: ToolHandler = async (args, supabase) => {
  try {
    let query = supabase.from("scrap_reasons").select("*").order("code", { ascending: true });

    const activeOnly = args.active_only !== false;
    if (activeOnly) {
      query = query.eq("active", true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
};

const reportScrap: ToolHandler = async (args, supabase) => {
  try {
    const scrapArgs = args as Record<string, unknown>;

    const quantityData = {
      operation_id: scrapArgs.operation_id,
      quantity_produced: scrapArgs.quantity_scrap as number,
      quantity_good: 0,
      quantity_scrap: scrapArgs.quantity_scrap as number,
      quantity_rework: 0,
      scrap_reason_id: scrapArgs.scrap_reason_id || null,
      notes: scrapArgs.notes || null,
      recorded_by: scrapArgs.recorded_by || null,
      recorded_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("operation_quantities").insert(quantityData).select().single();

    if (error) throw error;

    return jsonResponse(data, "Scrap reported successfully");
  } catch (error) {
    return errorResponse(error);
  }
};

const getScrapAnalytics: ToolHandler = async (args, supabase) => {
  try {
    const days = typeof args.days === "number" ? args.days : 30;
    const groupBy = args.group_by || "reason";
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: quantities, error } = await supabase
      .from("operation_quantities")
      .select(`
        id, quantity_scrap, quantity_good, quantity_produced, quantity_rework, recorded_at,
        scrap_reasons(id, code, description),
        operations(operation_name, cell_id, cells(name), parts(material_id, materials(name)))
      `)
      .gte("recorded_at", startDate.toISOString())
      .gt("quantity_scrap", 0);

    if (error) throw error;

    const analytics: Record<string, { total_scrap: number; count: number; details: string[] }> = {};

    quantities?.forEach((q: any) => {
      let key: string;
      let detail: string;

      switch (groupBy) {
        case "cell":
          key = q.operations?.cells?.name || "Unknown Cell";
          detail = q.operations?.operation_name || "";
          break;
        case "operation":
          key = q.operations?.operation_name || "Unknown Operation";
          detail = q.scrap_reasons?.description || "";
          break;
        case "material":
          key = q.operations?.parts?.materials?.name || "Unknown Material";
          detail = q.operations?.operation_name || "";
          break;
        case "reason":
        default:
          key = q.scrap_reasons?.description || q.scrap_reasons?.code || "Unspecified";
          detail = q.operations?.operation_name || "";
          break;
      }

      if (!analytics[key]) {
        analytics[key] = { total_scrap: 0, count: 0, details: [] };
      }
      analytics[key].total_scrap += q.quantity_scrap || 0;
      analytics[key].count++;
      if (detail && !analytics[key].details.includes(detail)) {
        analytics[key].details.push(detail);
      }
    });

    const result = Object.entries(analytics)
      .map(([name, data]) => ({
        name,
        total_scrap: data.total_scrap,
        occurrence_count: data.count,
        related_items: data.details.slice(0, 5),
      }))
      .sort((a, b) => b.total_scrap - a.total_scrap);

    return jsonResponse({
      group_by: groupBy,
      period_days: days,
      total_records: quantities?.length || 0,
      data: result,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

const getScrapTrends: ToolHandler = async (args, supabase) => {
  try {
    const days = typeof args.days === "number" ? args.days : 30;
    const interval = args.interval === "weekly" ? "weekly" : "daily";
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: quantities, error } = await supabase
      .from("operation_quantities")
      .select("quantity_scrap, quantity_good, quantity_produced, recorded_at")
      .gte("recorded_at", startDate.toISOString())
      .order("recorded_at", { ascending: true });

    if (error) throw error;

    const trends: Record<string, { scrap: number; good: number; produced: number }> = {};

    quantities?.forEach((q: any) => {
      const date = new Date(q.recorded_at);
      let key: string;

      if (interval === "weekly") {
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(date.setDate(diff));
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = date.toISOString().split("T")[0];
      }

      if (!trends[key]) {
        trends[key] = { scrap: 0, good: 0, produced: 0 };
      }
      trends[key].scrap += q.quantity_scrap || 0;
      trends[key].good += q.quantity_good || 0;
      trends[key].produced += q.quantity_produced || 0;
    });

    const trendArray = Object.entries(trends)
      .map(([date, data]) => ({
        date,
        scrap: data.scrap,
        good: data.good,
        produced: data.produced,
        scrap_rate: data.produced > 0 ? Math.round((data.scrap / data.produced) * 1000) / 10 : 0,
      }))
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

const getYieldMetrics: ToolHandler = async (args, supabase) => {
  try {
    const days = typeof args.days === "number" ? args.days : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabase
      .from("operation_quantities")
      .select(`
        quantity_scrap, quantity_good, quantity_produced, quantity_rework,
        operations(operation_name, cell_id, cells(id, name))
      `)
      .gte("recorded_at", startDate.toISOString());

    if (args.cell_id) {
      query = query.eq("operations.cell_id", args.cell_id);
    }

    const { data: quantities, error } = await query;

    if (error) throw error;

    // Calculate overall metrics
    let totalProduced = 0;
    let totalGood = 0;
    let totalScrap = 0;
    let totalRework = 0;

    // By cell breakdown
    const byCell: Record<string, { produced: number; good: number; scrap: number; rework: number }> = {};

    quantities?.forEach((q: any) => {
      totalProduced += q.quantity_produced || 0;
      totalGood += q.quantity_good || 0;
      totalScrap += q.quantity_scrap || 0;
      totalRework += q.quantity_rework || 0;

      const cellName = q.operations?.cells?.name || "Unknown";
      if (!byCell[cellName]) {
        byCell[cellName] = { produced: 0, good: 0, scrap: 0, rework: 0 };
      }
      byCell[cellName].produced += q.quantity_produced || 0;
      byCell[cellName].good += q.quantity_good || 0;
      byCell[cellName].scrap += q.quantity_scrap || 0;
      byCell[cellName].rework += q.quantity_rework || 0;
    });

    const firstPassYield = totalProduced > 0 ? Math.round((totalGood / totalProduced) * 1000) / 10 : 100;
    const scrapRate = totalProduced > 0 ? Math.round((totalScrap / totalProduced) * 1000) / 10 : 0;
    const reworkRate = totalProduced > 0 ? Math.round((totalRework / totalProduced) * 1000) / 10 : 0;

    const cellMetrics = Object.entries(byCell).map(([cell, data]) => ({
      cell,
      produced: data.produced,
      good: data.good,
      scrap: data.scrap,
      rework: data.rework,
      first_pass_yield: data.produced > 0 ? Math.round((data.good / data.produced) * 1000) / 10 : 100,
      scrap_rate: data.produced > 0 ? Math.round((data.scrap / data.produced) * 1000) / 10 : 0,
    }));

    return jsonResponse({
      period_days: days,
      overall: {
        total_produced: totalProduced,
        total_good: totalGood,
        total_scrap: totalScrap,
        total_rework: totalRework,
        first_pass_yield: firstPassYield,
        scrap_rate: scrapRate,
        rework_rate: reworkRate,
      },
      by_cell: cellMetrics.sort((a, b) => a.first_pass_yield - b.first_pass_yield),
    });
  } catch (error) {
    return errorResponse(error);
  }
};

const getScrapPareto: ToolHandler = async (args, supabase) => {
  try {
    const days = typeof args.days === "number" ? args.days : 30;
    const topN = typeof args.top_n === "number" ? args.top_n : 10;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: quantities, error } = await supabase
      .from("operation_quantities")
      .select(`
        quantity_scrap,
        scrap_reasons(id, code, description)
      `)
      .gte("recorded_at", startDate.toISOString())
      .gt("quantity_scrap", 0);

    if (error) throw error;

    // Aggregate by reason
    const byReason: Record<string, { code: string; description: string; total: number }> = {};
    let grandTotal = 0;

    quantities?.forEach((q: any) => {
      const reasonKey = q.scrap_reasons?.id || "unspecified";
      const code = q.scrap_reasons?.code || "UNSPEC";
      const description = q.scrap_reasons?.description || "Unspecified Reason";
      const scrap = q.quantity_scrap || 0;

      grandTotal += scrap;

      if (!byReason[reasonKey]) {
        byReason[reasonKey] = { code, description, total: 0 };
      }
      byReason[reasonKey].total += scrap;
    });

    // Sort and calculate cumulative percentage
    const sorted = Object.values(byReason)
      .sort((a, b) => b.total - a.total)
      .slice(0, topN);

    let cumulative = 0;
    const paretoData = sorted.map((item) => {
      cumulative += item.total;
      return {
        code: item.code,
        description: item.description,
        quantity: item.total,
        percentage: grandTotal > 0 ? Math.round((item.total / grandTotal) * 1000) / 10 : 0,
        cumulative_percentage: grandTotal > 0 ? Math.round((cumulative / grandTotal) * 1000) / 10 : 0,
      };
    });

    return jsonResponse({
      period_days: days,
      total_scrap: grandTotal,
      data: paretoData,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

const getQualityScore: ToolHandler = async (args, supabase) => {
  try {
    const days = typeof args.days === "number" ? args.days : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get yield data
    const { data: quantities, error: qError } = await supabase
      .from("operation_quantities")
      .select("quantity_scrap, quantity_good, quantity_produced")
      .gte("recorded_at", startDate.toISOString());

    if (qError) throw qError;

    // Get issues data
    const { data: issues, error: iError } = await supabase
      .from("issues")
      .select("id, severity, status, created_at, updated_at")
      .gte("created_at", startDate.toISOString());

    if (iError) throw iError;

    // Calculate yield score (0-100)
    let totalProduced = 0;
    let totalGood = 0;
    quantities?.forEach((q: any) => {
      totalProduced += q.quantity_produced || 0;
      totalGood += q.quantity_good || 0;
    });
    const yieldScore = totalProduced > 0 ? (totalGood / totalProduced) * 100 : 100;

    // Calculate issue score (0-100, lower issues = higher score)
    const criticalIssues = issues?.filter((i: any) => i.severity === "critical").length || 0;
    const highIssues = issues?.filter((i: any) => i.severity === "high").length || 0;
    const mediumIssues = issues?.filter((i: any) => i.severity === "medium").length || 0;
    const lowIssues = issues?.filter((i: any) => i.severity === "low").length || 0;

    // Weighted issue impact
    const issueImpact = criticalIssues * 10 + highIssues * 5 + mediumIssues * 2 + lowIssues * 1;
    const issueScore = Math.max(0, 100 - issueImpact);

    // Calculate resolution speed score
    let totalResolutionDays = 0;
    let resolvedCount = 0;
    issues?.forEach((i: any) => {
      if (i.status === "resolved" || i.status === "closed") {
        const created = new Date(i.created_at);
        const updated = new Date(i.updated_at);
        totalResolutionDays += (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        resolvedCount++;
      }
    });
    const avgResolutionDays = resolvedCount > 0 ? totalResolutionDays / resolvedCount : 0;
    // Target: 3 days = 100 score, 10+ days = 0 score
    const resolutionScore = Math.max(0, Math.min(100, 100 - (avgResolutionDays - 3) * 14.3));

    // Combined quality score (weighted average)
    const overallScore = Math.round(yieldScore * 0.5 + issueScore * 0.3 + resolutionScore * 0.2);

    // Determine trend (compare to previous period)
    const trend = overallScore >= 80 ? "good" : overallScore >= 60 ? "moderate" : "needs_attention";

    return jsonResponse({
      period_days: days,
      overall_score: overallScore,
      trend,
      breakdown: {
        yield_score: Math.round(yieldScore),
        issue_score: Math.round(issueScore),
        resolution_score: Math.round(resolutionScore),
      },
      metrics: {
        first_pass_yield: Math.round(yieldScore * 10) / 10,
        total_issues: issues?.length || 0,
        critical_issues: criticalIssues,
        avg_resolution_days: Math.round(avgResolutionDays * 10) / 10,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};

// Create handlers map
const handlers = new Map<string, ToolHandler>([
  ["fetch_scrap_reasons", fetchScrapReasons],
  ["report_scrap", reportScrap],
  ["get_scrap_analytics", getScrapAnalytics],
  ["get_scrap_trends", getScrapTrends],
  ["get_yield_metrics", getYieldMetrics],
  ["get_scrap_pareto", getScrapPareto],
  ["get_quality_score", getQualityScore],
]);

// Export module
export const scrapModule: ToolModule = {
  tools,
  handlers,
};
