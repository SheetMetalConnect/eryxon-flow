import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type BatchLifecycleRepository, type BatchTransitionResult, createBatchLifecycleService } from "./service.ts";

function repository(result: BatchTransitionResult): BatchLifecycleRepository {
  return {
    transitionBatch: () => Promise.resolve(result),
    getBatch: () => Promise.resolve(null),
    listBatchOperations: () => Promise.resolve([]),
  };
}

Deno.test("start and stop return the committed transaction result", async () => {
  const result = { batch_id: "batch", status: "in_progress", changed: true, started_at: "2026-01-01T00:00:00Z" };
  const service = createBatchLifecycleService(repository(result));
  assertEquals(await service.startBatch("tenant", "batch", null), result);
  assertEquals(await service.stopBatch("tenant", "batch", "operator"), result);
});

Deno.test("a rejected transaction propagates", async () => {
  const repo = repository({ batch_id: "batch", status: "in_progress" });
  repo.transitionBatch = () => Promise.reject(new Error("transaction rejected"));
  await assertRejects(() => createBatchLifecycleService(repo).startBatch("tenant", "batch", "operator"), Error, "transaction rejected");
});
