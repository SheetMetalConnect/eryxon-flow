import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapError, throwDatabaseError } from "./errorHandler.ts";

const mapped = (code: string, message = "x") => {
  try {
    throwDatabaseError({ code, message });
  } catch (error) {
    return mapError(error);
  }
  throw new Error("expected throw");
};

Deno.test("production rule violations become 409 CONFLICT with the rule text", () => {
  const result = mapped("22023", "Previous operation must be completed first");
  assertEquals(result.status, 409);
  assertEquals(result.code, "CONFLICT");
  assertEquals(result.message, "Previous operation must be completed first");
});

Deno.test("missing rows become 404 NOT_FOUND", () => {
  assertEquals(mapped("P0002", "Operation not found").status, 404);
});

Deno.test("constraint failures stay 400, unknown codes 500", () => {
  assertEquals(mapped("23503").status, 400);
  assertEquals(mapped("23505").status, 409);
  assertEquals(mapped("XX000").status, 500);
});
