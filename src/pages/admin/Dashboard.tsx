import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, Clock, Loader2, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { seedDemoData } from "@/lib/seed";

interface ActiveWork {
  id: string;
  start_time: string;
  operator: {
    full_name: string;
  };
  operation: {
    operation_name: string;
    part: {
      part_number: string;
      job: {
        job_number: string;
        customer: string | null;
      };
    };
    cell: {
      name: string;
      color: string | null;
    };
  };
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [activeWork, setActiveWork] = useState<ActiveWork[]>([]);
  const [stats, setStats] = useState({
    activeWorkers: 0,
    inProgressTasks: 0,
    dueThisWeek: 0,
    pendingIssues: 0,
  });
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!profile?.tenant_id) return;

    loadData();
    setupRealtimeSubscription();
  }, [profile?.tenant_id]);

  const loadData = async () => {
    if (!profile?.tenant_id) return;

    try {
      // Load active work
      const { data: activeData } = await supabase
        .from("time_entries")
        .select(
          `
          id,
          start_time,
          operator:profiles!inner(full_name),
          operation:operations!inner(
            operation_name,
            part:parts!inner(
              part_number,
              job:jobs!inner(job_number, customer)
            ),
            cell:cells!inner(name, color)
          )
        `
        )
        .eq("tenant_id", profile.tenant_id)
        .is("end_time", null)
        .order("start_time", { ascending: false });

      if (activeData) setActiveWork(activeData as any);

      // Load stats + check cells
      const [inProgressResult, dueThisWeekResult, cellsHead, issuesResult] = await Promise.all([
        supabase
          .from("operations")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", profile.tenant_id)
          .eq("status", "in_progress"),
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", profile.tenant_id)
          .gte("due_date", new Date().toISOString())
          .lte(
            "due_date",
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          ),
        supabase
          .from("cells")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", profile.tenant_id)
          .eq("active", true),
        supabase
          .from("issues")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", profile.tenant_id)
          .eq("status", "pending"),
      ]);

      setStats({
        activeWorkers: activeData?.length || 0,
        inProgressTasks: inProgressResult.count || 0,
        dueThisWeek: dueThisWeekResult.count || 0,
        pendingIssues: issuesResult.count || 0,
      });

      setNeedsSetup((cellsHead.count || 0) === 0);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel("time-entries-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_entries",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleSeed = async () => {
    if (!profile?.tenant_id) return;
    setSeeding(true);
    try {
      await seedDemoData(profile.tenant_id);
      await loadData();
      setNeedsSetup(false);
      toast({ title: "Demo data added", description: "Stages, jobs, parts and tasks were created." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Seeding failed", description: e?.message || String(e) });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Real-time activity and statistics</p>
        </div>

        {needsSetup && (
          <Card>
            <CardHeader>
              <CardTitle>Initial setup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <p className="text-muted-foreground">
                  No stages found for this tenant. Seed demo data to start testing the board.
                </p>
                <Button onClick={handleSeed} disabled={seeding}>
                  {seeding ? "Seeding…" : "Seed demo data"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeWorkers}</div>
              <p className="text-xs text-muted-foreground">Currently working</p>
            </CardContent>
          </Card>

         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingIssues}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgressTasks}</div>
              <p className="text-xs text-muted-foreground">Active tasks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dueThisWeek}</div>
              <p className="text-xs text-muted-foreground">Jobs due</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Work Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Work</CardTitle>
          </CardHeader>
          <CardContent>
            {activeWork.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active work at the moment
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operator</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>Cell</TableHead>
                    <TableHead>Elapsed Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeWork.map((work) => (
                    <TableRow key={work.id}>
                      <TableCell className="font-medium">
                        {work.operator.full_name}
                      </TableCell>
                      <TableCell>{work.operation.operation_name}</TableCell>
                      <TableCell>
                        <div>{work.operation.part.job.job_number}</div>
                        {work.operation.part.job.customer && (
                          <div className="text-xs text-muted-foreground">
                            {work.operation.part.job.customer}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{work.operation.part.part_number}</TableCell>
                      <TableCell>
                        <Badge
                          style={{
                            backgroundColor:
                              work.operation.cell.color || "hsl(var(--accent))",
                            color: "white",
                          }}
                        >
                          {work.operation.cell.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(work.start_time))}
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
