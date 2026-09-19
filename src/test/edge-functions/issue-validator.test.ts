import { describe, expect, it } from "vitest";
import { IssueValidator } from "../../../supabase/functions/_shared/validation/validators/IssueValidator.ts";

const operationId = "10000000-0000-4000-8000-000000000001";
const context = {
  tenantId: "10000000-0000-4000-8000-000000000002",
  validOperationIds: [operationId],
};

const baseNcr = {
  operation_id: operationId,
  title: "Dimension outside tolerance",
  description: "Measured value exceeds the drawing tolerance",
  severity: "high",
  issue_type: "ncr",
};

describe("IssueValidator database enum parity", () => {
  it("accepts the current NCR category and disposition values", () => {
    const result = new IssueValidator().validate(
      {
        ...baseNcr,
        ncr_category: "process_error",
        disposition: "rework",
      },
      context,
    );

    expect(result.valid).toBe(true);
  });

  it("rejects retired NCR values before they reach the database", () => {
    const result = new IssueValidator().validate(
      {
        ...baseNcr,
        ncr_category: "process",
        disposition: "repair",
      },
      context,
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.field)).toEqual([
      "ncr_category",
      "disposition",
    ]);
  });
});
