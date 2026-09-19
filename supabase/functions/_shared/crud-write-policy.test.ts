import { assertEquals, assertRejects } from "jsr:@std/assert";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateCrudWrite } from "./crud-write-policy.ts";

const unusedClient = {} as SupabaseClient;
const tenantId = "10000000-0000-4000-8000-000000000001";

Deno.test("batch writes accept documented configuration fields", async () => {
  const body = {
    batch_number: "NEST-001",
    batch_type: "laser_nesting",
    production_mode: "automated",
    material: "SS304",
    thickness_mm: 2,
  };

  assertEquals(
    await validateCrudWrite("operation_batches", body, tenantId, unusedClient),
    body,
  );
});

Deno.test("batch writes reject lifecycle and calculated fields", async () => {
  for (const field of ["status", "actual_time", "operations_count"]) {
    await assertRejects(
      () =>
        validateCrudWrite(
          "operation_batches",
          { [field]: field === "status" ? "completed" : 1 },
          tenantId,
          unusedClient,
        ),
      Error,
      `Field ${field} is not writable`,
    );
  }
});
