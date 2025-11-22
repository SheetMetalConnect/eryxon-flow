/**
 * Tools Index
 * Central export for all MCP tools
 */

import { toolRegistry } from "./registry.js";
import { jobTools } from "./jobs/index.js";
import { partTools } from "./parts/index.js";
import { taskTools } from "./tasks/index.js";
import { issueTools } from "./issues/index.js";
import { ncrTools } from "./ncrs/index.js";
import { operationTools } from "./operations/index.js";
import { metricsTools } from "./metrics/index.js";
import { logger } from "../lib/logger.js";

/**
 * Register all tools with the registry
 */
export function registerAllTools(): void {
  const allTools = [
    ...jobTools,
    ...partTools,
    ...taskTools,
    ...issueTools,
    ...ncrTools,
    ...operationTools,
    ...metricsTools,
  ];

  toolRegistry.registerMany(allTools);

  // Log registration summary
  const stats = toolRegistry.getStats();
  logger.info(`Registered ${stats.total} tools`, stats.byCategory);
}

/**
 * Export the registry for use in server
 */
export { toolRegistry };
