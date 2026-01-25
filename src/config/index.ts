/**
 * Configuration Module
 *
 * Centralized configuration for the application.
 */

// Status configurations
export {
  // Types
  type StatusVariant,
  type StatusConfig,
  type JobStatus,
  type PartStatus,
  type OperationStatus,
  type IssueStatus,
  // Config objects
  JOB_STATUS_CONFIG,
  PART_STATUS_CONFIG,
  OPERATION_STATUS_CONFIG,
  ISSUE_STATUS_CONFIG,
  ISSUE_SEVERITY_CONFIG,
  // Helper functions
  getStatusConfig,
  getJobStatusConfig,
  getPartStatusConfig,
  getOperationStatusConfig,
  getIssueStatusConfig,
} from "./status";
