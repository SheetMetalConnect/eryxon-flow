import type { OperationWithDetails } from "@/lib/database";

export type ScanFailureReason =
  | "no_match"
  | "duplicate_match"
  | "closed"
  | "active_by_other_operator";

export interface ScanFeedback {
  kind: "success" | "error";
  token: string;
  reason?: ScanFailureReason;
  operationId?: string;
  operationLabel?: string;
  matchCount?: number;
  activeOperatorName?: string | null;
}

export function normalizeScanToken(token: string): string {
  return token.trim().replace(/\s+/g, "").toUpperCase();
}

export function getOperationScanTokens(operation: OperationWithDetails): string[] {
  const candidates = [
    operation.id,
    operation.part.job.job_number,
    operation.part.part_number,
    operation.part.drawing_no,
    `${operation.part.job.job_number}:${operation.part.part_number}`,
    `${operation.part.job.job_number}:${operation.part.part_number}:${operation.sequence}`,
  ];

  return Array.from(
    new Set(
      candidates
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map(normalizeScanToken),
    ),
  );
}

export function findOperationsByScanToken(
  operations: OperationWithDetails[],
  token: string,
): OperationWithDetails[] {
  const normalizedToken = normalizeScanToken(token);
  if (!normalizedToken) return [];

  return operations.filter((operation) =>
    getOperationScanTokens(operation).includes(normalizedToken),
  );
}

export function buildOperationScanLabel(operation: OperationWithDetails): string {
  return `${operation.part.job.job_number} / ${operation.part.part_number} / ${operation.operation_name}`;
}
