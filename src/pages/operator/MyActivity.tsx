import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, formatDuration, intervalToDuration } from "date-fns";
import { Clock, Loader2, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  task: {
    task_name: string;
    part: {
      part_number: string;
      job: {
        job_number: string;
        customer: string | null;
      };
    };
    stage: {
      name: string;
      color: string | null;
    };
  };
}

export default function MyActivity() {
  const { profile } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"today" | "week" | "all">("today");

  useEffect(() => {
    if (!profile?.id) return;
    loadTimeEntries();
  }, [profile?.id, view]);

  const loadTimeEntries = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from("time_entries")
        .select(
          `
          id,
          start_time,
          end_time,
          duration,
          task:tasks!inner(
            task_name,
            part:parts!inner(
              part_number,
              job:jobs!inner(job_number, customer)
            ),
            stage:stages!inner(name, color)
          )
        `
        )
        .eq("operator_id", profile.id)
        .order("start_time", { ascending: false });

      // Filter by date range
      const now = new Date();
      if (view === "today") {
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        query = query.gte("start_time", startOfDay);
      } else if (view === "week") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        query = query.gte("start_time", startOfWeek.toISOString());
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      if (data) setTimeEntries(data as any);
    } catch (error) {
      console.error("Error loading time entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDurationMinutes = (minutes: number | null) => {
    if (!minutes) return "0m";
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const calculateTotalTime = () => {
    return timeEntries.reduce((total, entry) => {
      return total + (entry.duration || 0);
    }, 0);
  };

  const getActiveEntries = () => {
    return timeEntries.filter((entry) => !entry.end_time);
  };

  const getCompletedEntries = () => {
    return timeEntries.filter((entry) => entry.end_time);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const activeEntries = getActiveEntries();
  const completedEntries = getCompletedEntries();
  const totalTime = calculateTotalTime();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Activity</h1>
          <p className="text-muted-foreground">Your time tracking history</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Now</CardTitle>
              <Clock className="h-4 w-4 text-active-work" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeEntries.length}</div>
              <p className="text-xs text-muted-foreground">Currently timing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {view === "today" ? "Today" : view === "week" ? "This Week" : "All Time"}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedEntries.length}</div>
              <p className="text-xs text-muted-foreground">Completed sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDurationMinutes(totalTime)}</div>
              <p className="text-xs text-muted-foreground">
                {view === "today" ? "Today" : view === "week" ? "This week" : "All time"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Time Period Selector */}
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Last 7 Days</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Time Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {timeEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No time entries found for this period
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.task.task_name}
                      </TableCell>
                      <TableCell>
                        <div>{entry.task.part.job.job_number}</div>
                        {entry.task.part.job.customer && (
                          <div className="text-xs text-muted-foreground">
                            {entry.task.part.job.customer}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{entry.task.part.part_number}</TableCell>
                      <TableCell>
                        <Badge
                          style={{
                            backgroundColor:
                              entry.task.stage.color || "hsl(var(--stage-default))",
                            color: "white",
                          }}
                        >
                          {entry.task.stage.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          {format(new Date(entry.start_time), "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(entry.start_time), "h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.duration ? (
                          formatDurationMinutes(entry.duration)
                        ) : (
                          <Badge variant="outline" className="text-active-work border-active-work">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.end_time ? (
                          <Badge variant="secondary">Completed</Badge>
                        ) : (
                          <Badge className="bg-active-work">In Progress</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
