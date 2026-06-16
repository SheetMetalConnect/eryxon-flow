// Backward-compatible re-export from domain modules.
// New code should import from '@/lib/db' or the specific sub-module directly.
export {
  fetchOperationsWithDetails,
  fetchOperationLookupDetails,
  startTimeTracking,
  completeOperation,
  stopTimeTracking,
  adminStopTimeTracking,
  stopAllActiveTimeEntries,
  pauseTimeTracking,
  resumeTimeTracking,
  fetchChildParts,
  fetchParentPart,
  checkChildPartsCompletion,
  checkAssemblyDependencies,
  startBatchTimeTracking,
  stopBatchTimeTracking,
} from './db';
export type { OperationWithDetails } from './db';
