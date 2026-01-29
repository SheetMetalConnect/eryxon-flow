/**
 * Tools module exports
 * Central export point for all tool modules
 */

// Export individual modules
export { jobsModule } from "./jobs.js";
export { partsModule } from "./parts.js";
export { operationsModule } from "./operations.js";
export { tasksModule } from "./tasks.js";
export { issuesModule } from "./issues.js";
export { substepsModule } from "./substeps.js";
export { dashboardModule } from "./dashboard.js";
export { agentBatchModule } from "./agent-batch.js";
export { scrapModule } from "./scrap.js";

// Export registry
export { ToolRegistry, createToolRegistry } from "./registry.js";

// Import all modules for convenience
import { jobsModule } from "./jobs.js";
import { partsModule } from "./parts.js";
import { operationsModule } from "./operations.js";
import { tasksModule } from "./tasks.js";
import { issuesModule } from "./issues.js";
import { substepsModule } from "./substeps.js";
import { dashboardModule } from "./dashboard.js";
import { agentBatchModule } from "./agent-batch.js";
import { scrapModule } from "./scrap.js";
import { ToolRegistry } from "./registry.js";

/**
 * All available tool modules
 */
export const allModules = [
  jobsModule,
  partsModule,
  operationsModule,
  tasksModule,
  issuesModule,
  substepsModule,
  dashboardModule,
  agentBatchModule,
  scrapModule,
];

/**
 * Create a fully configured tool registry with all modules
 */
export function createConfiguredRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  // Register all modules
  for (const module of allModules) {
    registry.registerModule(module);
  }

  return registry;
}
