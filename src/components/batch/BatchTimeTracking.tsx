import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Play, Square, Clock, Timer, Divide } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface BatchTimeTrackingProps {
  batchId: string;
  batchStatus: string;
  actualTime: number | null | undefined;
  operationsCount: number;
}

export function BatchTimeTracking({ batchId, batchStatus, actualTime, operationsCount }: BatchTimeTrackingProps) {
  const { t } = useTranslation();
  const { data: activeTimer } = useBatchActiveTimer(batchId);
  const startTimer = useStartBatchTimer();
  const stopTimer = useStopBatchTimer();

  const isTimerActive = !!activeTimer?.isActive;
  const canStartTimer =
    !isTimerActive &&
    operationsCount > 0 &&
    batchStatus !== "completed" &&
    batchStatus !== "cancelled";

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          {t("batches.timeTracking.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6 py-4">
          {isTimerActive && activeTimer?.startTime ? (
            <div className="text-center">
              <ElapsedTimer startTime={activeTimer.startTime} />
              <p className="text-sm text-muted-foreground mt-2">
                {t("batches.timeTracking.distributed", {
                  count: operationsCount,
                })}
              </p>
            </div>
          ) : actualTime ? (
            <div className="text-center">
              <span className="font-mono text-3xl font-bold">
                {actualTime} {t("operations.min")}
              </span>
              <p className="text-sm text-muted-foreground mt-2">
                {t("batches.timeTracking.totalTime")} ·{" "}
                {operationsCount > 0
                  ? `${Math.round(
                    actualTime / operationsCount
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

          <div className="flex gap-3">
            {canStartTimer && (
              <Button
                size="lg"
                onClick={() => startTimer.mutate(batchId)}
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
                onClick={() => stopTimer.mutate(batchId)}
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
  );
}
