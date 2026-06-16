import { describe, expect, it, vi } from "vitest";

import {
  deriveIssueLocationContext,
  uploadIssueAttachments,
} from "@/lib/issues/reporting";

describe("deriveIssueLocationContext", () => {
  it("prefers the part current cell and picks the earliest incomplete next cell", () => {
    expect(
      deriveIssueLocationContext({
        operationCellId: "op-cell",
        partCurrentCellId: "part-cell",
        operationSequence: 20,
        nextOperations: [
          { cell_id: "cell-40", sequence: 40, status: "not_started" },
          { cell_id: "cell-30", sequence: 30, status: "in_progress" },
          { cell_id: "cell-50", sequence: 50, status: "completed" },
        ],
      }),
    ).toEqual({
      currentCellId: "part-cell",
      intendedNextCellId: "cell-30",
    });
  });

  it("falls back to the operation cell and returns no next cell when nothing qualifies", () => {
    expect(
      deriveIssueLocationContext({
        operationCellId: "op-cell",
        partCurrentCellId: null,
        operationSequence: 20,
        nextOperations: [{ cell_id: null, sequence: 30, status: "not_started" }],
      }),
    ).toEqual({
      currentCellId: "op-cell",
      intendedNextCellId: null,
    });
  });
});

describe("uploadIssueAttachments", () => {
  it("keeps successful uploads and reports failed files without throwing", async () => {
    const upload = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "Bucket not found" } });

    const result = await uploadIssueAttachments({
      storage: {
        from: () => ({ upload }),
      },
      tenantId: "tenant-1",
      issueId: "issue-1",
      files: {
        0: new File(["one"], "one.png", { type: "image/png" }),
        1: new File(["two"], "two.png", { type: "image/png" }),
        length: 2,
        item: (index: number) =>
          index === 0
            ? new File(["one"], "one.png", { type: "image/png" })
            : index === 1
              ? new File(["two"], "two.png", { type: "image/png" })
              : null,
      } as FileList,
    });

    expect(upload).toHaveBeenCalledTimes(2);
    expect(result.uploadedPaths).toHaveLength(1);
    expect(result.failedFiles).toEqual(["two.png"]);
  });
});
