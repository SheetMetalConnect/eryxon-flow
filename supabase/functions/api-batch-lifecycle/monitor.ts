export interface MonitoredBatchOperation {
  operationId: string;
  operationName: string | null;
  status: string;
  estimatedTime: number | null;
  partId: string | null;
  partNumber: string | null;
  jobId: string | null;
  jobNumber: string | null;
  customer: string | null;
}

export interface MonitoredBatch {
  id: string;
  batchNumber: string;
  batchType: string;
  status: string;
  productionMode: "manual" | "automated";
  startedAt: string | null;
  estimatedTime: number | null;
  operations: MonitoredBatchOperation[];
}

export interface OperationExpectation {
  id: string;
}

export interface AutomatedExceptionMonitorRepository {
  listAutomatedBatches(
    tenantId: string,
    batchId?: string,
  ): Promise<MonitoredBatch[]>;
  findBatchOperationExpectation(
    tenantId: string,
    batchId: string,
    operationId: string,
  ): Promise<OperationExpectation | null>;
  createBatchOperationExpectation(input: {
    tenantId: string;
    batch: MonitoredBatch;
    operation: MonitoredBatchOperation;
    expectedAt: string;
  }): Promise<OperationExpectation>;
  hasActiveException(
    tenantId: string,
    expectationId: string,
  ): Promise<boolean>;
  createNonOccurrenceException(input: {
    tenantId: string;
    expectationId: string;
    batch: MonitoredBatch;
    operation: MonitoredBatchOperation;
    expectedAt: string;
    detectedAt: string;
    overdueMinutes: number;
  }): Promise<void>;
}

export interface AutomatedExceptionMonitorOptions {
  now?: () => Date;
}

function resolveExpectedMinutes(batch: MonitoredBatch): number {
  if (typeof batch.estimatedTime === "number" && batch.estimatedTime > 0) {
    return Math.round(batch.estimatedTime);
  }

  const total = batch.operations.reduce(
    (sum, operation) => sum + (operation.estimatedTime ?? 0),
    0,
  );
  return total > 0 ? Math.round(total) : 0;
}

export function createAutomatedExceptionMonitor(
  repository: AutomatedExceptionMonitorRepository,
  options: AutomatedExceptionMonitorOptions = {},
) {
  const now = options.now ?? (() => new Date());

  return {
    async run(tenantId: string, batchId?: string) {
      const monitoredBatches = await repository.listAutomatedBatches(
        tenantId,
        batchId,
      );

      const detectedAt = now().toISOString();
      let createdExceptions = 0;

      for (const batch of monitoredBatches) {
        if (
          batch.productionMode !== "automated" ||
          batch.batchType !== "laser_nesting" ||
          batch.status !== "in_progress" ||
          !batch.startedAt
        ) {
          continue;
        }

        const expectedMinutes = resolveExpectedMinutes(batch);
        if (expectedMinutes <= 0) {
          continue;
        }

        const expectedAt = new Date(
          new Date(batch.startedAt).getTime() + expectedMinutes * 60_000,
        ).toISOString();
        const overdueMinutes = Math.round(
          (new Date(detectedAt).getTime() - new Date(expectedAt).getTime()) /
            60_000,
        );

        if (overdueMinutes <= 0) {
          continue;
        }

        for (const operation of batch.operations) {
          if (operation.status === "completed") {
            continue;
          }

          let expectation = await repository.findBatchOperationExpectation(
            tenantId,
            batch.id,
            operation.operationId,
          );
          if (!expectation) {
            expectation = await repository.createBatchOperationExpectation({
              tenantId,
              batch,
              operation,
              expectedAt,
            });
          }

          const hasActiveException = await repository.hasActiveException(
            tenantId,
            expectation.id,
          );
          if (hasActiveException) {
            continue;
          }

          await repository.createNonOccurrenceException({
            tenantId,
            expectationId: expectation.id,
            batch,
            operation,
            expectedAt,
            detectedAt,
            overdueMinutes,
          });
          createdExceptions += 1;
        }
      }

      return {
        monitored_batches: monitoredBatches.length,
        created_exceptions: createdExceptions,
        monitored_at: detectedAt,
      };
    },
  };
}
