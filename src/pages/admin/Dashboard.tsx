import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, Clock, Loader2, AlertTriangle, LucideIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { seedDemoData } from "@/lib/seed";
import { QRMDashboard } from "@/components/qrm/QRMDashboard";

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

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}

function StatCard({ title, value, description, icon: Icon, onClick }: StatCardProps) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 active:scale-100"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeWork, setActiveWork] = useState<ActiveWork[]>([]);
  const [stats, setStats] = useState({
    activeWorkers: 0,
    inProgressTasks: 0,
    dueThisWeek: 0,
    pendingIssues: 0,
    totalJobs: 0,
    totalParts: 0,
    activeCells: 0,
    completedToday: 0,
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
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [
        inProgressResult,
        dueThisWeekResult,
        cellsHead,
        issuesResult,
        totalJobsResult,
        totalPartsResult,
        completedTodayResult,
      ] = await Promise.all([
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
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", profile.tenant_id),
        supabase
          .from("parts")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", profile.tenant_id),
        supabase
          .from("operations")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", profile.tenant_id)
          .eq("status", "completed")
          .gte("updated_at", startOfDay.toISOString()),
      ]);

      setStats({
        activeWorkers: activeData?.length || 0,
        inProgressTasks: inProgressResult.count || 0,
        dueThisWeek: dueThisWeekResult.count || 0,
        pendingIssues: issuesResult.count || 0,
        totalJobs: totalJobsResult.count || 0,
        totalParts: totalPartsResult.count || 0,
        activeCells: cellsHead.count || 0,
        completedToday: completedTodayResult.count || 0,
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
      toast({ title: t("dashboard.demoDataAdded"), description: t("dashboard.demoDataDescription") });
    } catch (e: any) {
      toast({ variant: "destructive", title: t("dashboard.seedingFailed"), description: e?.message || String(e) });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.description")}</p>
        </div>

        {needsSetup && (
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.initialSetup")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <p className="text-muted-foreground">
                  {t("dashboard.noStagesFound")}
                </p>
                <Button onClick={handleSeed} disabled={seeding}>
                  {seeding ? t("dashboard.seeding") : t("dashboard.seedDemoData")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4" data-tour="dashboard-stats">
          <StatCard
            title={t("dashboard.activeWorkers")}
            value={stats.activeWorkers}
            description={t("dashboard.currentlyWorking")}
            icon={Users}
            onClick={() => navigate("/admin/users")}
          />

          <StatCard
            title={t("dashboard.pendingIssues")}
            value={stats.pendingIssues}
            description={t("dashboard.awaitingReview")}
            icon={AlertTriangle}
            onClick={() => navigate("/admin/issues")}
          />

          <StatCard
            title={t("dashboard.inProgress")}
            value={stats.inProgressTasks}
            description={t("dashboard.activeTasks")}
            icon={Activity}
            onClick={() => navigate("/admin/assignments")}
          />

          <StatCard
            title={t("dashboard.dueThisWeek")}
            value={stats.dueThisWeek}
            description={t("dashboard.jobsDue")}
            icon={Clock}
            onClick={() => navigate("/admin/jobs")}
          />
        </div>

        {/* Quick Stats Panel */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.quickStats")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("dashboard.totalJobs")}</p>
                <p className="text-2xl font-bold">{stats.totalJobs}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("dashboard.totalParts")}</p>
                <p className="text-2xl font-bold">{stats.totalParts}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("dashboard.activeCells")}</p>
                <p className="text-2xl font-bold">{stats.activeCells}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("dashboard.completedToday")}</p>
                <p className="text-2xl font-bold">{stats.completedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QRM Dashboard */}
        <QRMDashboard />

        {/* Active Work Table */}
        <Card data-tour="active-operations">
          <CardHeader>
            <CardTitle>{t("dashboard.activeWork")}</CardTitle>
          </CardHeader>
          <CardContent>
            {activeWork.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("dashboard.noActiveWork")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.operator")}</TableHead>
                    <TableHead>{t("dashboard.operation")}</TableHead>
                    <TableHead>{t("dashboard.job")}</TableHead>
                    <TableHead>{t("dashboard.part")}</TableHead>
                    <TableHead>{t("dashboard.cell")}</TableHead>
                    <TableHead>{t("dashboard.elapsedTime")}</TableHead>
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
  );
}
