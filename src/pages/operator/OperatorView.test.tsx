import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test/utils";
import OperatorView from "./OperatorView";

const mockFetchOperationsWithDetails = vi.fn();

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    id: "profile-1",
    tenant_id: "tenant-1",
    role: "operator",
    full_name: "Shared Terminal",
    email: "terminal@example.com",
  }),
}));

vi.mock("@/contexts/OperatorContext", () => ({
  useOperator: () => ({
    activeOperator: {
      id: "operator-1",
      employee_id: "OP-100",
      full_name: "Alex Operator",
    },
  }),
}));

vi.mock("@/hooks/useCADProcessing", () => ({
  useCADProcessing: () => ({
    processCAD: vi.fn(),
    isProcessing: false,
  }),
  isCADServiceEnabled: () => false,
}));

vi.mock("@/lib/database", () => ({
  fetchOperationsWithDetails: (...args: unknown[]) =>
    mockFetchOperationsWithDetails(...args),
  startTimeTracking: vi.fn(),
  stopTimeTracking: vi.fn(),
  completeOperation: vi.fn(),
}));

vi.mock("@/components/terminal/DetailPanel", () => ({
  DetailPanel: ({ job }: { job: { jobCode: string; currentOp: string } }) => (
    <div data-testid="detail-panel">
      {job.jobCode}::{job.currentOp}
    </div>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCells = [
  { id: "cell-1", name: "Laser", color: "#2563eb" },
  { id: "cell-2", name: "Brake", color: "#16a34a" },
];

const createQueryBuilder = (data: unknown[]) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data, error: null }),
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "cells") {
        return createQueryBuilder(mockCells);
      }
      return createQueryBuilder([]);
    }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: null } }),
      })),
    },
  },
}));

const createOperation = (
  id: string,
  status: "in_progress" | "not_started",
  sequence: number,
  cellId = "cell-1",
) =>
  ({
    id,
    status,
    operation_name: `Op ${sequence}`,
    sequence,
    estimated_time: 2,
    actual_time: status === "in_progress" ? 0.5 : 0,
    notes: `note-${id}`,
    cell_id: cellId,
    cell: mockCells.find((cell) => cell.id === cellId),
    active_time_entry:
      status === "in_progress"
        ? {
            id: `time-${id}`,
            operator_id: "operator-1",
            operator: { full_name: "Alex Operator" },
          }
        : null,
    part: {
      id: `part-${id}`,
      part_number: `PART-${id}`,
      material: "Steel",
      quantity: sequence,
      file_paths: [],
      drawing_no: null,
      cnc_program_name: null,
      is_bullet_card: false,
      job: {
        id: `job-${id}`,
        job_number: `JOB-${sequence}`,
        due_date: "2026-03-20T00:00:00.000Z",
      },
    },
  }) as any;

describe("OperatorView", () => {
  beforeEach(() => {
    mockFetchOperationsWithDetails.mockResolvedValue([
      createOperation("1", "in_progress", 1),
      createOperation("2", "not_started", 2),
      createOperation("3", "not_started", 3),
      createOperation("4", "not_started", 4),
      createOperation("5", "not_started", 5),
      createOperation("6", "not_started", 6),
      createOperation("7", "not_started", 7),
    ]);
    window.localStorage.clear();
  });

  it("loads queue groups and lets the user select a work packet", async () => {
    render(<OperatorView />);

    await waitFor(() => {
      expect(screen.getByText("JOB-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("JOB-1"));

    await waitFor(() => {
      expect(screen.getByTestId("detail-panel")).toHaveTextContent("JOB-1::Op 1");
    });
  });

  it("summarizes buffer and expected queue counts", async () => {
    render(<OperatorView />);

    await waitFor(() => {
      expect(screen.getByText("JOB-1")).toBeInTheDocument();
    });

    // Section headings show format: "terminal.inBuffer (5)"
    const headings = screen.getAllByRole("heading", { level: 2 });
    const bufferHeading = headings.find(h => h.textContent?.includes("inBuffer"));
    const expectedHeading = headings.find(h => h.textContent?.includes("expected"));
    expect(bufferHeading).toHaveTextContent("5");
    expect(expectedHeading).toHaveTextContent("1");
  });
});
