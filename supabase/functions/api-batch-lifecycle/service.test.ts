import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { BadRequestError } from "@shared/validation/errorHandler.ts";
import {
  ActiveTimeEntry,
  BatchLifecycleBatch,
  BatchLifecycleEvent,
  BatchLifecycleEventDispatcher,
  BatchLifecycleOperation,
  BatchLifecycleRepository,
  createBatchLifecycleService,
} from "./service.ts";

class InMemoryRepository implements BatchLifecycleRepository {
  constructor(
    readonly batch: BatchLifecycleBatch,
    readonly operations: BatchLifecycleOperation[],
    readonly activeTimeEntries: ActiveTimeEntry[] = [],
  ) {}

  insertedTimeEntries: Array<Record<string, unknown>> = [];
  startedOperations: string[] = [];
  completedOperations: string[] = [];
  batchStarted: { startedAt: string; startedBy: string | null } | null = null;
  batchCompleted:
    | { completedAt: string; completedBy: string | null; actualTime: number }
    | null = null;
  operationActualTimes = new Map<string, number>();
  closedEntries: Array<{ entryId: string; endedAt: string; durationMinutes: number }> = [];

  async getBatch(_tenantId: string, _batchId: string): Promise<BatchLifecycleBatch | null> {
    return this.batch;
  }

  async listBatchOperations(_tenantId: string, _batchId: string): Promise<BatchLifecycleOperation[]> {
    return this.operations;
  }

  async insertTimeEntries(
    tenantId: string,
    operatorId: string,
    operationIds: string[],
    startedAt: string,
  ): Promise<void> {
    this.insertedTimeEntries = operationIds.map((operationId) => ({
      tenantId,
      operatorId,
      operationId,
      startedAt,
    }));
  }

  async updateOperationsStarted(
    _tenantId: string,
    operationIds: string[],
    _startedAt: string,
  ): Promise<void> {
    this.startedOperations = [...operationIds];
  }

  async listActiveTimeEntries(_tenantId: string, _operationIds: string[]): Promise<ActiveTimeEntry[]> {
    return this.activeTimeEntries;
  }

  async closeTimeEntry(
    _tenantId: string,
    entryId: string,
    endedAt: string,
    durationMinutes: number,
  ): Promise<void> {
    this.closedEntries.push({ entryId, endedAt, durationMinutes });
  }

  async getOperationActualTime(_tenantId: string, operationId: string): Promise<number> {
    return this.operationActualTimes.get(operationId) ?? 0;
  }

  async updateOperationActualTime(
    _tenantId: string,
    operationId: string,
    actualTime: number,
  ): Promise<void> {
    this.operationActualTimes.set(operationId, actualTime);
  }

  async updateOperationsCompleted(
    _tenantId: string,
    operationIds: string[],
    _completedAt: string,
  ): Promise<void> {
    this.completedOperations = [...operationIds];
  }

  async updateBatchStarted(
    _tenantId: string,
    _batchId: string,
    startedAt: string,
    startedBy: string | null,
  ): Promise<void> {
    this.batchStarted = { startedAt, startedBy };
  }

  async updateBatchCompleted(
    _tenantId: string,
    _batchId: string,
    completedAt: string,
    completedBy: string | null,
    actualTime: number,
  ): Promise<void> {
    this.batchCompleted = { completedAt, completedBy, actualTime };
  }
}

class RecordingDispatcher implements BatchLifecycleEventDispatcher {
  events: BatchLifecycleEvent[] = [];

  async dispatch(_tenantId: string, event: BatchLifecycleEvent): Promise<void> {
    this.events.push(event);
  }
}

function createOperation(operationId: string, estimatedTime: number): BatchLifecycleOperation {
  return {
    operationId,
    operationName: `Operation ${operationId}`,
    estimatedTime,
    actualTime: 0,
    partId: `part-${operationId}`,
    partNumber: `PART-${operationId}`,
    jobId: `job-${operationId}`,
    jobNumber: `JOB-${operationId}`,
    customer: "Acme",
  };
}

Deno.test("manual batches require operator_id for lifecycle monitoring", async () => {
  const repository = new InMemoryRepository(
    {
      id: "batch-1",
      batchNumber: "NEST-001",
      batchType: "laser_nesting",
      status: "draft",
      cellId: "laser-cutting",
      productionMode: "manual",
    },
    [createOperation("op-1", 10)],
  );
  const dispatcher = new RecordingDispatcher();
  const service = createBatchLifecycleService(repository, dispatcher);

  await assertRejects(
    () => service.startBatch("tenant-1", "batch-1", null),
    BadRequestError,
    "operator_id is required for manual batches",
  );
});

Deno.test("automated start emits batch and operation monitoring events", async () => {
  const repository = new InMemoryRepository(
    {
      id: "batch-1",
      batchNumber: "NEST-001",
      batchType: "laser_nesting",
      status: "ready",
      cellId: "laser-cutting",
      productionMode: "automated",
    },
    [createOperation("op-1", 10), createOperation("op-2", 20)],
  );
  const dispatcher = new RecordingDispatcher();
  const service = createBatchLifecycleService(repository, dispatcher, {
    now: () => new Date("2026-05-27T21:00:00.000Z"),
  });

  const result = await service.startBatch("tenant-1", "batch-1", null);

  assertEquals(result.monitoring_source, "machine");
  assertEquals(repository.insertedTimeEntries.length, 0);
  assertEquals(repository.startedOperations, ["op-1", "op-2"]);
  assertEquals(dispatcher.events.map((event) => event.eventType), [
    "batch.started",
    "operation.started",
    "operation.started",
  ]);
  assertEquals(dispatcher.events[0].data.production_mode, "automated");
});

Deno.test("automated stop distributes time and emits completion events", async () => {
  const repository = new InMemoryRepository(
    {
      id: "batch-1",
      batchNumber: "NEST-001",
      batchType: "laser_nesting",
      status: "in_progress",
      cellId: "laser-cutting",
      productionMode: "automated",
    },
    [createOperation("op-1", 10), createOperation("op-2", 20)],
    [
      { id: "te-1", operationId: "op-1", startTime: "2026-05-27T20:00:00.000Z" },
      { id: "te-2", operationId: "op-2", startTime: "2026-05-27T20:00:00.000Z" },
    ],
  );
  const dispatcher = new RecordingDispatcher();
  const service = createBatchLifecycleService(repository, dispatcher, {
    now: () => new Date("2026-05-27T21:00:00.000Z"),
  });

  const result = await service.stopBatch("tenant-1", "batch-1", null);

  assertEquals(result.total_minutes, 60);
  assertEquals(result.distribution_method, "weighted");
  assertEquals(result.operations, [
    { id: "op-1", minutes: 20 },
    { id: "op-2", minutes: 40 },
  ]);
  assertEquals(repository.batchCompleted?.actualTime, 60);
  assertEquals(repository.operationActualTimes.get("op-1"), 20);
  assertEquals(repository.operationActualTimes.get("op-2"), 40);
  assertEquals(dispatcher.events.map((event) => event.eventType), [
    "batch.completed",
    "operation.completed",
    "operation.completed",
  ]);
});
