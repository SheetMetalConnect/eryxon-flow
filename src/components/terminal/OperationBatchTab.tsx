import { useTranslation } from "react-i18next";
import { Boxes } from "lucide-react";
import type { TerminalJob } from "@/types/terminal";

type BatchContext = NonNullable<TerminalJob["batchContext"]>;

/**
 * Read-only summary of the batch/nest this operation belongs to. The batch is
 * already on the job payload, so this stays a pure presentation component —
 * no queries, no duplication of the routing or flow shown elsewhere.
 */
export function OperationBatchTab({ batch }: { batch: BatchContext }) {
  const { t } = useTranslation();
  const isNest = batch.batchType?.toLowerCase().includes("nest");

  const status = batch.status
    ? batch.status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
    : "";

  const rows: Array<{ label: string; value: string }> = [
    { label: t("terminal.batchPanel.type", "Type"), value: isNest ? "Nest" : "Batch" },
    { label: t("terminal.batchPanel.status", "Status"), value: status },
    {
      label: t("terminal.batchPanel.operations", "Operations"),
      value: String(batch.operationsCount),
    },
  ];
  if (batch.parentBatchNumber) {
    rows.push({
      label: t("terminal.batchPanel.parent", "Parent batch"),
      value: batch.parentBatchNumber,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Boxes className="h-5 w-5 text-primary" />
        <span className="font-mono text-lg font-semibold text-foreground">
          {batch.batchNumber}
        </span>
      </div>

      <p className="text-sm leading-6 text-muted-foreground">
        {t(
          "terminal.batchPanel.intro",
          "This operation runs as part of a batch — it moves through production together with the other parts on it.",
        )}
      </p>

      <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {row.label}
            </dt>
            <dd className="text-sm font-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
