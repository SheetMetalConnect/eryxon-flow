import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Proof for the terminal-load fix: when the batch-context enrichment query
 * fails the way it did in production (a PostgREST 400 from an oversized `.in()`
 * at scale), fetchOperationLookupDetails must still return the operations with
 * batch_context = null — instead of throwing and blanking the whole terminal.
 */

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

const OP_ROW = {
  id: "op-1",
  status: "in_progress",
  tenant_id: "tenant-1",
  cell_id: "cell-1",
  sequence: 1,
  part: { id: "part-1", part_number: "P-1", job: { id: "job-1", job_number: "J-1" } },
  cell: { id: "cell-1", name: "Laser", color: "#000", sequence: 1 },
};

/** Thenable query builder; awaiting resolves to the per-table result. */
function makeBuilder(table: string) {
  const result =
    table === "operations"
      ? { data: [OP_ROW], error: null }
      : table === "batch_operations"
        ? // Simulate the production failure: 414 URI Too Long on the batch query.
          { data: null, error: { code: "PGRST", message: "414 Request-URI Too Large" } }
        : { data: [], error: null };

  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "in", "like", "order", "neq"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

const fromSpy = vi.fn((table: string) => makeBuilder(table));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (table: string) => fromSpy(table) },
}));

afterEach(() => vi.clearAllMocks());

describe("terminal load resilience: batch enrichment failure", () => {
  it("still returns operations (batch_context null) when the batch query 400s", async () => {
    const { fetchOperationLookupDetails } = await import("./operations");

    // Must NOT throw — this is exactly what blanked the terminal before.
    const result = await fetchOperationLookupDetails("tenant-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("op-1");
    expect(result[0].batch_context).toBeNull();
    // Confirm the batch query was actually attempted (and failed) on this path.
    expect(fromSpy).toHaveBeenCalledWith("batch_operations");
  });
});
