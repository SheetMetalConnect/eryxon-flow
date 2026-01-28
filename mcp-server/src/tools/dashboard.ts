/**
 * Dashboard & Analytics domain tools
 * Handles statistics and metrics
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolModule, ToolHandler } from "../types/index.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { schemas, validateArgs } from "../utils/validation.js";
import { structuredResponse, errorResponse } from "../utils/response.js";

// Tool definitions
const getDashboardStatsTool: Tool = {
  name: "get_dashboard_stats",
  description: "Get dashboard statistics and metrics",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

const getQrmDataTool: Tool = {
  name: "get_qrm_data",
  description: "Get Quick Response Manufacturing (QRM) capacity data",
  inputSchema: {
    type: "object",
    properties: {
      cell_id: { type: "string", description: "Optional cell ID to filter by" },
    },
  },
};

const getProductionMetricsTool: Tool = {
  name: "get_production_metrics",
  description: "Get production metrics for a time period",
  inputSchema: {
    type: "object",
    properties: {
      start_date: { type: "string", description: "Start date (ISO 8601 format)" },
      end_date: { type: "string", description: "End date (ISO 8601 format)" },
    },
  },
};

// Validation schemas
const qrmDataSchema = z.object({
  cell_id: schemas.id.optional(),
});

const productionMetricsSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

// Helper function to count by status
function countByStatus<T extends { status?: string }>(
  items: T[] | null
): Record<string, number> {
  if (!items) return {};
  return items.reduce(
    (acc, item) => {
      const status = item.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}

// Handler implementations
const getDashboardStats: ToolHandler = async (_args: Record<string, unknown>, supabase: SupabaseClient) => {
  try {
    // Fetch multiple stats in parallel
    const [jobsResult, partsResult, tasksResult, issuesResult] = await Promise.all([
      supabase.from("jobs").select("status", { count: "exact", head: false }),
      supabase.from("parts").select("status", { count: "exact", head: false }),
      supabase.from("tasks").select("status", { count: "exact", head: false }),
      supabase.from("issues").select("status", { count: "exact", head: false }),
    ]);

    // Check for errors in parallel queries
    if (jobsResult.error) throw new Error(`Failed to fetch jobs: ${jobsResult.error.message}`);
    if (partsResult.error) throw new Error(`Failed to fetch parts: ${partsResult.error.message}`);
    if (tasksResult.error) throw new Error(`Failed to fetch tasks: ${tasksResult.error.message}`);
    if (issuesResult.error) throw new Error(`Failed to fetch issues: ${issuesResult.error.message}`);

    const stats = {
      jobs: {
        total: jobsResult.data?.length || 0,
        by_status: countByStatus(jobsResult.data),
      },
      parts: {
        total: partsResult.data?.length || 0,
        by_status: countByStatus(partsResult.data),
      },
      tasks: {
        total: tasksResult.data?.length || 0,
        by_status: countByStatus(tasksResult.data),
      },
      issues: {
        total: issuesResult.data?.length || 0,
        by_status: countByStatus(issuesResult.data),
      },
    };

    return structuredResponse(stats);
  } catch (error) {
    return errorResponse(error);
  }
};

const getQrmData: ToolHandler = async (args: Record<string, unknown>, supabase: SupabaseClient) => {
  try {
    const { cell_id } = validateArgs(args, qrmDataSchema);

    let query = supabase.from("cells").select(`
      id,
      name,
      wip_limit,
      wip_warning_threshold,
      enforce_limit,
      show_warning,
      operations(id, status)
    `);

    if (cell_id) {
      query = query.eq("id", cell_id);
    }

    const { data: cells, error } = await query;

    if (error) throw error;

    // Calculate current WIP for each cell
    const qrmData = cells?.map((cell: {
      id: string;
      name: string;
      wip_limit: number | null;
      wip_warning_threshold: number | null;
      enforce_limit: boolean | null;
      show_warning: boolean | null;
      operations: Array<{ id: string; status: string }> | null;
    }) => {
      const operations = cell.operations || [];
      const currentWip = operations.filter(
        (op) => op.status === "in_progress"
      ).length;
      const wipLimit = cell.wip_limit || 0;
      const warningThreshold = cell.wip_warning_threshold || 80;

      const utilizationPercent = wipLimit > 0 ? (currentWip / wipLimit) * 100 : 0;
      const status =
        utilizationPercent >= 100
          ? "at_capacity"
          : utilizationPercent >= warningThreshold
            ? "warning"
            : "available";

      return {
        cell_id: cell.id,
        cell_name: cell.name,
        current_wip: currentWip,
        wip_limit: wipLimit,
        utilization_percent: Math.round(utilizationPercent * 100) / 100,
        status,
        enforce_limit: cell.enforce_limit,
        show_warning: cell.show_warning,
      };
    });

    return structuredResponse(qrmData);
  } catch (error) {
    return errorResponse(error);
  }
};

const getProductionMetrics: ToolHandler = async (args: Record<string, unknown>, supabase: SupabaseClient) => {
  try {
    const validated = validateArgs(args, productionMetricsSchema);

    // Default to last 30 days if not specified
    const endDate = validated.end_date || new Date().toISOString();
    const startDate =
      validated.start_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch completed jobs in the period
    const { data: completedJobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, completed_at, started_at")
      .eq("status", "completed")
      .gte("completed_at", startDate)
      .lte("completed_at", endDate);

    if (jobsError) throw jobsError;

    // Fetch completed operations in the period
    const { data: completedOps, error: opsError } = await supabase
      .from("operations")
      .select("id, completed_at, started_at, good_quantity, scrap_quantity")
      .eq("status", "completed")
      .gte("completed_at", startDate)
      .lte("completed_at", endDate);

    if (opsError) throw opsError;

    // Calculate metrics
    const totalJobs = completedJobs?.length || 0;
    const totalOperations = completedOps?.length || 0;

    const totalGoodQuantity =
      completedOps?.reduce((sum, op) => sum + (op.good_quantity || 0), 0) || 0;
    const totalScrapQuantity =
      completedOps?.reduce((sum, op) => sum + (op.scrap_quantity || 0), 0) || 0;
    const totalQuantity = totalGoodQuantity + totalScrapQuantity;
    const yieldRate =
      totalQuantity > 0
        ? Math.round((totalGoodQuantity / totalQuantity) * 10000) / 100
        : 100;

    const metrics = {
      period: {
        start: startDate,
        end: endDate,
      },
      jobs: {
        completed: totalJobs,
      },
      operations: {
        completed: totalOperations,
      },
      quality: {
        good_quantity: totalGoodQuantity,
        scrap_quantity: totalScrapQuantity,
        yield_rate_percent: yieldRate,
      },
    };

    return structuredResponse(metrics);
  } catch (error) {
    return errorResponse(error);
  }
};

// Export module
export const dashboardModule: ToolModule = {
  tools: [getDashboardStatsTool, getQrmDataTool, getProductionMetricsTool],
  handlers: new Map<string, ToolHandler>([
    ['get_dashboard_stats', getDashboardStats],
    ['get_qrm_data', getQrmData],
    ['get_production_metrics', getProductionMetrics],
  ]),
};
