// Domain modules for database operations
// Split from monolithic database.ts for maintainability

export {
  fetchOperationsWithDetails,
  startTimeTracking,
  completeOperation,
} from './operations';
export type { OperationWithDetails } from './operations';

export {
  stopTimeTracking,
  adminStopTimeTracking,
  stopAllActiveTimeEntries,
  pauseTimeTracking,
  resumeTimeTracking,
} from './time-tracking';

export {
  fetchChildParts,
  fetchParentPart,
  checkChildPartsCompletion,
  checkAssemblyDependencies,
} from './assemblies';

export {
  startBatchTimeTracking,
  stopBatchTimeTracking,
} from './batches';
