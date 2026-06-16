import { BadRequestError } from "@shared/validation/errorHandler.ts";
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

export interface ActiveTimeEntry {
  id: string;
  operationId: string;
  startTime: string;
}

export interface BatchLifecycleRepository {
  getBatch(tenantId: string, batchId: string): Promise<BatchLifecycleBatch | null>;
  listBatchOperations(tenantId: string, batchId: string): Promise<BatchLifecycleOperation[]>;
  insertTimeEntries(
    tenantId: string,
    operatorId: string,
    operationIds: string[],
    startedAt: string,
  ): Promise<void>;
  updateOperationsStarted(
    tenantId: string,
    operationIds: string[],
    startedAt: string,
  ): Promise<void>;
  listActiveTimeEntries(
    tenantId: string,
    operationIds: string[],
  ): Promise<ActiveTimeEntry[]>;
  closeTimeEntry(
    tenantId: string,
    entryId: string,
    endedAt: string,
    durationMinutes: number,
  ): Promise<void>;
  getOperationActualTime(tenantId: string, operationId: string): Promise<number>;
  updateOperationActualTime(
    tenantId: string,
    operationId: string,
    actualTime: number,
  ): Promise<void>;
  updateOperationsCompleted(
    tenantId: string,
    operationIds: string[],
    completedAt: string,
  ): Promise<void>;
  updateBatchStarted(
    tenantId: string,
    batchId: string,
    startedAt: string,
    startedBy: string | null,
  ): Promise<void>;
  updateBatchCompleted(
    tenantId: string,
    batchId: string,
    completedAt: string,
    completedBy: string | null,
    actualTime: number,
  ): Promise<void>;
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

export interface BatchLifecycleServiceOptions {
  now?: () => Date;
}

function requireMachineCompatibleBatch(batch: BatchLifecycleBatch, operatorId: string | null) {
  if (operatorId) {
    return;
  }

  if (batch.productionMode !== "automated") {
    throw new BadRequestError(
      "operator_id is required for manual batches; machine-reported monitoring is only allowed for automated batches",
    );
  }

  if (batch.batchType !== "laser_nesting") {
    throw new BadRequestError(
      "automated monitoring is only supported for laser_nesting batches",
    );
  }
}

function createEventContext(batch: BatchLifecycleBatch) {
  return batch.cellId ? { cell: batch.cellId } : undefined;
}

function createMonitoringSource(operatorId: string | null) {
  return operatorId ? "operator" : "machine";
}

function createOperationEventData(
  batch: BatchLifecycleBatch,
  operation: BatchLifecycleOperation,
  timestampKey: "started_at" | "completed_at",
  timestampValue: string,
  operatorId: string | null,
  actualTime?: number,
): Record<string, unknown> {
  return {
    batch_id: batch.id,
    batch_number: batch.batchNumber,
    batch_type: batch.batchType,
    production_mode: batch.productionMode,
    monitoring_source: createMonitoringSource(operatorId),
    operation_id: operation.operationId,
    operation_name: operation.operationName,
    part_id: operation.partId,
    part_number: operation.partNumber,
    job_id: operation.jobId,
    job_number: operation.jobNumber,
    customer: operation.customer,
    estimated_time: operation.estimatedTime,
    actual_time: actualTime,
    operator_id: operatorId,
    [timestampKey]: timestampValue,
  };
}

function distributeMinutes(
  operations: BatchLifecycleOperation[],
  totalMinutes: number,
): Array<{ id: string; minutes: number }> {
  const totalEstimated = operations.reduce(
    (sum, operation) => sum + (operation.estimatedTime ?? 0),
    0,
  );
  const useWeighted =
    totalEstimated > 0 &&
    operations.every((operation) => (operation.estimatedTime ?? 0) > 0);

  if (useWeighted) {
    let allocated = 0;
    return operations.map((operation, index) => {
      const minutes = index === operations.length - 1
        ? totalMinutes - allocated
        : Math.round(((operation.estimatedTime ?? 0) / totalEstimated) * totalMinutes);
      allocated += minutes;
      return { id: operation.operationId, minutes };
    });
  }

  const base = Math.floor(totalMinutes / operations.length);
  const remainder = totalMinutes - base * operations.length;
  return operations.map((operation, index) => ({
    id: operation.operationId,
    minutes: base + (index < remainder ? 1 : 0),
  }));
}

export function createBatchLifecycleService(
  repository: BatchLifecycleRepository,
  eventDispatcher: BatchLifecycleEventDispatcher,
  options: BatchLifecycleServiceOptions = {},
) {
  const now = options.now ?? (() => new Date());

  return {
    async startBatch(tenantId: string, batchId: string, operatorId: string | null) {
      const batch = await repository.getBatch(tenantId, batchId);
      if (!batch) {
        throw new BadRequestError("Batch not found");
      }

      if (batch.status !== "draft" && batch.status !== "ready") {
        throw new BadRequestError(
          `Cannot start batch in '${batch.status}' status`,
        );
      }

      requireMachineCompatibleBatch(batch, operatorId);

      const operations = await repository.listBatchOperations(tenantId, batchId);
      if (operations.length === 0) {
        throw new BadRequestError("Cannot start batch with no operations");
      }

      const operationIds = operations.map((operation) => operation.operationId);
      const startedAt = now().toISOString();

      if (operatorId) {
        await repository.insertTimeEntries(
          tenantId,
          operatorId,
          operationIds,
          startedAt,
        );
      }

      await repository.updateOperationsStarted(tenantId, operationIds, startedAt);
      await repository.updateBatchStarted(tenantId, batchId, startedAt, operatorId);

      const batchEvent: BatchLifecycleEvent = {
        eventType: "batch.started",
        data: {
          batch_id: batch.id,
          batch_number: batch.batchNumber,
          batch_type: batch.batchType,
          production_mode: batch.productionMode,
          monitoring_source: createMonitoringSource(operatorId),
          operations: operationIds.length,
          started_at: startedAt,
          operator_id: operatorId,
        },
        context: createEventContext(batch),
      };
      await eventDispatcher.dispatch(tenantId, batchEvent);

      for (const operation of operations) {
        await eventDispatcher.dispatch(tenantId, {
          eventType: "operation.started",
          data: createOperationEventData(
            batch,
            operation,
            "started_at",
            startedAt,
            operatorId,
          ),
          context: createEventContext(batch),
        });
      }

      return {
        batch_id: batchId,
        status: "in_progress",
        operations_started: operationIds.length,
        started_at: startedAt,
        monitoring_source: createMonitoringSource(operatorId),
      };
    },

    async stopBatch(tenantId: string, batchId: string, operatorId: string | null) {
      const batch = await repository.getBatch(tenantId, batchId);
      if (!batch) {
        throw new BadRequestError("Batch not found");
      }

      if (batch.status !== "in_progress") {
        throw new BadRequestError(
          `Cannot stop batch in '${batch.status}' status`,
        );
      }

      requireMachineCompatibleBatch(batch, operatorId);

      const operations = await repository.listBatchOperations(tenantId, batchId);
      if (operations.length === 0) {
        throw new BadRequestError("No operations in batch");
      }

      const operationIds = operations.map((operation) => operation.operationId);
      const activeEntries = await repository.listActiveTimeEntries(
        tenantId,
        operationIds,
      );

      const completedAtDate = now();
      const completedAt = completedAtDate.toISOString();
      let totalMinutes = 0;
      let distributionMethod = "none";
      let distribution: Array<{ id: string; minutes: number }> = [];

      if (activeEntries.length > 0) {
        const earliestEntry = Math.min(
          ...activeEntries.map((entry) => new Date(entry.startTime).getTime()),
        );
        totalMinutes = Math.round(
          (completedAtDate.getTime() - earliestEntry) / 60000,
        );
        distribution = distributeMinutes(operations, totalMinutes);
        distributionMethod = operations.every((operation) =>
            (operation.estimatedTime ?? 0) > 0
          ) && operations.some((operation) => (operation.estimatedTime ?? 0) > 0)
          ? "weighted"
          : "equal";

        for (const entry of activeEntries) {
          const allocation = distribution.find((item) =>
            item.id === entry.operationId
          );
          await repository.closeTimeEntry(
            tenantId,
            entry.id,
            completedAt,
            allocation?.minutes ?? 0,
          );
        }

        for (const allocation of distribution) {
          const actualTime = await repository.getOperationActualTime(
            tenantId,
            allocation.id,
          );
          await repository.updateOperationActualTime(
            tenantId,
            allocation.id,
            actualTime + allocation.minutes,
          );
        }
      }

      await repository.updateOperationsCompleted(
        tenantId,
        operationIds,
        completedAt,
      );
      await repository.updateBatchCompleted(
        tenantId,
        batchId,
        completedAt,
        operatorId,
        totalMinutes,
      );

      await eventDispatcher.dispatch(tenantId, {
        eventType: "batch.completed",
        data: {
          batch_id: batch.id,
          batch_number: batch.batchNumber,
          batch_type: batch.batchType,
          production_mode: batch.productionMode,
          monitoring_source: createMonitoringSource(operatorId),
          total_minutes: totalMinutes,
          distribution,
          completed_at: completedAt,
          operator_id: operatorId,
        },
        context: createEventContext(batch),
      });

      for (const operation of operations) {
        const allocation = distribution.find((item) =>
          item.id === operation.operationId
        );
        const actualTime = allocation?.minutes ?? operation.actualTime ?? 0;
        await eventDispatcher.dispatch(tenantId, {
          eventType: "operation.completed",
          data: createOperationEventData(
            batch,
            operation,
            "completed_at",
            completedAt,
            operatorId,
            actualTime,
          ),
          context: createEventContext(batch),
        });
      }

      return {
        batch_id: batchId,
        status: "completed",
        total_minutes: totalMinutes,
        distribution_method: distributionMethod,
        operations: distribution,
        monitoring_source: createMonitoringSource(operatorId),
      };
    },
  };
}
