/**
 * Job Utilities
 *
 * Pure utility functions for job-related calculations.
 * Extracted from components for reusability and testability.
 *
 * KISS: Simple, focused functions
 * SRP: Each function does one thing
 */

import { isBefore, addDays } from "date-fns";

/**
 * Job data with parts and operations
 */
export interface JobWithParts {
  id: string;
  status: string;
  due_date: string;
  due_date_override?: string | null;
  parts?: Array<{
    id: string;
    quantity?: number;
    weight_kg?: number | null;
    length_mm?: number | null;
    width_mm?: number | null;
    height_mm?: number | null;
    operations?: Array<{
      id: string;
      status: string;
    }>;
  }>;
}

/**
 * Job statistics summary
 */
export interface JobStats {
  total: number;
  active: number;
  completed: number;
  overdue: number;
  notStarted: number;
  onHold: number;
}

/**
 * Job detail statistics
 */
export interface JobDetailStats {
  partsCount: number;
  operationsCount: number;
  completedOperations: number;
  progressPercentage: number;
}

/**
 * Shipping/delivery metrics
 */
export interface JobShippingMetrics {
  totalWeight: number;
  totalVolume: number;
}

/**
 * Calculate aggregate statistics for a list of jobs
 *
 * @param jobs - Array of job data
 * @returns Aggregated statistics
 */
export function calculateJobStats(jobs: JobWithParts[]): JobStats {
  const today = new Date();

  return jobs.reduce(
    (stats, job) => {
      stats.total++;

      switch (job.status) {
        case "in_progress":
          stats.active++;
          break;
        case "completed":
          stats.completed++;
          break;
        case "not_started":
          stats.notStarted++;
          break;
        case "on_hold":
          stats.onHold++;
          break;
      }

      // Check if overdue
      if (job.status !== "completed") {
        const dueDate = new Date(job.due_date_override || job.due_date);
        if (isBefore(dueDate, today)) {
          stats.overdue++;
        }
      }

      return stats;
    },
    {
      total: 0,
      active: 0,
      completed: 0,
      overdue: 0,
      notStarted: 0,
      onHold: 0,
    }
  );
}

/**
 * Calculate detail statistics for a single job
 *
 * @param job - Job with parts and operations
 * @returns Detail statistics
 */
export function calculateJobDetailStats(job: JobWithParts): JobDetailStats {
  const parts = job.parts || [];
  const partsCount = parts.length;
  const operationsCount = parts.reduce(
    (sum, part) => sum + (part.operations?.length || 0),
    0
  );
  const completedOperations = parts.reduce(
    (sum, part) =>
      sum +
      (part.operations?.filter((op) => op.status === "completed").length || 0),
    0
  );
  const progressPercentage =
    operationsCount > 0
      ? Math.round((completedOperations / operationsCount) * 100)
      : 0;

  return {
    partsCount,
    operationsCount,
    completedOperations,
    progressPercentage,
  };
}

/**
 * Calculate shipping metrics for a job (weight and volume)
 *
 * @param job - Job with parts
 * @returns Weight and volume totals
 */
export function calculateJobShippingMetrics(
  job: JobWithParts
): JobShippingMetrics {
  const parts = job.parts || [];

  const totalWeight = parts.reduce(
    (sum, part) => sum + (part.weight_kg ?? 0) * (part.quantity ?? 1),
    0
  );

  const totalVolume = parts.reduce((sum, part) => {
    if (part.length_mm && part.width_mm && part.height_mm) {
      // Convert mm³ to m³
      const volumeM3 =
        (part.length_mm * part.width_mm * part.height_mm) / 1_000_000_000;
      return sum + volumeM3 * (part.quantity ?? 1);
    }
    return sum;
  }, 0);

  return { totalWeight, totalVolume };
}

/**
 * Check if a job is overdue
 *
 * @param job - Job data
 * @returns True if overdue (past due date and not completed)
 */
export function isJobOverdue(job: JobWithParts): boolean {
  if (job.status === "completed") return false;
  const dueDate = new Date(job.due_date_override || job.due_date);
  return isBefore(dueDate, new Date());
}

/**
 * Check if a job is due soon (within 7 days)
 *
 * @param job - Job data
 * @returns True if due within 7 days and not overdue
 */
export function isJobDueSoon(job: JobWithParts): boolean {
  if (job.status === "completed") return false;
  const dueDate = new Date(job.due_date_override || job.due_date);
  const today = new Date();
  const weekFromNow = addDays(today, 7);
  return !isBefore(dueDate, today) && isBefore(dueDate, weekFromNow);
}

/**
 * Get the effective due date for a job (respecting overrides)
 *
 * @param job - Job data
 * @returns Effective due date
 */
export function getEffectiveDueDate(job: {
  due_date: string;
  due_date_override?: string | null;
}): Date {
  return new Date(job.due_date_override || job.due_date);
}

/**
 * Sort jobs by due date (ascending)
 *
 * @param jobs - Array of jobs
 * @returns Sorted array (new array, doesn't mutate)
 */
export function sortJobsByDueDate<T extends { due_date: string; due_date_override?: string | null }>(
  jobs: T[]
): T[] {
  return [...jobs].sort((a, b) => {
    const dateA = getEffectiveDueDate(a);
    const dateB = getEffectiveDueDate(b);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Filter jobs by status
 *
 * @param jobs - Array of jobs
 * @param statuses - Status values to filter by
 * @returns Filtered array
 */
export function filterJobsByStatus<T extends { status: string }>(
  jobs: T[],
  statuses: string[]
): T[] {
  return jobs.filter((job) => statuses.includes(job.status));
}
