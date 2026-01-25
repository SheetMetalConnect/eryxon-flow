/**
 * QRM Metrics Hooks
 *
 * Re-exports from modular QRM hooks for backward compatibility.
 * New code should import directly from '@/hooks/qrm'.
 *
 * @deprecated Import from '@/hooks/qrm' instead
 */

// Re-export all hooks from modular files
export {
  // Cell Metrics
  useCellQRMMetrics,
  useAllCellsQRMMetrics,
  // Capacity
  useNextCellCapacity,
  // Routing
  usePartRouting,
  useJobRouting,
  useMultipleJobsRouting,
} from "./qrm";
