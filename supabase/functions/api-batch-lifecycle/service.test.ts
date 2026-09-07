import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type BatchLifecycleEvent,
  type BatchLifecycleRepository,
  type BatchTransitionResult,
  createBatchLifecycleService,
} from "./service.ts";

function fixture(result: BatchTransitionResult) {
  const calls: string[] = [];
  const events: BatchLifecycleEvent[] = [];
  const repository: BatchLifecycleRepository = {
    transitionBatch: async () => { calls.push("transaction"); return result; },
    getBatch: async () => ({ id: "batch", batchNumber: "B-1", batchType: "laser_nesting", status: result.status, cellId: "cell", productionMode: "automated" }),
    listBatchOperations: async () => [{ operationId: "op", operationName: "Cut", estimatedTime: 10, actualTime: 20, partId: "part", partNumber: "P-1", jobId: "job", jobNumber: "J-1", customer: null }],
  };
  const dispatcher = { dispatch: (_tenant: string, event: BatchLifecycleEvent): Promise<void> => { calls.push("event"); events.push(event); return Promise.resolve(); } };
  return { repository, dispatcher, calls, events };
}

Deno.test("batch events only follow the committed transaction", async () => {
  const f = fixture({ batch_id: "batch", status: "in_progress", changed: true, started_at: "2026-01-01T00:00:00Z" });
  await createBatchLifecycleService(f.repository, f.dispatcher).startBatch("tenant", "batch", null);
  assertEquals(f.calls, ["transaction", "event", "event"]);
  assertEquals(f.events.map(e => e.eventType), ["batch.started", "operation.started"]);
});

Deno.test("failed transaction cannot emit successful lifecycle events", async () => {
  const f = fixture({ batch_id: "batch", status: "in_progress" });
  f.repository.transitionBatch = () => Promise.reject(new Error("transaction rejected"));
  await assertRejects(() => createBatchLifecycleService(f.repository, f.dispatcher).startBatch("tenant", "batch", "operator"), Error, "transaction rejected");
  assertEquals(f.events, []);
});

Deno.test("idempotent transition does not repeat events", async () => {
  const f = fixture({ batch_id: "batch", status: "completed", changed: false });
  await createBatchLifecycleService(f.repository, f.dispatcher).stopBatch("tenant", "batch", "operator");
  assertEquals(f.calls, ["transaction"]);
});

Deno.test("failed notification does not turn a committed transition into a retry", async () => {
  const result = { batch_id: "batch", status: "completed", total_minutes: 20, operations: [{ id: "op", minutes: 20 }] };
  const f = fixture(result);
  f.dispatcher.dispatch = () => Promise.reject(new Error("notification unavailable"));
  assertEquals(await createBatchLifecycleService(f.repository, f.dispatcher).stopBatch("tenant", "batch", "operator"), result);
});
