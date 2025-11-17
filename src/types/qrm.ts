/**
 * QRM (Quick Response Manufacturing) Types
 *
 * These types support visual indicators for work-in-progress limits,
 * capacity management, and routing visualization.
 */

export type QRMStatus = 'normal' | 'warning' | 'at_capacity' | 'no_limit';

export interface CellQRMMetrics {
  cell_id: string;
  cell_name: string;
  current_wip: number;
  wip_limit: number | null;
  wip_warning_threshold: number | null;
  enforce_limit: boolean;
  show_warning: boolean;
  utilization_percent: number | null;
  status: QRMStatus;
  jobs_in_cell: Array<{
    job_id: string;
    job_number: string;
  }> | null;
}

export interface NextCellCapacity {
  has_capacity: boolean;
  warning?: boolean;
  next_cell_id: string | null;
  next_cell_name?: string;
  current_wip?: number;
  wip_limit?: number | null;
  enforce_limit?: boolean;
  message: string;
}

export interface RoutingStep {
  cell_id: string;
  cell_name: string;
  cell_color: string | null;
  sequence: number;
  operation_count: number;
  completed_operations: number;
  parts_in_cell?: number;
}

export type PartRouting = RoutingStep[];
export type JobRouting = RoutingStep[];

/**
 * Get visual color for QRM status
 */
export function getQRMStatusColor(status: QRMStatus): string {
  switch (status) {
    case 'normal':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'at_capacity':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'no_limit':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Get lucide-react icon name for QRM status
 */
export function getQRMStatusIcon(status: QRMStatus): string {
  switch (status) {
    case 'normal':
      return 'CheckCircle2';
    case 'warning':
      return 'AlertTriangle';
    case 'at_capacity':
      return 'XCircle';
    case 'no_limit':
      return 'Infinity';
    default:
      return 'HelpCircle';
  }
}

/**
 * Format WIP display text
 */
export function formatWIPDisplay(current: number, limit: number | null): string {
  if (limit === null) {
    return `${current}`;
  }
  return `${current}/${limit}`;
}

/**
 * Calculate if WIP is at warning threshold
 */
export function isAtWarningThreshold(
  current: number,
  limit: number | null,
  threshold: number | null
): boolean {
  if (limit === null) return false;
  const effectiveThreshold = threshold ?? Math.floor(limit * 0.8);
  return current >= effectiveThreshold && current < limit;
}

/**
 * Calculate if WIP is at capacity
 */
export function isAtCapacity(current: number, limit: number | null): boolean {
  if (limit === null) return false;
  return current >= limit;
}

/**
 * Get routing progress percentage
 */
export function getRoutingProgress(routing: RoutingStep[]): number {
  if (routing.length === 0) return 0;

  const totalOperations = routing.reduce((sum, step) => sum + step.operation_count, 0);
  const completedOperations = routing.reduce((sum, step) => sum + step.completed_operations, 0);

  if (totalOperations === 0) return 0;
  return Math.round((completedOperations / totalOperations) * 100);
}
