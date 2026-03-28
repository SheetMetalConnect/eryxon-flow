/**
 * OperatorStatusBar — Premium top bar that reflects operator state.
 *
 * States:
 * - idle (yellow stripes)  — not clocked on, operator should be working
 * - active (green)         — clocked on a normal job
 * - rush (red→green)       — clocked on a rush/bullet_card job
 * - stale (amber pulse)    — clocked on but >2h since start, no change
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useOperator } from "@/contexts/OperatorContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Square } from "lucide-react";
import { ROUTES } from "@/routes";
import { stopTimeTracking } from "@/lib/database";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type OperatorState = "idle" | "active" | "rush" | "stale";

interface ActiveEntry {
  id: string;
  operationId: string;
  startTime: string;
  operationName: string;
  jobNumber: string;
  partNumber: string;
  isRush: boolean;
}

interface StatusData {
  state: OperatorState;
  count: number;
  startTime: string | null;
  operationName: string | null;
  jobNumber: string | null;
  entries: ActiveEntry[];
}

/** Diagonal stripe CSS pattern */
const stripePattern = (color1: string, color2: string, size = 8) =>
  `repeating-linear-gradient(
    -45deg,
    ${color1},
    ${color1} ${size}px,
    ${color2} ${size}px,
    ${color2} ${size * 2}px
  )`;

const STATE_STYLES: Record<OperatorState, {
  bg: string;
  border: string;
  text: string;
  dot: string;
  stripe: string;
  animate?: string;
}> = {
  idle: {
    bg: "bg-amber-500/8",
    border: "border-amber-500/30",
    text: "text-amber-400",
    dot: "bg-amber-500",
    stripe: stripePattern("rgba(245,158,11,0.08)", "transparent", 6),
    animate: "animate-stripe-scroll",
  },
  active: {
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
    stripe: stripePattern("rgba(16,185,129,0.06)", "transparent", 6),
  },
  rush: {
    bg: "bg-gradient-to-r from-red-500/10 via-red-500/5 to-emerald-500/10",
    border: "border-red-500/40",
    text: "text-red-400",
    dot: "bg-red-500",
    stripe: stripePattern("rgba(239,68,68,0.10)", "rgba(16,185,129,0.04)", 6),
    animate: "animate-stripe-scroll-fast",
  },
  stale: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-500/80",
    dot: "bg-amber-500",
    stripe: stripePattern("rgba(245,158,11,0.05)", "transparent", 10),
    animate: "animate-stripe-scroll",
  },
};

