import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOperator } from "@/contexts/OperatorContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Square, ChevronDown, ChevronUp } from "lucide-react";
import { stopTimeTracking } from "@/lib/database";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

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

  const loadActiveEntries = useCallback(async () => {
    if (!operatorId) return;

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
      `
      )
      .eq("operator_id", operatorId)
      .is("end_time", null);

    if (!error && data) {
      setActiveEntries(data as any);
    }
  }, [operatorId]);

  useEffect(() => {
    if (!operatorId) return;

    const loadTimeout = window.setTimeout(() => {
      void loadActiveEntries();
    }, 0);

    // Update every second for elapsed time
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    // Subscribe to time entries changes
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
          loadActiveEntries();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(loadTimeout);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [operatorId, loadActiveEntries]);

  const handleStop = async (operationId: string) => {
    if (!operatorId) return;

    try {
      await stopTimeTracking(operationId, operatorId);
      toast.success(t("operations.timeTrackingStopped"));
      loadActiveEntries();
    } catch (error: any) {
      toast.error(error.message || t("operations.failedToStopTimeTracking"));
    }
  };

  if (activeEntries.length === 0) return null;

  return (
    <Card className="bg-active-work/5 border-active-work/30 overflow-hidden">
      {/* Header - always visible, clickable to toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-3 hover:bg-active-work/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-active-work animate-pulse" />
          <span className="font-semibold text-sm">{t("operations.currentlyTiming")}</span>
          <span className="text-xs text-active-work bg-active-work/20 px-1.5 py-0.5 rounded-full">
            {activeEntries.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Show first entry summary when collapsed */}
          {isCollapsed && activeEntries[0] && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              {activeEntries[0].operation.operation_name}
            </span>
          )}
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content - collapsible */}
      <div
        className={cn(
          "transition-all duration-200 ease-in-out overflow-hidden",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
        )}
      >
        <div className="px-3 pb-3 space-y-2">
          {activeEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 bg-background rounded-lg border"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-sm">{entry.operation.operation_name}</div>
                <div className="text-xs text-muted-foreground">
                  {t("operations.job")} {entry.operation.part.job.job_number} • {entry.operation.part.part_number}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {t("operations.started")} {formatDistanceToNow(new Date(entry.start_time), { addSuffix: true })}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStop(entry.operation_id);
                }}
                className="gap-1.5 ml-3 h-8 text-xs"
              >
                <Square className="h-3 w-3" />
                {t("operations.stop")}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
