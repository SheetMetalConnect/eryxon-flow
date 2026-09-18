export type BatchProductionMode = "manual" | "automated";

export interface BatchLifecycleBatch {
  id: string;
  batchNumber: string;
  batchType: string;
  status: string;
  cellId: string | null;
  productionMode: BatchProductionMode;
}

export interface BatchLifecycleOperation {
  operationId: string;
  operationName: string | null;
  estimatedTime: number | null;
  actualTime: number | null;
  partId: string | null;
  partNumber: string | null;
  jobId: string | null;
  jobNumber: string | null;
  customer: string | null;
}

export interface BatchTransitionResult {
  batch_id: string;
  status: string;
  changed?: boolean;
  started_at?: string;
  completed_at?: string;
  operations_started?: number;
  total_minutes?: number;
  distribution_method?: string;
  operations?: Array<{ id: string; minutes: number }>;
  monitoring_source?: string;
}

export interface BatchLifecycleRepository {
  getBatch(tenantId: string, batchId: string): Promise<BatchLifecycleBatch | null>;
  listBatchOperations(tenantId: string, batchId: string): Promise<BatchLifecycleOperation[]>;
  transitionBatch(tenantId: string, batchId: string, action: "start" | "stop", operatorId: string | null): Promise<BatchTransitionResult>;
}

// Lifecycle events (batch.*, operation.*) are emitted by database triggers on commit.
export function createBatchLifecycleService(repository: BatchLifecycleRepository) {
  return {
    startBatch: (tenantId: string, batchId: string, operatorId: string | null) => repository.transitionBatch(tenantId, batchId, "start", operatorId),
    stopBatch: (tenantId: string, batchId: string, operatorId: string | null) => repository.transitionBatch(tenantId, batchId, "stop", operatorId),
  };
}
