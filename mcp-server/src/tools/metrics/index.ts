/**
 * Metrics Tools - Dashboard Stats and Analytics
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, ToolCategory } from "../../types/tools.js";
import { getDatabase } from "../../config/database.js";
import { formatDataResponse } from "../../lib/response-formatter.js";

/**
 * Get Dashboard Stats Tool
 */
const getDashboardStatsDefinition: Tool = {
  name: "get_dashboard_stats",
  description: "Get dashboard statistics and metrics",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

const getDashboardStatsHandler: ToolHandler = async () => {
  const db = getDatabase();

  // Fetch multiple stats in parallel
  const [jobsResult, partsResult, tasksResult, issuesResult] = await Promise.all([
    db.from("jobs").select("status", { count: "exact", head: false }),
    db.from("parts").select("status", { count: "exact", head: false }),
    db.from("tasks").select("status", { count: "exact", head: false }),
    db.from("issues").select("status", { count: "exact", head: false }),
  ]);

  const stats = {
    jobs: {
      total: jobsResult.data?.length || 0,
      by_status: jobsResult.data?.reduce((acc: any, j: any) => {
        acc[j.status] = (acc[j.status] || 0) + 1;
        return acc;
      }, {}),
    },
    parts: {
      total: partsResult.data?.length || 0,
      by_status: partsResult.data?.reduce((acc: any, p: any) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {}),
    },
    tasks: {
      total: tasksResult.data?.length || 0,
      by_status: tasksResult.data?.reduce((acc: any, t: any) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {}),
    },
    issues: {
      total: issuesResult.data?.length || 0,
      by_status: issuesResult.data?.reduce((acc: any, i: any) => {
        acc[i.status] = (acc[i.status] || 0) + 1;
        return acc;
      }, {}),
    },
  };

  return formatDataResponse(stats);
};

/**
 * Export all metrics tools
 */
export const metricsTools = [
  {
    definition: getDashboardStatsDefinition,
    handler: getDashboardStatsHandler,
    category: ToolCategory.METRICS,
  },
];
