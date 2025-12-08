import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Square, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function StuckTimeEntries() {
  const queryClient = useQueryClient();

  // Fetch all active time entries
  const { data: stuckEntries, isLoading } = useQuery({
    queryKey: ["stuck-time-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id,
          start_time,
          is_paused,
          operator_id,
          operation_id,
          profiles:operator_id (
            full_name,
            username
          ),
          operations (
            operation_name,
            parts (
              part_number,
              jobs (
                job_number
              )
            )
          )
        `)
        .is("end_time", null)
        .order("start_time", { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  // Mutation to force stop a time entry
  const stopEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { data: entry } = await supabase
        .from("time_entries")
        .select("start_time")
        .eq("id", entryId)
        .single();

      if (!entry) throw new Error("Entry not found");

      const now = new Date();
      const startTime = new Date(entry.start_time);
      const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

      const { error } = await supabase
        .from("time_entries")
        .update({
          end_time: now.toISOString(),
          duration: durationSeconds,
        })
        .eq("id", entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stuck-time-entries"] });
      toast.success("Time entry stopped successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to stop entry: ${error.message}`);
    },
  });

  // Mutation to stop all entries
  const stopAllMutation = useMutation({
    mutationFn: async () => {
      if (!stuckEntries || stuckEntries.length === 0) return 0;
      
      const now = new Date();
      let stoppedCount = 0;

      for (const entry of stuckEntries) {
        const startTime = new Date(entry.start_time);
        const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

        const { error } = await supabase
          .from("time_entries")
          .update({
            end_time: now.toISOString(),
            duration: durationSeconds,
          })
          .eq("id", entry.id);

        if (!error) stoppedCount++;
      }
      
      return stoppedCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["stuck-time-entries"] });
      toast.success(`Stopped ${count} time entries`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to stop entries: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-yellow-500" />
          <h1 className="text-2xl font-bold">Stuck Time Entries</h1>
          {stuckEntries && stuckEntries.length > 0 && (
            <Badge variant="destructive">{stuckEntries.length}</Badge>
          )}
        </div>
        {stuckEntries && stuckEntries.length > 1 && (
          <Button
            variant="destructive"
            onClick={() => stopAllMutation.mutate()}
            disabled={stopAllMutation.isPending}
            className="gap-2"
          >
            {stopAllMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            Stop All ({stuckEntries.length})
          </Button>
        )}
      </div>
      
      <p className="text-muted-foreground">
        These time entries are still active but may be stuck. You can force-stop them here.
      </p>

      {!stuckEntries || stuckEntries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No stuck time entries found. All clear! ✓
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {stuckEntries.map((entry: any) => (
            <Card key={entry.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      {entry.operations?.operation_name || "Unknown Operation"}
                    </CardTitle>
                    <CardDescription>
                      Operator: {entry.profiles?.full_name || entry.profiles?.username || "Unknown"}
                    </CardDescription>
                  </div>
                  {entry.is_paused && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500">
                      Paused
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>Job: {entry.operations?.parts?.jobs?.job_number || "Unknown"}</span>
                    <span>•</span>
                    <span>Part: {entry.operations?.parts?.part_number || "Unknown"}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Started: {format(new Date(entry.start_time), "MMM dd, yyyy HH:mm:ss")}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => stopEntryMutation.mutate(entry.id)}
                  disabled={stopEntryMutation.isPending}
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  Force Stop
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
