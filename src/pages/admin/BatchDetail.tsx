import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ArrowLeft,
  Layers,
  Play,
  Square,
  Clock,
  CheckCircle2,
  Timer,
  Package,
  Divide,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBatch, useBatchOperations, useUpdateBatchStatus, type BatchStatus } from "@/hooks/useBatches";
import {
  useBatchActiveTimer,
  useStartBatchTimer,
  useStopBatchTimer,
} from "@/hooks/useBatchTimeTracking";

function ElapsedTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const update = () => {
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setElapsed(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="font-mono text-3xl font-bold tabular-nums">{elapsed}</span>
  );
}

const STATUS_COLORS: Record<BatchStatus, string> = {
  draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  ready: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: batch, isLoading: batchLoading } = useBatch(id);
  const { data: batchOperations, isLoading: opsLoading } = useBatchOperations(id);
  const { data: activeTimer } = useBatchActiveTimer(id);
  const startTimer = useStartBatchTimer();
  const stopTimer = useStopBatchTimer();
  const updateStatus = useUpdateBatchStatus();

  if (batchLoading || opsLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Clock className="mr-2 h-5 w-5 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="outline" onClick={() => navigate("/admin/batches")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("batches.backToBatches")}
        </Button>
        <p className="mt-4 text-muted-foreground">{t("batches.notFound")}</p>
      </div>
    );
  }

  const isTimerActive = !!activeTimer?.isActive;
  const canStartTimer =
    !isTimerActive &&
    batchOperations &&
    batchOperations.length > 0 &&
    batch.status !== "completed" &&
    batch.status !== "cancelled";
  const operationsCount = batchOperations?.length || 0;

  const statusKey =
    batch.status === "draft"
      ? "batches.status.draft"
      : batch.status === "ready"
      ? "batches.status.ready"
      : batch.status === "in_progress"
      ? "batches.status.inProgress"
      : batch.status === "completed"
      ? "batches.status.completed"
      : "batches.status.cancelled";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="outline"
          onClick={() => navigate("/admin/batches")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("batches.backToBatches")}
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Layers className="h-7 w-7" />
              {batch.batch_number}
            </h1>
            <p className="text-muted-foreground mt-1">
              {batch.cell?.name}
              {batch.material && ` · ${batch.material}`}
              {batch.thickness_mm && ` (${batch.thickness_mm}mm)`}
            </p>
          </div>
          <Badge className={STATUS_COLORS[batch.status as BatchStatus]}>
            {t(statusKey)}
          </Badge>
        </div>
      </div>

      {/* Batch Time Tracking Card */}
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            {t("batches.timeTracking.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6 py-4">
            {/* Timer Display */}
            {isTimerActive && activeTimer?.startTime ? (
              <div className="text-center">
                <ElapsedTimer startTime={activeTimer.startTime} />
                <p className="text-sm text-muted-foreground mt-2">
                  {t("batches.timeTracking.distributed", {
                    count: operationsCount,
                  })}
                </p>
              </div>
            ) : batch.actual_time ? (
              <div className="text-center">
                <span className="font-mono text-3xl font-bold">
                  {batch.actual_time} {t("operations.min")}
                </span>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("batches.timeTracking.totalTime")} ·{" "}
                  {operationsCount > 0
                    ? `${Math.round(
                        batch.actual_time / operationsCount
                      )} ${t("operations.min")} ${t(
                        "batches.timeTracking.perOperation"
                      ).toLowerCase()}`
                    : ""}
                </p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>{t("batches.timeTracking.noTimeYet")}</p>
              </div>
            )}

            {/* Distribution Info */}
            {operationsCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 text-sm">
                <Divide className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t("batches.timeTracking.distributionInfo", {
                    count: operationsCount,
                  })}
                </span>
              </div>
            )}

            {/* Start / Stop Buttons */}
            <div className="flex gap-3">
              {canStartTimer && (
                <Button
                  size="lg"
                  onClick={() => id && startTimer.mutate(id)}
                  disabled={startTimer.isPending}
                  className="gap-2"
                >
                  <Play className="h-5 w-5" />
                  {startTimer.isPending
                    ? t("common.loading")
                    : t("batches.timeTracking.startBatch")}
                </Button>
              )}
              {isTimerActive && (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => id && stopTimer.mutate(id)}
                  disabled={stopTimer.isPending}
                  className="gap-2"
                >
                  <Square className="h-5 w-5" />
                  {stopTimer.isPending
                    ? t("common.loading")
                    : t("batches.timeTracking.stopBatch")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {t("batches.type")}
            </p>
            <p className="font-medium mt-1">
              {t(`batches.types.${
                batch.batch_type === "laser_nesting"
                  ? "laserNesting"
                  : batch.batch_type === "tube_batch"
                  ? "tubeBatch"
                  : batch.batch_type === "saw_batch"
                  ? "sawBatch"
                  : batch.batch_type === "finishing_batch"
                  ? "finishingBatch"
                  : "general"
              }`)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {t("batches.operationsCount")}
            </p>
            <p className="font-medium mt-1">{operationsCount}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {t("batches.createdAt")}
            </p>
            <p className="font-medium mt-1">
              {format(new Date(batch.created_at), "dd/MM/yyyy HH:mm")}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {t("batches.timeTracking.totalTime")}
            </p>
            <p className="font-medium mt-1">
              {batch.actual_time
                ? `${batch.actual_time} ${t("operations.min")}`
                : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operations in Batch */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("batches.selectOperations")} ({operationsCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {batchOperations && batchOperations.length > 0 ? (
            <div className="space-y-3">
              {batchOperations.map((bo, index) => (
                <div
                  key={bo.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium">
                        {bo.operation?.operation_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {bo.operation?.part?.job?.job_number} ·{" "}
                        {bo.operation?.part?.part_number}
                        {bo.operation?.part?.quantity &&
                          ` · ${t("parts.qty")}: ${bo.operation.part.quantity}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {bo.operation?.status === "completed" ? (
                      <Badge
                        variant="secondary"
                        className="bg-green-500/10 text-green-500"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {t("operations.status.completed")}
                      </Badge>
                    ) : bo.operation?.status === "in_progress" ? (
                      <Badge
                        variant="secondary"
                        className="bg-orange-500/10 text-orange-500"
                      >
                        <Play className="mr-1 h-3 w-3" />
                        {t("operations.status.inProgress")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {t("operations.status.notStarted")}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6">
              {t("batches.noOperationsAvailable")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Status Actions */}
      {batch.status !== "completed" && batch.status !== "cancelled" && (
        <div className="flex justify-end gap-3">
          {(batch.status === "draft" || batch.status === "ready") && (
            <Button
              variant="outline"
              onClick={() =>
                updateStatus.mutate({
                  batchId: batch.id,
                  status: "in_progress",
                })
              }
              disabled={updateStatus.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              {t("batches.actions.start")}
            </Button>
          )}
          {batch.status === "in_progress" && !isTimerActive && (
            <Button
              onClick={() =>
                updateStatus.mutate({
                  batchId: batch.id,
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
      )}
    </div>
  );
}
