/**
 * Status Configuration
 *
 * Centralized status definitions for jobs, parts, and operations.
 * Open/Closed Principle - add new statuses via config, not code changes.
 *
 * Usage:
 *   import { JOB_STATUS_CONFIG, getStatusConfig } from '@/config/status';
 */

/**
 * Status variant type for Badge component
 */
export type StatusVariant = "default" | "secondary" | "destructive" | "outline";

/**
 * Configuration for a single status
 */
export interface StatusConfig {
  /** Badge variant */
  variant: StatusVariant;
  /** Tailwind classes for styling */
  className: string;
  /** CSS color variable for consistent theming */
  colorVar?: string;
}

/**
 * Entity status types
 */
export type JobStatus = "not_started" | "in_progress" | "completed" | "on_hold";
export type PartStatus = "not_started" | "in_progress" | "completed";
export type OperationStatus = "not_started" | "in_progress" | "completed" | "on_hold";
export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

/**
 * Job status configuration
 */
export const JOB_STATUS_CONFIG: Record<JobStatus, StatusConfig> = {
  not_started: {
    variant: "secondary",
    className: "bg-muted/50",
  },
  in_progress: {
    variant: "default",
    className:
      "bg-[hsl(var(--brand-primary))]/20 text-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))]/30",
    colorVar: "--brand-primary",
  },
  completed: {
    variant: "outline",
    className:
      "bg-[hsl(var(--color-success))]/20 text-[hsl(var(--color-success))] border-[hsl(var(--color-success))]/30",
    colorVar: "--color-success",
  },
  on_hold: {
    variant: "destructive",
    className:
      "bg-[hsl(var(--color-warning))]/20 text-[hsl(var(--color-warning))] border-[hsl(var(--color-warning))]/30",
    colorVar: "--color-warning",
  },
};

/**
 * Part status configuration
 */
export const PART_STATUS_CONFIG: Record<PartStatus, StatusConfig> = {
  not_started: {
    variant: "secondary",
    className: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  },
  in_progress: {
    variant: "default",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    colorVar: "--brand-primary",
  },
  completed: {
    variant: "outline",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    colorVar: "--color-success",
  },
};

/**
 * Operation status configuration
 */
export const OPERATION_STATUS_CONFIG: Record<OperationStatus, StatusConfig> = {
  not_started: {
    variant: "secondary",
    className: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  },
  in_progress: {
    variant: "default",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    colorVar: "--brand-primary",
  },
  completed: {
    variant: "outline",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    colorVar: "--color-success",
  },
  on_hold: {
    variant: "destructive",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    colorVar: "--color-warning",
  },
};

/**
 * Issue status configuration
 */
export const ISSUE_STATUS_CONFIG: Record<IssueStatus, StatusConfig> = {
  open: {
    variant: "destructive",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
    colorVar: "--color-error",
  },
  in_progress: {
    variant: "default",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    colorVar: "--brand-primary",
  },
  resolved: {
    variant: "outline",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    colorVar: "--color-success",
  },
  closed: {
    variant: "secondary",
    className: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  },
};

/**
 * Issue severity configuration
 */
export const ISSUE_SEVERITY_CONFIG = {
  critical: {
    className: "bg-red-500/10 text-red-600 border-red-500/20",
    colorVar: "--color-error",
  },
  major: {
    className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    colorVar: "--color-warning",
  },
  minor: {
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    colorVar: "--color-warning",
  },
  cosmetic: {
    className: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  },
} as const;

/**
 * Generic status config getter
 */
export function getStatusConfig<T extends string>(
  status: T,
  configMap: Record<T, StatusConfig>,
  fallbackStatus: T
): StatusConfig {
  return configMap[status] || configMap[fallbackStatus];
}

/**
 * Get job status config with fallback
 */
export function getJobStatusConfig(status: string): StatusConfig {
  return getStatusConfig(
    status as JobStatus,
    JOB_STATUS_CONFIG,
    "not_started"
  );
}

/**
 * Get part status config with fallback
 */
export function getPartStatusConfig(status: string): StatusConfig {
  return getStatusConfig(
    status as PartStatus,
    PART_STATUS_CONFIG,
    "not_started"
  );
}

/**
 * Get operation status config with fallback
 */
export function getOperationStatusConfig(status: string): StatusConfig {
  return getStatusConfig(
    status as OperationStatus,
    OPERATION_STATUS_CONFIG,
    "not_started"
  );
}

/**
 * Get issue status config with fallback
 */
export function getIssueStatusConfig(status: string): StatusConfig {
  return getStatusConfig(
    status as IssueStatus,
    ISSUE_STATUS_CONFIG,
    "open"
  );
}
