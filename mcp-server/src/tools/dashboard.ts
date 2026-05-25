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
import { databaseError } from "../utils/errors.js";

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
    const [jobsResult, partsResult, operationsResult, issuesResult] = await Promise.all([
      supabase.from("jobs").select("status", { count: "exact", head: false }).is("deleted_at", null),
      supabase.from("parts").select("status", { count: "exact", head: false }).is("deleted_at", null),
      supabase.from("operations").select("status", { count: "exact", head: false }).is("deleted_at", null),
      supabase.from("issues").select("status", { count: "exact", head: false }),
    ]);

    // Check for errors in parallel queries
    if (jobsResult.error) throw new Error(`Failed to fetch jobs: ${jobsResult.error.message}`);
    if (partsResult.error) throw new Error(`Failed to fetch parts: ${partsResult.error.message}`);
    if (operationsResult.error) throw new Error(`Failed to fetch operations: ${operationsResult.error.message}`);
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
      operations: {
        total: operationsResult.data?.length || 0,
        by_status: countByStatus(operationsResult.data),
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
      enforce_wip_limit,
      show_capacity_warning,
      operations(id, status)
    `).is("deleted_at", null);

    if (cell_id) {
      query = query.eq("id", cell_id);
    }

    const { data: cells, error } = await query;

    if (error) throw databaseError("Failed to fetch QRM data", error as Error);

    // Calculate current WIP for each cell
    const qrmData = cells?.map((cell: {
      id: string;
      name: string;
      wip_limit: number | null;
      wip_warning_threshold: number | null;
      enforce_wip_limit: boolean | null;
      show_capacity_warning: boolean | null;
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
        enforce_wip_limit: cell.enforce_wip_limit,
        show_capacity_warning: cell.show_capacity_warning,
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

    // Fetch completed jobs in the period. The jobs table has no dedicated
    // completion timestamp, so updated_at (set when status flips to completed)
    // is the period proxy — without it this would return all-time totals and
    // break period-over-period comparisons.
    const { data: completedJobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, status, updated_at")
      .eq("status", "completed")
      .gte("updated_at", startDate)
      .lte("updated_at", endDate)
      .is("deleted_at", null);

    if (jobsError) throw databaseError("Failed to fetch completed jobs", jobsError as Error);

    // Fetch completed operations in the period
    const { data: completedOps, error: opsError } = await supabase
      .from("operations")
      .select("id, completed_at")
      .eq("status", "completed")
      .gte("completed_at", startDate)
      .lte("completed_at", endDate);

    if (opsError) throw databaseError("Failed to fetch completed operations", opsError as Error);

    // Fetch quantity data from operation_quantities
    const { data: quantities, error: qError } = await supabase
      .from("operation_quantities")
      .select("quantity_good, quantity_scrap, quantity_produced")
      .gte("recorded_at", startDate)
      .lte("recorded_at", endDate);

    if (qError) throw databaseError("Failed to fetch quantity data", qError as Error);

    // Calculate metrics
    const totalJobs = completedJobs?.length || 0;
    const totalOperations = completedOps?.length || 0;

    const totalGoodQuantity =
      quantities?.reduce((sum: number, q: any) => sum + (q.quantity_good || 0), 0) || 0;
    const totalScrapQuantity =
      quantities?.reduce((sum: number, q: any) => sum + (q.quantity_scrap || 0), 0) || 0;
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
