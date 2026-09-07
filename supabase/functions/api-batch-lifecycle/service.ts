import type { EventType } from "@shared/events.ts";

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

export interface BatchLifecycleEvent {
  eventType: EventType;
  data: Record<string, unknown>;
  context?: {
    cell?: string;
  };
}

export interface BatchLifecycleEventDispatcher {
  dispatch(tenantId: string, event: BatchLifecycleEvent): Promise<void>;
}

export function createBatchLifecycleService(
  repository: BatchLifecycleRepository,
  eventDispatcher: BatchLifecycleEventDispatcher,
) {
  async function transition(tenantId: string, batchId: string, action: "start" | "stop", operatorId: string | null) {
    const result = await repository.transitionBatch(tenantId, batchId, action, operatorId);
    if (result.changed === false) return result;
    try {
      const batch = await repository.getBatch(tenantId, batchId);
      if (!batch) throw new Error("Committed batch could not be read");
      const operations = await repository.listBatchOperations(tenantId, batchId);
      const eventAction = action === "start" ? "started" : "completed";
      const timestamp = action === "start" ? result.started_at : result.completed_at;
      const common = {
        batch_id: batch.id,
        batch_number: batch.batchNumber,
        batch_type: batch.batchType,
        production_mode: batch.productionMode,
        monitoring_source: operatorId ? "operator" : "machine",
        operator_id: operatorId,
        [`${eventAction}_at`]: timestamp,
      };
      const context = batch.cellId ? { cell: batch.cellId } : undefined;
      await eventDispatcher.dispatch(tenantId, {
        eventType: `batch.${eventAction}`,
        data: { ...common, operations: operations.length, total_minutes: result.total_minutes, distribution: result.operations },
        context,
      });
      for (const operation of operations) {
        await eventDispatcher.dispatch(tenantId, {
          eventType: `operation.${eventAction}`,
          data: {
            ...common,
            operation_id: operation.operationId,
            operation_name: operation.operationName,
            part_id: operation.partId,
            part_number: operation.partNumber,
            job_id: operation.jobId,
            job_number: operation.jobNumber,
            customer: operation.customer,
            estimated_time: operation.estimatedTime,
            actual_time: operation.actualTime,
          },
          context,
        });
      }
    } catch (error) {
      console.error("Committed batch event dispatch failed", error);
    }
    return result;
  }
  return {
    startBatch: (tenantId: string, batchId: string, operatorId: string | null) => transition(tenantId, batchId, "start", operatorId),
    stopBatch: (tenantId: string, batchId: string, operatorId: string | null) => transition(tenantId, batchId, "stop", operatorId),
  };
}
