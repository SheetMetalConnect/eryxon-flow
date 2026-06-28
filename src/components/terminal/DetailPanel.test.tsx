import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test/utils";
import { DetailPanel } from "./DetailPanel";

vi.mock("@/components/STEPViewerLazy", () => ({
  STEPViewer: () => <div>STEP</div>,
}));

vi.mock("@/components/PDFViewerLazy", () => ({
  PDFViewer: () => <div>PDF</div>,
}));

vi.mock("./OperationResources", () => ({
  OperationResources: () => <div>resources</div>,
}));

vi.mock("./AssemblyDependencies", () => ({
  AssemblyDependencies: () => <div>dependencies</div>,
}));

vi.mock("./CncProgramQrCode", () => ({
  CncProgramQrCode: () => <div>qr</div>,
}));

vi.mock("./JobFlowProgress", () => ({
  JobFlowProgress: () => <div>flow</div>,
}));

vi.mock("@/components/operator/IssueForm", () => ({
  default: () => null,
}));

vi.mock("@/components/operator/ProductionQuantityModal", () => ({
  default: () => null,
}));

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({ tenant_id: "tenant-1" }),
}));

vi.mock("@/hooks/useQRMMetrics", () => ({
  useCellQRMMetrics: () => ({ metrics: null }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

const substepRows = [
  {
    id: "sub-1",
    operation_id: "op-1",
    name: "Clamp fixture",
    sequence: 1,
    status: "not_started",
    notes: "Use the blue fixture before cutting.",
  },
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table !== "substeps") {
        throw new Error(`Unexpected table ${table}`);
      }
      const chain: any = {};
      chain.select = () => chain;
      chain.in = () => chain;
      chain.eq = () => chain;
      chain.order = () => Promise.resolve({ data: substepRows, error: null });
      return chain;
    },
  },
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
  status: "in_buffer" as const,
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
  isBulletCard: false,
};

const operations = [
  {
    id: "op-1",
    operation_name: "Laser cutting",
    operation_type: "cutting",
    sequence: 1,
    estimated_time: 2,
    actual_time: 0,
    status: "not_started",
    completion_percentage: 0,
    notes: null,
    assigned_operator_id: null,
    cell_id: "cell-1",
    planned_start: null,
    cell: { id: "cell-1", name: "Laser", color: "#2563eb", sequence: 1 },
    part: {
      id: "part-1",
      part_number: "PART-001",
      material: "Steel",
      quantity: 4,
      parent_part_id: null,
      file_paths: [],
      image_paths: null,
      drawing_no: null,
      cnc_program_name: null,
      is_bullet_card: false,
      job: {
        id: "job-parent-1",
        job_number: "JOB-001",
        customer: null,
        due_date: "2026-05-30T00:00:00.000Z",
        due_date_override: null,
      },
    },
  },
];

describe("DetailPanel", () => {
  it("omits the instruction section entirely when there are no notes", async () => {
    substepRows.splice(0, substepRows.length);

    render(<DetailPanel job={baseJob} operations={operations as any} />);

    // No empty placeholder — the Instruction label/section is simply not shown.
    await waitFor(() => {
      expect(screen.getByText(/terminal\.routing/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/terminal\.instructions\.missingTitle/)).not.toBeInTheDocument();
    expect(screen.queryByText(/terminal\.instructionLabel/)).not.toBeInTheDocument();
  });

  it("expands routing substeps from the Steps tab", async () => {
    substepRows.splice(0, substepRows.length, {
      id: "sub-1",
      operation_id: "op-1",
      name: "Clamp fixture",
      sequence: 1,
      status: "not_started",
      notes: null,
    });

    render(<DetailPanel job={baseJob} operations={operations as any} />);

    // The routing operation is visible in the default Steps tab; its substeps
    // stay collapsed until the operator taps the operation row.
    await waitFor(() => {
      expect(screen.getByText("Laser cutting")).toBeInTheDocument();
    });

    expect(screen.queryByText("Clamp fixture")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Laser cutting"));

    await waitFor(() => {
      expect(screen.getByText("Clamp fixture")).toBeInTheDocument();
    });
  });
});
