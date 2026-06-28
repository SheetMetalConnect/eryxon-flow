import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/utils";
import { JobRow } from "./JobRow";

vi.mock("./TerminalCellInfo", () => ({
  TerminalCellInfo: () => <div data-testid="terminal-cell-info">cell</div>,
}));

const baseJob = {
  id: "job-1",
  jobCode: "JOB-001",
  description: "PART-001",
  material: "Steel",
  quantity: 4,
  currentOp: "Laser cutting",
  totalOps: 3,
  hours: 2,
  dueDate: "2026-05-30T00:00:00.000Z",
  status: "on_hold" as const,
  hasPdf: false,
  hasModel: false,
  operationId: "op-1",
  partId: "part-1",
  jobId: "job-parent-1",
  filePaths: [],
  notes: null,
  operationType: "cutting",
  cellName: "Laser",
  cellColor: "#2563eb",
  cellId: "cell-1",
  currentSequence: 1,
  isBulletCard: true,
};

describe("JobRow", () => {
  it("shows QRM cards as row formatting, not chips", () => {
    render(
      <table>
        <tbody>
          <JobRow
            job={baseJob}
            isSelected={false}
            onClick={() => {}}
            variant="buffer"
          />
        </tbody>
      </table>,
    );

    // No encoding pills any more — status/bullet/yellow are row formatting.
    expect(screen.queryByText(/terminal\.encoding\./)).not.toBeInTheDocument();
    // On-hold job = Yellow Card → amber row formatting.
    expect(screen.getByRole("row")).toHaveClass("border-l-amber-500");
    expect(screen.getByRole("row")).toHaveClass("bg-amber-500/10");
  });
});
