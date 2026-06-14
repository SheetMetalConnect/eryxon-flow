/**
 * Public batch hooks API. The implementation is split by concern under
 * ./batches/ (types, queries, lifecycle mutations, content mutations); this
 * facade keeps the import path stable for all consumers.
 *
 * The legacy no-op `useRaiseMaterialRequirement` placeholder was removed —
 * use `useCreateBatchRequirement` instead.
 */

export type {
  Batch,
  BatchOperation,
  BatchRequirement,
  BatchStatus,
  BatchType,
  CreateBatchInput,
} from "./batches/types";

export {
  useBatch,
  useBatchOperations,
  useBatchRequirements,
  useBatches,
  useSubBatches,
} from "./batches/queries";

export {
  useCreateBatch,
  useDeleteBatch,
  useUpdateBatch,
  useUpdateBatchStatus,
} from "./batches/batchMutations";

export {
  useAddOperationsToBatch,
  useCreateBatchRequirement,
  useRemoveOperationFromBatch,
} from "./batches/batchContentMutations";
