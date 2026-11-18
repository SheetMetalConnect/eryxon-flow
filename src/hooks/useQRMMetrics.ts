/**
 * QRM Metrics Hooks
 *
 * Re-exports from modular QRM hooks for backward compatibility.
 * New code should import directly from '@/hooks/qrm'.
 *
 * @deprecated Import from '@/hooks/qrm' instead
 */

export {
  useCellQRMMetrics,
  useAllCellsQRMMetrics,
  useNextCellCapacity,
  usePartRouting,
  useJobRouting,
  useMultipleJobsRouting,
} from "./qrm";