export function OperatorStatusBar() {
  const { t } = useTranslation();
  const profile = useProfile();
  const { activeOperator } = useOperator();
  const operatorId = activeOperator?.id || profile?.id;
  const operatorName = activeOperator?.full_name || profile?.full_name || "";
  const navigate = useNavigate();

  const [statusData, setStatusData] = useState<StatusData>({
    state: "idle",
    count: 0,
    startTime: null,
    operationName: null,
    jobNumber: null,
    entries: [],
  });
  const [elapsed, setElapsed] = useState("");

  // Load active time entries and determine state
  useEffect(() => {
    if (!operatorId) {
      setStatusData({ state: "idle", count: 0, startTime: null, operationName: null, jobNumber: null });
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("time_entries")
        .select(`
          id, start_time, operation_id,
          operation:operations(
            id, operation_name,
            part:parts(
              part_number, is_bullet_card,
              job:jobs(job_number)
            )
          )
        `)
        .eq("operator_id", operatorId)
        .is("end_time", null);

      if (!data || data.length === 0) {
        setStatusData({ state: "idle", count: 0, startTime: null, operationName: null, jobNumber: null, entries: [] });
        return;
      }

      const entry = data[0] as any;
      const hasRush = data.some((e: any) => e.operation?.part?.is_bullet_card);
      const startTime = entry.start_time;
      const hoursSinceStart = (Date.now() - new Date(startTime).getTime()) / (1000 * 60 * 60);

      let state: OperatorState = "active";
      if (hasRush) state = "rush";
      else if (hoursSinceStart > 2) state = "stale";

      const entries: ActiveEntry[] = data.map((e: any) => ({
        id: e.id,
        operationId: e.operation?.id || e.operation_id,
        startTime: e.start_time,
        operationName: e.operation?.operation_name || "?",
        jobNumber: e.operation?.part?.job?.job_number || "?",
        partNumber: e.operation?.part?.part_number || "",
        isRush: Boolean(e.operation?.part?.is_bullet_card),
      }));

      setStatusData({
        state,
        count: data.length,
        startTime,
        operationName: entry.operation?.operation_name || null,
        jobNumber: entry.operation?.part?.job?.job_number || null,
        entries,
      });
    };

    void load();

    const channel = supabase
      .channel(`status-bar-${operatorId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "time_entries",
        filter: `operator_id=eq.${operatorId}`,
      }, () => void load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [operatorId]);

  // Tick elapsed time
  useEffect(() => {
    if (!statusData.startTime) { setElapsed(""); return; }
    const update = () => {
      const seconds = Math.floor((Date.now() - new Date(statusData.startTime!).getTime()) / 1000);
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      setElapsed(h > 0
        ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        : `${m}:${String(s).padStart(2, "0")}`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [statusData.startTime]);

  const styles = STATE_STYLES[statusData.state];

  const handleStop = async (operationId: string) => {
    if (!operatorId) return;
    try {
      await stopTimeTracking(operationId, operatorId);
      toast.success(t("operations.timeTrackingStopped"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("operations.failedToStopTimeTracking"));
    }
  };

  // Show status bar if operator is selected OR if there are active time entries
  if (!activeOperator && statusData.count === 0) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden border-b transition-colors duration-500",
        styles.border,
      )}
    >
      {/* Diagonal stripe background */}
      <div
        className={cn("absolute inset-0 opacity-100", styles.animate)}
        style={{
          backgroundImage: styles.stripe,
          backgroundSize: statusData.state === "idle" ? "17px 17px" : "17px 17px",
        }}
      />

      {/* Color tint overlay */}
      <div className={cn("absolute inset-0", styles.bg)} />

      {/* Content */}
      <div className="relative flex h-8 items-center justify-between px-3 sm:px-4">
        {/* Left: Operator name + state */}
        <div className="flex items-center gap-2">
          {/* Pulsing dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            {statusData.state !== "idle" && (
              <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", styles.dot, "animate-ping")} />
            )}
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", styles.dot)} />
          </span>

          <button
            onClick={() => navigate(ROUTES.OPERATOR.LOGIN)}
            className="group flex items-center gap-1.5 rounded px-1 -ml-1 hover:bg-white/5 transition-colors"
            title={t("operator.switchOperator")}
          >
            <span className={cn("text-xs font-bold uppercase tracking-wider", styles.text)}>
              {operatorName}
            </span>
            <RefreshCw className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground" />
          </button>

          {statusData.state === "idle" && (
            <span className="text-[10px] font-medium text-amber-500/70 hidden sm:inline">
              — {t("terminal.status.notClockedOn", "niet ingeklokt")}
            </span>
          )}
        </div>

        {/* Center: What they're working on */}
        {statusData.state !== "idle" && statusData.operationName && (
          <div className="hidden items-center gap-1.5 sm:flex">
            <span className="text-[10px] text-muted-foreground/70">
              {statusData.jobNumber} ·
            </span>
            <span className={cn("text-xs font-semibold", styles.text)}>
              {statusData.operationName}
            </span>
            {statusData.state === "rush" && (
              <span className="rounded bg-red-500/20 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
                Rush
              </span>
            )}
            {statusData.state === "stale" && (
              <span className="text-[10px] text-amber-500/70">
                — {t("terminal.status.longRunning", "lang actief")}
              </span>
            )}
          </div>
        )}

        {/* Right: Timer + popover */}
        <div className="flex items-center gap-2">
          {statusData.count > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "flex h-6 items-center gap-1.5 rounded-full border px-2 transition-colors hover:bg-white/5",
                  styles.border, styles.text,
                )}>
                  <span className="font-mono text-[11px] font-bold tabular-nums">{elapsed}</span>
                  {statusData.count > 1 && (
                    <span className="text-[10px] opacity-70">×{statusData.count}</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-[300px] border-border bg-card p-1.5">
                <div className="space-y-1">
                  {statusData.entries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted/30">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {entry.operationName}
                          </span>
                          {entry.isRush && (
                            <span className="rounded bg-red-500/20 px-1 text-[9px] font-bold text-red-400">R</span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {entry.jobNumber} · {entry.partNumber} · {formatDistanceToNow(new Date(entry.startTime), { addSuffix: true })}
                        </div>
                      </div>
                      <button
                        onClick={() => void handleStop(entry.operationId)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                        title={t("operations.stop")}
                      >
                        <Square className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Cell selector slot removed — now in main header */}
        </div>
      </div>
    </div>
  );
}
