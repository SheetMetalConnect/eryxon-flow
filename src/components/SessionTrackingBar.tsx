import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock, Square, Pause, Play, ChevronUp, ChevronDown, X } from "lucide-react";
import { stopTimeTracking, pauseTimeTracking, resumeTimeTracking } from "@/lib/database";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ActiveEntry {
  id: string;
  operation_id: string;
  start_time: string;
  is_paused: boolean;
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

interface PauseData {
  paused_at: string;
}

export default function SessionTrackingBar() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [activeEntries, setActiveEntries] = useState<ActiveEntry[]>([]);
  const [currentPauses, setCurrentPauses] = useState<Record<string, PauseData>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const loadCurrentPauses = async (entries: ActiveEntry[]) => {
    const pausedEntries = entries.filter(e => e.is_paused);
    if (pausedEntries.length === 0) {
      setCurrentPauses({});
      return;
    }

    const pausePromises = pausedEntries.map(async (entry) => {
      const { data } = await supabase
        .from("time_entry_pauses")
        .select("paused_at")
        .eq("time_entry_id", entry.id)
        .is("resumed_at", null)
        .maybeSingle();
      return { entryId: entry.id, pause: data };
    });

    const results = await Promise.all(pausePromises);
    const newPauses: Record<string, PauseData> = {};
    results.forEach(({ entryId, pause }) => {
      if (pause) {
        newPauses[entryId] = pause;
      }
    });
    setCurrentPauses(newPauses);
  };

  const loadActiveEntries = useCallback(async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from("time_entries")
      .select(
        `
        id,
        operation_id,
        start_time,
        is_paused,
        operation:operations(
          operation_name,
          part:parts(
            part_number,
            job:jobs(job_number)
          )
        )
      `
      )
      .eq("operator_id", profile.id)
      .is("end_time", null);

    if (!error && data) {
      setActiveEntries(data as any);
      loadCurrentPauses(data as any);
      // Reset dismissed when new entries appear
      if (data.length > 0 && dismissed) {
        setDismissed(false);
      }
    } else {
      setActiveEntries([]);
      setCurrentPauses({});
    }
  }, [profile?.id, dismissed]);

  // Calculate elapsed time for each entry
  useEffect(() => {
    const calculateElapsed = () => {
      const now = new Date().getTime();
      const newElapsed: Record<string, number> = {};

      activeEntries.forEach(entry => {
        if (entry.is_paused && currentPauses[entry.id]) {
          // For paused entries, calculate time until pause
          const pausedAt = new Date(currentPauses[entry.id].paused_at).getTime();
          const startTime = new Date(entry.start_time).getTime();
          newElapsed[entry.id] = Math.floor((pausedAt - startTime) / 1000);
        } else {
          // For active entries, calculate from start to now
          const startTime = new Date(entry.start_time).getTime();
          newElapsed[entry.id] = Math.floor((now - startTime) / 1000);
        }
      });

      setElapsedSeconds(newElapsed);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeEntries, currentPauses]);

  useEffect(() => {
    if (!profile?.id) return;

    loadActiveEntries();

    // Subscribe to time entries changes
    const channel = supabase
      .channel("session-tracking-bar")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_entries",
          filter: `operator_id=eq.${profile.id}`,
        },
        () => {
          loadActiveEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, loadActiveEntries]);

  const handleStop = async (entry: ActiveEntry) => {
    if (!profile?.id) return;

    setLoading(prev => ({ ...prev, [entry.id]: true }));
    try {
      await stopTimeTracking(entry.operation_id, profile.id);
      toast.success(t("sessionTracking.stopped"));
      loadActiveEntries();
    } catch (error: any) {
      toast.error(error.message || t("sessionTracking.stopFailed"));
    } finally {
      setLoading(prev => ({ ...prev, [entry.id]: false }));
    }
  };

  const handlePause = async (entry: ActiveEntry) => {
    if (!profile?.id) return;

    setLoading(prev => ({ ...prev, [entry.id]: true }));
    try {
      await pauseTimeTracking(entry.id);
      toast.success(t("sessionTracking.paused"));
      loadActiveEntries();
    } catch (error: any) {
      toast.error(error.message || t("sessionTracking.pauseFailed"));
    } finally {
      setLoading(prev => ({ ...prev, [entry.id]: false }));
    }
  };

  const handleResume = async (entry: ActiveEntry) => {
    if (!profile?.id) return;

    setLoading(prev => ({ ...prev, [entry.id]: true }));
    try {
      await resumeTimeTracking(entry.id);
      toast.success(t("sessionTracking.resumed"));
      loadActiveEntries();
    } catch (error: any) {
      toast.error(error.message || t("sessionTracking.resumeFailed"));
    } finally {
      setLoading(prev => ({ ...prev, [entry.id]: false }));
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if no active entries or dismissed
  if (activeEntries.length === 0 || dismissed) return null;

  const primaryEntry = activeEntries[0];
  const hasMultiple = activeEntries.length > 1;

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-[60]",
        "transition-all duration-300 ease-out"
      )}
      style={{ bottom: 'max(0px, env(safe-area-inset-bottom))' }}
    >
      {/* Glassmorphism Bottom Bar */}
      <div
        className={cn(
          "mx-2 sm:mx-4 mb-2 sm:mb-4 rounded-xl",
          "backdrop-filter backdrop-blur-xl saturate-[180%]",
          "bg-[rgba(17,25,40,0.85)]",
          "border border-white/10",
          "shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)]",
          "overflow-hidden"
        )}
      >
        {/* Main Bar Content */}
        <div className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Status Indicator + Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Pulsing Indicator */}
              <div className="relative flex-shrink-0">
                <div
                  className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center",
                    primaryEntry.is_paused
                      ? "bg-yellow-500/20"
                      : "bg-primary/20"
                  )}
                >
                  <Clock
                    className={cn(
                      "h-5 w-5 sm:h-6 sm:w-6",
                      primaryEntry.is_paused ? "text-yellow-400" : "text-primary"
                    )}
                  />
                </div>
                {/* Pulse animation for active tracking */}
                {!primaryEntry.is_paused && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                )}
              </div>

              {/* Task Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-primary uppercase tracking-wide">
                    {t("sessionTracking.currentlyTracking")}
                  </span>
                  {primaryEntry.is_paused && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 uppercase">
                      {t("sessionTracking.paused")}
                    </span>
                  )}
                </div>
                <div className="font-semibold text-white text-sm sm:text-base truncate mt-0.5">
                  {primaryEntry.operation.operation_name}
                </div>
                <div className="text-xs text-white/70 truncate">
                  {t("sessionTracking.task")} {primaryEntry.operation.part.job.job_number} • {primaryEntry.operation.part.part_number}
                </div>
              </div>

              {/* Timer Display */}
              <div className="hidden sm:flex flex-col items-end flex-shrink-0">
                <div
                  className={cn(
                    "text-2xl font-mono font-bold tabular-nums",
                    primaryEntry.is_paused ? "text-yellow-400" : "text-white"
                  )}
                >
                  {formatTime(elapsedSeconds[primaryEntry.id] || 0)}
                </div>
                <div className="text-xs text-white/50">
                  {t("sessionTracking.elapsed")}
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Timer on mobile */}
              <div
                className={cn(
                  "sm:hidden text-lg font-mono font-bold tabular-nums px-2",
                  primaryEntry.is_paused ? "text-yellow-400" : "text-white"
                )}
              >
                {formatTime(elapsedSeconds[primaryEntry.id] || 0)}
              </div>

              {/* Pause/Resume */}
              {primaryEntry.is_paused ? (
                <Button
                  onClick={() => handleResume(primaryEntry)}
                  disabled={loading[primaryEntry.id]}
                  size="sm"
                  className={cn(
                    "gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white border-0",
                    "h-9 px-3 sm:h-10 sm:px-4"
                  )}
                >
                  <Play className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("sessionTracking.resume")}</span>
                </Button>
              ) : (
                <Button
                  onClick={() => handlePause(primaryEntry)}
                  disabled={loading[primaryEntry.id]}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                    "h-9 px-3 sm:h-10 sm:px-4"
                  )}
                >
                  <Pause className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("sessionTracking.pause")}</span>
                </Button>
              )}

              {/* Stop */}
              <Button
                onClick={() => handleStop(primaryEntry)}
                disabled={loading[primaryEntry.id]}
                variant="outline"
                size="sm"
                className={cn(
                  "gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30",
                  "h-9 px-3 sm:h-10 sm:px-4"
                )}
              >
                <Square className="h-4 w-4" />
                <span className="hidden sm:inline">{t("sessionTracking.stop")}</span>
              </Button>

              {/* Expand/Collapse for multiple entries */}
              {hasMultiple && (
                <Button
                  onClick={() => setExpanded(!expanded)}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 sm:h-10 sm:w-10 p-0 text-white/60 hover:text-white hover:bg-white/10"
                >
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              )}

              {/* Dismiss (minimize) */}
              <Button
                onClick={() => setDismissed(true)}
                variant="ghost"
                size="sm"
                className="h-9 w-9 sm:h-10 sm:w-10 p-0 text-white/40 hover:text-white hover:bg-white/10"
                title={t("sessionTracking.minimize")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Multiple entries indicator */}
          {hasMultiple && !expanded && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-white/60 hover:text-white/80 transition-colors"
              >
                +{activeEntries.length - 1} {t("sessionTracking.moreOperations")}
              </button>
            </div>
          )}
        </div>

        {/* Expanded entries list */}
        {expanded && hasMultiple && (
          <div className="border-t border-white/10 bg-black/20">
            {activeEntries.slice(1).map((entry) => (
              <div
                key={entry.id}
                className="p-3 border-b border-white/5 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
                        entry.is_paused
                          ? "bg-yellow-500/20"
                          : "bg-primary/20"
                      )}
                    >
                      <Clock
                        className={cn(
                          "h-4 w-4",
                          entry.is_paused ? "text-yellow-400" : "text-primary"
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">
                        {entry.operation.operation_name}
                      </div>
                      <div className="text-xs text-white/60 truncate">
                        {entry.operation.part.job.job_number} • {entry.operation.part.part_number}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "font-mono text-sm tabular-nums",
                        entry.is_paused ? "text-yellow-400" : "text-white/80"
                      )}
                    >
                      {formatTime(elapsedSeconds[entry.id] || 0)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {entry.is_paused ? (
                      <Button
                        onClick={() => handleResume(entry)}
                        disabled={loading[entry.id]}
                        size="sm"
                        className="h-8 w-8 p-0 bg-emerald-500 hover:bg-emerald-600 text-white border-0"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handlePause(entry)}
                        disabled={loading[entry.id]}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      >
                        <Pause className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      onClick={() => handleStop(entry)}
                      disabled={loading[entry.id]}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
                    >
                      <Square className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
