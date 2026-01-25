/**
 * QRM Hooks Module
 *
 * Quick Response Manufacturing (QRM) hooks for metrics, capacity, and routing.
 *
 * Architecture:
 *   - useCellMetrics.ts: Cell-level QRM metrics (SRP)
 *   - useCapacity.ts: Capacity checking (SRP)
 *   - useRouting.ts: Part and job routing visualization (SRP)
 *
 * Usage:
 *   import { useCellQRMMetrics, useJobRouting } from '@/hooks/qrm';
 */

// Cell Metrics
export { useCellQRMMetrics, useAllCellsQRMMetrics } from "./useCellMetrics";

// Capacity
export { useNextCellCapacity } from "./useCapacity";

// Routing
export {
  usePartRouting,
  useJobRouting,
  useMultipleJobsRouting,
} from "./useRouting";
