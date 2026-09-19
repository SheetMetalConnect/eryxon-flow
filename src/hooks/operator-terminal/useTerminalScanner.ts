import { useCallback, useState } from "react";
import type { OperationWithDetails } from "@/lib/db";
import {
  buildOperationScanLabel,
  findOperationsByScanToken,
  type ScanFeedback,
} from "@/lib/operatorScanner";
import { isClosedOperation } from "@/features/operator-terminal/model";

interface TerminalScannerOptions {
  lookupOperations: OperationWithDetails[];
  onSelect: (operationId: string) => void;
  operatorId: string | null | undefined;
  selectedCellId: string;
  setSelectedCellId: (cellId: string) => void;
}

export function useTerminalScanner({
  lookupOperations,
  onSelect,
  operatorId,
  selectedCellId,
  setSelectedCellId,
}: TerminalScannerOptions) {
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);

  const handleScannerToken = useCallback(async (rawToken: string) => {
    const matches = findOperationsByScanToken(lookupOperations, rawToken);
    if (matches.length !== 1) {
      setScanFeedback({
        kind: "error",
        token: rawToken,
        reason: matches.length === 0 ? "no_match" : "duplicate_match",
        matchCount: matches.length || undefined,
      });
      return;
    }

    const match = matches[0];
    const operationLabel = buildOperationScanLabel(match);
    if (isClosedOperation(match)) {
      setScanFeedback({ kind: "error", token: rawToken, reason: "closed", operationLabel });
      return;
    }
    if (match.active_time_entry?.operator_id && match.active_time_entry.operator_id !== operatorId) {
      setScanFeedback({
        kind: "error",
        token: rawToken,
        reason: "active_by_other_operator",
        operationLabel,
        activeOperatorName: match.active_time_entry.operator.full_name,
      });
      return;
    }

    if (selectedCellId !== "all" && selectedCellId !== match.cell_id) {
      setSelectedCellId(match.cell_id);
      localStorage.setItem("operator_selected_cell", match.cell_id);
    }
    onSelect(match.id);
    setScanFeedback({ kind: "success", token: rawToken, operationId: match.id, operationLabel });
  }, [lookupOperations, onSelect, operatorId, selectedCellId, setSelectedCellId]);

  return { handleScannerToken, scanFeedback, setScanFeedback };
}
