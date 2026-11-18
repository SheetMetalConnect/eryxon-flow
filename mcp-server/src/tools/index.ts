import { jobTools } from "./jobs.js";
import { partTools } from "./parts.js";
import { operationTools } from "./operations.js";
import { batchTools } from "./batches.js";
import { substepTools } from "./substeps.js";
import { qualityTools } from "./quality.js";
import { issueTools } from "./issues.js";
import { configTools } from "./config.js";
import { monitoringTools } from "./monitoring.js";
import { dashboardTools } from "./dashboard.js";
import { planningTools } from "./planning.js";

export const toolGroups = {
  jobs: jobTools, parts: partTools, operations: operationTools, batches: batchTools, substeps: substepTools,
  quality: qualityTools, issues: issueTools, config: configTools, monitoring: monitoringTools, dashboard: dashboardTools, planning: planningTools,
};

export const allTools = Object.values(toolGroups).flat().sort((a, b) => a.name.localeCompare(b.name));
