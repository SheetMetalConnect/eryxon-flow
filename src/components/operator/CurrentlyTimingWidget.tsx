import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Square } from "lucide-react";
import { stopTimeTracking } from "@/lib/database";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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
  const { profile } = useAuth();
  const [activeEntries, setActiveEntries] = useState<ActiveEntry[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;

    loadActiveEntries();

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
          filter: `operator_id=eq.${profile.id}`,
        },
        () => {
          loadActiveEntries();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const loadActiveEntries = async () => {
    if (!profile?.id) return;

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
      .eq("operator_id", profile.id)
      .is("end_time", null);

    if (!error && data) {
      setActiveEntries(data as any);
    }
  };

  const handleStop = async (operationId: string) => {
    if (!profile?.id) return;

    try {
      await stopTimeTracking(operationId, profile.id);
      toast.success("Time tracking stopped");
      loadActiveEntries();
    } catch (error: any) {
      toast.error(error.message || "Failed to stop time tracking");
    }
  };

  if (activeEntries.length === 0) return null;

  return (
    <Card className="p-4 bg-active-work/5 border-active-work/30">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-5 w-5 text-active-work" />
        <h3 className="font-semibold">Currently Timing</h3>
      </div>
      <div className="space-y-2">
        {activeEntries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-3 bg-background rounded-lg border"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{entry.operation.operation_name}</div>
              <div className="text-sm text-muted-foreground">
                Job {entry.operation.part.job.job_number} • {entry.operation.part.part_number}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Started {formatDistanceToNow(new Date(entry.start_time), { addSuffix: true })}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStop(entry.operation_id)}
              className="gap-2 ml-4"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
