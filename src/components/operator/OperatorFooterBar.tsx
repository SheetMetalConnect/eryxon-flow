import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock, Square, Pause, Play, AlertTriangle } from "lucide-react";
import { stopTimeTracking, pauseTimeTracking, resumeTimeTracking } from "@/lib/database";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

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

export default function OperatorFooterBar() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeEntry, setActiveEntry] = useState<ActiveEntry | null>(null);
  const [currentPause, setCurrentPause] = useState<PauseData | null>(null);
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadCurrentPause = async (timeEntryId: string) => {
    const { data } = await supabase
      .from("time_entry_pauses")
      .select("paused_at")
      .eq("time_entry_id", timeEntryId)
      .is("resumed_at", null)
      .maybeSingle();

    if (data) {
      setCurrentPause(data);
    }
  };

  const loadActiveEntry = useCallback(async () => {
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
      .is("end_time", null)
      .maybeSingle();

    if (!error && data) {
      setActiveEntry(data as any);

      // If paused, load the current pause
      if (data.is_paused) {
        loadCurrentPause(data.id);
      } else {
        setCurrentPause(null);
      }
    } else {
      setActiveEntry(null);
      setCurrentPause(null);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    loadActiveEntry();

    // Update every second for elapsed time
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    // Subscribe to time entries changes
    const channel = supabase
      .channel("operator-footer-time-entries")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_entries",
          filter: `operator_id=eq.${profile.id}`,
        },
        () => {
          loadActiveEntry();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [profile?.id, loadActiveEntry]);

  const handleStop = async () => {
    if (!profile?.id || !activeEntry) return;

    setLoading(true);
    try {
      await stopTimeTracking(activeEntry.operation_id, profile.id);
      toast.success("Time tracking stopped");
      loadActiveEntry();
    } catch (error: any) {
      toast.error(error.message || "Failed to stop time tracking");
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    if (!profile?.id || !activeEntry) return;

    setLoading(true);
    try {
      await pauseTimeTracking(activeEntry.id);
      toast.success("Time tracking paused");
      loadActiveEntry();
    } catch (error: any) {
      toast.error(error.message || "Failed to pause time tracking");
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    if (!profile?.id || !activeEntry) return;

    setLoading(true);
    try {
      await resumeTimeTracking(activeEntry.id);
      toast.success("Time tracking resumed");
      loadActiveEntry();
    } catch (error: any) {
      toast.error(error.message || "Failed to resume time tracking");
    } finally {
      setLoading(false);
    }
  };

  const handleReportIssue = () => {
    // Navigate to work queue which has the operation detail modal
    navigate("/work-queue");
    toast.info("Open the operation to report an issue");
  };

  // Don't render footer if no active entry
  if (!activeEntry) return null;

  const isPaused = activeEntry.is_paused;
  const timeReference = isPaused && currentPause
    ? new Date(currentPause.paused_at)
    : new Date(activeEntry.start_time);

  return (
    <div className="fixed left-0 right-0 z-40 bg-operator-complete text-white shadow-lg border-t-4 border-primary" style={{ bottom: 'max(0px, env(safe-area-inset-bottom))' }}>
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Operation Info */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className={`p-1.5 sm:p-2 rounded-lg ${isPaused ? 'bg-yellow-500/20' : 'bg-white/20'} flex-shrink-0`}>
              <Clock className={`h-5 w-5 sm:h-6 sm:w-6 ${isPaused ? 'text-yellow-300' : 'text-white'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm sm:text-lg truncate">
                {activeEntry.operation.operation_name}
              </div>
              <div className="text-xs sm:text-sm text-white/90 truncate">
                Job {activeEntry.operation.part.job.job_number} • {activeEntry.operation.part.part_number}
              </div>
              <div className="text-xs text-white/80 hidden sm:block">
                {isPaused ? (
                  <>Paused {formatDistanceToNow(timeReference, { addSuffix: true })}</>
                ) : (
                  <>Started {formatDistanceToNow(timeReference, { addSuffix: true })}</>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Report Issue Button - Desktop only */}
            <Button
              onClick={handleReportIssue}
              disabled={loading}
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-2 bg-operator-pause hover:bg-operator-pause/90 text-white border-operator-pause hidden lg:flex"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Report Issue</span>
            </Button>

            {/* Report Issue Button - Mobile icon only */}
            <Button
              onClick={handleReportIssue}
              disabled={loading}
              variant="outline"
              size="sm"
              className="bg-operator-pause hover:bg-operator-pause/90 text-white border-operator-pause lg:hidden p-2"
              title="Report Issue"
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>

            {/* Pause/Resume Button */}
            {isPaused ? (
              <Button
                onClick={handleResume}
                disabled={loading}
                size="sm"
                className="gap-1 sm:gap-2 bg-operator-start hover:bg-operator-start/90 text-white border-operator-start"
                title="Resume timing"
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Resume</span>
              </Button>
            ) : (
              <Button
                onClick={handlePause}
                disabled={loading}
                variant="outline"
                size="sm"
                className="gap-1 sm:gap-2 bg-operator-resume hover:bg-operator-resume/90 text-white border-operator-resume"
                title="Pause timing"
              >
                <Pause className="h-4 w-4" />
                <span className="hidden sm:inline">Pause</span>
              </Button>
            )}

            {/* Stop Button */}
            <Button
              onClick={handleStop}
              disabled={loading}
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-2 bg-operator-issue hover:bg-operator-issue/90 text-white border-operator-issue"
              title="Stop timing"
            >
              <Square className="h-4 w-4" />
              <span className="hidden sm:inline">Stop</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
