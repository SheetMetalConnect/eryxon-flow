/**
 * Jobs Tools - Index
 * Exports all job-related tools
 */

import { fetchJobsTool } from "./fetch.js";
import { updateJobTool } from "./update.js";
import { createJobTool } from "./create.js";
import { jobLifecycleTools } from "./lifecycle.js";

export const jobTools = [
  fetchJobsTool,
  updateJobTool,
  createJobTool,
  ...jobLifecycleTools,
];
