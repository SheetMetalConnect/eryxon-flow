import { useTranslation } from "react-i18next";
import { Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateBatchStatus } from "@/hooks/useBatches";

interface BatchStatusActionsProps {
  batchId: string;
  batchStatus: string;
  isTimerActive: boolean;
}

export function BatchStatusActions({ batchId, batchStatus, isTimerActive }: BatchStatusActionsProps) {
  const { t } = useTranslation();
  const updateStatus = useUpdateBatchStatus();

  if (batchStatus === "completed" || batchStatus === "cancelled") {
    return null;
  }

  return (
    <div className="flex justify-end gap-3">
      {batchStatus === "blocked" ? (
        <Button
          variant="outline"
          onClick={() =>
            updateStatus.mutate({
              batchId,
              status: "ready",
            })
          }
          disabled={updateStatus.isPending}
        >
          {t("batches.unblock")}
        </Button>
      ) : (
        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          onClick={() =>
            updateStatus.mutate({
              batchId,
              status: "blocked",
            })
          }
          disabled={updateStatus.isPending || batchStatus === "in_progress"}
        >
          {t("batches.block")}
        </Button>
      )}

      {(batchStatus === "draft" || batchStatus === "ready") && (
        <Button
          variant="outline"
          onClick={() =>
            updateStatus.mutate({
              batchId,
              status: "in_progress",
            })
          }
          disabled={updateStatus.isPending}
        >
          <Play className="mr-2 h-4 w-4" />
          {t("batches.actions.start")}
        </Button>
      )}
      {batchStatus === "in_progress" && !isTimerActive && (
        <Button
          onClick={() =>
            updateStatus.mutate({
              batchId,
              status: "completed",
            })
          }
          disabled={updateStatus.isPending}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {t("batches.actions.complete")}
        </Button>
      )}
    </div>
  );
}
