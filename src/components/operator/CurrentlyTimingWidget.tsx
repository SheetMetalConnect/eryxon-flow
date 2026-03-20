import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOperator } from "@/contexts/OperatorContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock3, Square, ChevronDown, ChevronUp, TimerReset } from "lucide-react";
import { stopTimeTracking } from "@/lib/database";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { OperatorPanel, OperatorStatusChip } from "./OperatorStation";

interface ActiveEntry {
  id: string;
  operation_id: string;
  start_time: string;
  operation: {
    operation_name: string;
    part: {
      part_number: string;
      job: {
        job_number: string;
      };
    };
  };
}

export default function CurrentlyTimingWidget() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { activeOperator } = useOperator();
  const operatorId = activeOperator?.id || profile?.id;
  const [activeEntries, setActiveEntries] = useState<ActiveEntry[]>([]);
  const [, setTick] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const operatorIdRef = useRef<string | null>(operatorId || null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    operatorIdRef.current = operatorId || null;
    queueMicrotask(() => {
      setActiveEntries([]);
    });
  }, [operatorId]);

  const loadActiveEntries = useCallback(async () => {
    if (!operatorId) {
      setActiveEntries([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    const requestedOperatorId = operatorId;

    const { data, error } = await supabase
      .from("time_entries")
      .select(
        `
        id,
        operation_id,
        start_time,
        operation:operations(
          operation_name,
          part:parts(
            part_number,
            job:jobs(job_number)
          )
        )
      `,
      )
      .eq("operator_id", requestedOperatorId)
      .is("end_time", null);

    if (
      !error &&
      data &&
      requestIdRef.current === requestId &&
      operatorIdRef.current === requestedOperatorId
    ) {
      setActiveEntries(data as ActiveEntry[]);
    }
  }, [operatorId]);

  useEffect(() => {
    if (!operatorId) return;

    queueMicrotask(() => {
      void loadActiveEntries();
    });

    const interval = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    const channel = supabase
      .channel("my-time-entries")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_entries",
          filter: `operator_id=eq.${operatorId}`,
        },
        () => {
          void loadActiveEntries();
        },
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [operatorId, loadActiveEntries]);

  const handleStop = async (operationId: string) => {
    if (!operatorId) return;

    const requestedOperatorId = operatorId;

    try {
      await stopTimeTracking(operationId, requestedOperatorId);
      if (operatorIdRef.current !== requestedOperatorId) return;
      toast.success(t("operations.timeTrackingStopped"));
      await loadActiveEntries();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("operations.failedToStopTimeTracking"),
      );
    }
  };

  if (activeEntries.length === 0) return null;

  return (
    <OperatorPanel className="overflow-hidden p-0">
      <button
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/20"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500">
            <TimerReset className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("operations.currentlyTiming")}
            </div>
            <div className="truncate text-sm font-semibold text-foreground">
              {activeEntries.length === 1
                ? activeEntries[0].operation.operation_name
                : t("operations.currentlyTiming")}{" "}
              {activeEntries.length > 1 ? `(${activeEntries.length})` : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <OperatorStatusChip
            icon={Clock3}
            tone="warning"
            label={`${activeEntries.length} ${t("common.active", "active")}`}
            className="hidden sm:inline-flex"
          />
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[420px] opacity-100",
        )}
      >
        <div className="border-t border-border px-4 py-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-border bg-muted/20 p-3"
              >
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">
                    {entry.operation.operation_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("operations.job")} {entry.operation.part.job.job_number} •{" "}
                    {entry.operation.part.part_number}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("operations.started")}{" "}
                    {formatDistanceToNow(new Date(entry.start_time), {
                      addSuffix: true,
                    })}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleStop(entry.operation_id);
                  }}
                  className="mt-3 min-h-11 w-full gap-2 rounded-xl"
                >
                  <Square className="h-4 w-4" />
                  {t("operations.stop")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </OperatorPanel>
  );
}
