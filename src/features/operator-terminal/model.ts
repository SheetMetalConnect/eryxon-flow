import type { OperationBatchContext, OperationWithDetails } from "@/lib/db";
import type { TerminalJob } from "@/types/terminal";
import {
  getTerminalJobModeSummary,
  parseOperatorTerminalModeNote,
  type OperatorTerminalMode,
  type OperatorTerminalWorkModeSettings,
} from "./workModes";
import { deriveOperationFlowState, isReleased } from "./release";

export interface TerminalCell {
  id: string;
  name: string;
  color: string | null;
}

export type BatchScanMode = "single" | "batch";

export interface TerminalModeCounts {
  blockedSetup: number;
  blockedWorkingHours: number;
  readyForSetup: number;
  readyForProduction: number;
  inSetup: number;
  inProduction: number;
}

export interface BatchPromptState {
  batchId: string;
  batchNumber: string;
  batchType: string;
  parentBatchNumber: string | null;
  totalMembers: number;
  readyMembers: number;
  completedMembers: number;
  activeMembers: number;
  unavailableReason: string | null;
  mode: BatchScanMode | null;
  isBatchActionAvailable: boolean;
  isBatchTimerActive: boolean;
}

export function isClosedOperation(operation: OperationWithDetails) {
  return operation.status === "completed" ||
    operation.batch_context?.status === "completed" ||
    operation.batch_context?.status === "cancelled";
}

export function buildBatchPrompt(
  batch: OperationBatchContext | null | undefined,
  operationId: string | null,
  operatorId: string | null | undefined,
  selectedMode: BatchScanMode | null,
): BatchPromptState | null {
  if (!batch || !operationId || batch.members.length <= 1) return null;

  const completed = batch.members.filter((member) => member.status === "completed");
  const active = batch.members.filter((member) => member.active_time_entry);
  const partial = batch.members.some(
    (member) => member.operation_id !== operationId &&
      (member.status !== "not_started" || Boolean(member.active_time_entry)),
  );
  const ready = batch.members.filter(
    (member) => member.status === "not_started" && !member.active_time_entry,
  );
  const batchTimerTag = `batch:${batch.batch_id}`;
  const isBatchTimerActive = batch.members.some(
    (member) => member.active_time_entry?.operator_id === operatorId &&
      member.active_time_entry.notes === batchTimerTag,
  );

  let unavailableReason: string | null = null;
  if (batch.status === "completed" || batch.status === "cancelled") unavailableReason = "closed";
  else if (partial) unavailableReason = "partial";
  else if (active.some((member) => member.active_time_entry?.operator_id !== operatorId)) {
    unavailableReason = "active_elsewhere";
  } else if (completed.length > 0) unavailableReason = "completed_members";

  return {
    batchId: batch.batch_id,
    batchNumber: batch.batch_number,
    batchType: batch.batch_type,
    parentBatchNumber: batch.parent_batch?.batch_number ?? null,
    totalMembers: batch.members.length,
    readyMembers: ready.length,
    completedMembers: completed.length,
    activeMembers: active.length,
    unavailableReason,
    mode: isBatchTimerActive ? "batch" : selectedMode,
    isBatchActionAvailable: unavailableReason === null,
    isBatchTimerActive,
  };
}

interface JobMappingContext {
  allOperations: OperationWithDetails[];
  locationByPart: Map<string, string>;
  operatorId: string | null | undefined;
  producedByOperation: Map<string, number>;
  selectedMode: OperatorTerminalMode;
  sequentialRelease: boolean;
  settings: OperatorTerminalWorkModeSettings;
  workingHoursActive: boolean;
}

export function mapOperationToTerminalJob(
  operation: OperationWithDetails,
  context: JobMappingContext,
): TerminalJob {
  const paths = operation.part.file_paths ?? [];
  const released = isReleased(operation, context.allOperations);
  const flowState = deriveOperationFlowState(operation, context.allOperations);
  let status: TerminalJob["status"] = flowState === 'active' ? 'in_progress' : flowState;
  if (operation.active_time_entry && operation.status !== "on_hold") status = "in_progress";

  const activeMode = parseOperatorTerminalModeNote(operation.active_time_entry?.notes);
  const remaining = Math.max(0, (operation.estimated_time || 0) - (operation.actual_time || 0));

  return {
    id: operation.id,
    operationId: operation.id,
    partId: operation.part.id,
    jobId: operation.part.job.id,
    jobCode: String(operation.part.job.job_number ?? ""),
    description: String(operation.part.part_number ?? ""),
    material: typeof operation.part.material === "string" ? operation.part.material : "",
    quantity: Number(operation.part.quantity) || 0,
    producedQuantity: context.producedByOperation.get(operation.id) ?? 0,
    currentOp: String(operation.operation_name ?? ""),
    totalOps: 0,
    hours: Number(remaining.toFixed(1)),
    dueDate: operation.part.job.due_date ?? new Date().toISOString(),
    status,
    released,
    startBlocked: context.sequentialRelease && !released,
    hasPdf: paths.some((path) => path.toLowerCase().endsWith(".pdf")),
    hasModel: paths.some((path) => /\.(step|stp)$/i.test(path)),
    filePaths: paths,
    activeTimeEntryId: operation.active_time_entry?.id,
    activeOperatorId: operation.active_time_entry?.operator_id,
    activeOperatorName: operation.active_time_entry?.operator?.full_name,
    isCurrentUserClocked: operation.active_time_entry?.operator_id === context.operatorId,
    operatorMode: activeMode,
    modeSummary: getTerminalJobModeSummary({
      activeMode,
      settings: context.settings,
      selectedMode: context.selectedMode,
      hasSetupHistory: operation.operator_mode_summary?.has_setup_history ?? false,
      workingHoursActive: context.workingHoursActive,
    }),
    notes: operation.notes,
    operationType: operation.operation_type,
    cellName: String(operation.cell.name ?? ""),
    cellColor: operation.cell.color ?? "#3b82f6",
    cellId: operation.cell_id,
    currentSequence: operation.sequence,
    drawingNo: operation.part.drawing_no,
    cncProgramName: operation.part.cnc_program_name,
    isBulletCard: Boolean(operation.part.is_bullet_card),
    plannedStart: operation.planned_start,
    locationCode: context.locationByPart.get(operation.part.id) ?? null,
    batchContext: operation.batch_context ? {
      batchId: operation.batch_context.batch_id,
      batchNumber: operation.batch_context.batch_number,
      batchType: operation.batch_context.batch_type,
      status: operation.batch_context.status,
      parentBatchNumber: operation.batch_context.parent_batch?.batch_number ?? null,
      operationsCount: operation.batch_context.operations_count,
    } : null,
  };
}

export function countTerminalModes(jobs: TerminalJob[]): TerminalModeCounts {
  const counts: TerminalModeCounts = {
    blockedSetup: 0,
    blockedWorkingHours: 0,
    readyForSetup: 0,
    readyForProduction: 0,
    inSetup: 0,
    inProduction: 0,
  };
  for (const job of jobs) {
    const key = job.modeSummary?.readiness;
    if (key === "blocked_setup") counts.blockedSetup += 1;
    else if (key === "blocked_working_hours") counts.blockedWorkingHours += 1;
    else if (key === "ready_for_setup") counts.readyForSetup += 1;
    else if (key === "ready_for_production") counts.readyForProduction += 1;
    else if (key === "in_setup") counts.inSetup += 1;
    else if (key === "in_production") counts.inProduction += 1;
  }
  return counts;
}
