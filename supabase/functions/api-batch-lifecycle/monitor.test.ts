import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  AutomatedExceptionMonitorRepository,
  MonitoredBatch,
  createAutomatedExceptionMonitor,
} from "./monitor.ts";

class InMemoryMonitorRepository implements AutomatedExceptionMonitorRepository {
  constructor(readonly batches: MonitoredBatch[]) {}

  expectations = new Map<string, string>();
  activeExceptions = new Set<string>();
  createdExceptions: Array<{ expectationId: string; operationId: string }> = [];

  async listAutomatedBatches(_tenantId: string, batchId?: string) {
    return batchId
      ? this.batches.filter((batch) => batch.id === batchId)
      : this.batches;
  }

  async findBatchOperationExpectation(
    _tenantId: string,
    batchId: string,
    operationId: string,
  ) {
    const key = `${batchId}:${operationId}`;
    const id = this.expectations.get(key);
    return id ? { id } : null;
  }

  async createBatchOperationExpectation({
    batch,
    operation,
  }: {
    tenantId: string;
    batch: MonitoredBatch;
    operation: MonitoredBatch["operations"][number];
    expectedAt: string;
  }) {
    const key = `${batch.id}:${operation.operationId}`;
    const id = `exp-${key}`;
    this.expectations.set(key, id);
    return { id };
  }

  async hasActiveException(_tenantId: string, expectationId: string) {
    return this.activeExceptions.has(expectationId);
  }

  async createNonOccurrenceException({
    expectationId,
    operation,
  }: {
    tenantId: string;
    expectationId: string;
    batch: MonitoredBatch;
    operation: MonitoredBatch["operations"][number];
    expectedAt: string;
    detectedAt: string;
    overdueMinutes: number;
  }) {
    this.activeExceptions.add(expectationId);
    this.createdExceptions.push({
      expectationId,
      operationId: operation.operationId,
    });
  }
}

const monitoredBatch: MonitoredBatch = {
  id: "batch-1",
  batchNumber: "NEST-001",
  batchType: "laser_nesting",
  status: "in_progress",
  productionMode: "automated",
  startedAt: "2026-05-27T19:00:00.000Z",
  estimatedTime: 30,
  operations: [
    {
      operationId: "op-1",
      operationName: "Laser cut panel A",
      status: "in_progress",
      estimatedTime: 10,
      partId: "part-1",
      partNumber: "PART-1",
      jobId: "job-1",
      jobNumber: "JOB-1",
      customer: "Acme",
    },
    {
      operationId: "op-2",
      operationName: "Laser cut panel B",
      status: "not_started",
      estimatedTime: 20,
      partId: "part-2",
      partNumber: "PART-2",
      jobId: "job-1",
      jobNumber: "JOB-1",
      customer: "Acme",
    },
  ],
};

Deno.test("automated monitor creates non-occurrence exceptions for overdue laser batch operations", async () => {
  const repository = new InMemoryMonitorRepository([monitoredBatch]);
  const monitor = createAutomatedExceptionMonitor(repository, {
    now: () => new Date("2026-05-27T20:00:00.000Z"),
  });

  const result = await monitor.run("tenant-1", "batch-1");

  assertEquals(result.monitored_batches, 1);
  assertEquals(result.created_exceptions, 2);
  assertEquals(repository.createdExceptions, [
    { expectationId: "exp-batch-1:op-1", operationId: "op-1" },
    { expectationId: "exp-batch-1:op-2", operationId: "op-2" },
  ]);
});

Deno.test("automated monitor skips completed operations and avoids duplicate active exceptions", async () => {
  const repository = new InMemoryMonitorRepository([
    {
      ...monitoredBatch,
      operations: [
        { ...monitoredBatch.operations[0], status: "completed" },
        monitoredBatch.operations[1],
      ],
    },
  ]);
  repository.expectations.set("batch-1:op-2", "exp-batch-1:op-2");
  repository.activeExceptions.add("exp-batch-1:op-2");

  const monitor = createAutomatedExceptionMonitor(repository, {
    now: () => new Date("2026-05-27T20:00:00.000Z"),
  });

  const result = await monitor.run("tenant-1", "batch-1");

  assertEquals(result.created_exceptions, 0);
  assertEquals(repository.createdExceptions, []);
});
