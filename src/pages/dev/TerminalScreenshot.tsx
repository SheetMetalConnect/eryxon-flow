import { DetailPanel } from "@/components/terminal/DetailPanel";
import type { TerminalJob } from "@/types/terminal";
import type { OperationWithDetails } from "@/lib/database";

// DEV-only harness used to capture docs screenshots of the operator detail
// panel. The data mirrors the app's bundled demo dataset (mockDataGenerator):
// the CR-PANEL-A1 cleanroom panel on job WO-2025-1089. Not a production route.
const job: TerminalJob = {
  id: "demo-job",
  jobCode: "WO-2025-1089",
  description: "CR-PANEL-A1 — RVS bedieningspaneel cleanroom",
  material: "RVS 316L",
  quantity: 8,
  producedQuantity: 3,
  currentOp: "TIG lassen",
  totalOps: 5,
  hours: 72, // remaining MINUTES (estimated − booked), matching the DB contract
  dueDate: "2026-01-17T00:00:00.000Z",
  status: "in_progress",
  hasPdf: false,
  hasModel: false,
  operationId: "op-3",
  partId: "part-cr-panel-a1",
  jobId: "job-1089",
  filePaths: [],
  isCurrentUserClocked: true,
  notes: "TIG lassen montagepunten — Argon 99.999% — cleanroom weld.",
  operationType: "welding",
  cellName: "Lassen",
  cellColor: "#ef4444",
  cellId: "cell-lassen",
  currentSequence: 30,
  drawingNo: "CR-PANEL-A1",
  cncProgramName: "CR_PANEL_A1.nc",
  isBulletCard: true,
  batchContext: {
    batchId: "batch-1",
    batchNumber: "NEST-1089-3",
    batchType: "nest",
    status: "in_progress",
    parentBatchNumber: null,
    operationsCount: 6,
  },
};

const part = {
  id: "part-cr-panel-a1",
  part_number: "CR-PANEL-A1",
  material: "RVS 316L",
  quantity: 8,
  parent_part_id: null,
  file_paths: [],
  image_paths: null,
  drawing_no: "CR-PANEL-A1",
  cnc_program_name: "CR_PANEL_A1.nc",
  is_bullet_card: true,
  job: {
    id: "job-1089",
    job_number: "WO-2025-1089",
    customer: "TechnoStaal Engineering",
    due_date: "2026-01-17T00:00:00.000Z",
    due_date_override: null,
  },
};

// Mirrors the CR-PANEL-A1 routing from mockDataGenerator.ts.
const routing: Array<[string, string, number, string, string, string]> = [
  ["op-1", "Lasersnijden RVS", 10, "cell-laser", "Lasersnijden", "#3b82f6"],
  ["op-2", "Precisie kanten", 20, "cell-bend", "CNC Kantbank", "#f59e0b"],
  ["op-3", "TIG lassen", 30, "cell-lassen", "Lassen", "#ef4444"],
  ["op-4", "Elektropolish", 40, "cell-finish", "Afwerking", "#10b981"],
  ["op-5", "Cleanroom inspectie", 50, "cell-qc", "Kwaliteitscontrole", "#6366f1"],
];
const statusByOp: Record<string, string> = {
  "op-1": "completed",
  "op-2": "completed",
  "op-3": "in_progress",
  "op-4": "not_started",
  "op-5": "not_started",
};
// estimated_time is stored in MINUTES (mockDataGenerator seeds estimated_hours × 60).
const estMinutesByOp: Record<string, number> = {
  "op-1": 48,
  "op-2": 30,
  "op-3": 72,
  "op-4": 36,
  "op-5": 24,
};

const operations: OperationWithDetails[] = routing.map(
  ([id, name, sequence, cellId, cellName, color]) => ({
    id,
    operation_name: name,
    operation_type: name.toLowerCase(),
    sequence,
    estimated_time: estMinutesByOp[id],
    actual_time: 0,
    status: statusByOp[id],
    completion_percentage: 0,
    notes: null,
    assigned_operator_id: null,
    cell_id: cellId,
    planned_start: null,
    cell: { id: cellId, name: cellName, color, sequence },
    part,
  }),
  // Safe: DEV-only harness mirroring mockDataGenerator.ts; DetailPanel only
  // reads the fields provided here, so the partial shape never hits a gap.
) as unknown as OperationWithDetails[];

export default function TerminalScreenshot() {
  return (
    <div className="flex min-h-screen justify-center bg-muted/40 sm:items-center sm:p-8">
      <div
        data-testid="screenshot-panel"
        className="h-screen w-full max-w-[760px] overflow-hidden border-x border-border bg-card shadow-2xl sm:h-[880px] sm:rounded-2xl sm:border"
      >
        <DetailPanel
          job={job}
          operations={operations}
          locationTrackingEnabled
          startActionLabel="Start"
          pauseActionLabel="Pause"
        />
      </div>
    </div>
  );
}
