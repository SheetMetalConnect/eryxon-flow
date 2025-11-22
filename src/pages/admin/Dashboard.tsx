import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Activity,
  Clock,
  Loader2,
  AlertTriangle,
  LucideIcon,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { seedDemoData } from "@/lib/seed";
import { clearMockData } from "@/lib/mockDataGenerator";
import { QRMDashboard } from "@/components/qrm/QRMDashboard";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className="glass-card cursor-pointer transition-all hover:shadow-xl hover:scale-105 active:scale-100 hover:border-white/20"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
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
  const [wiping, setWiping] = useState(false);
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
        `,
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
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const columns: ColumnDef<ActiveWork>[] = useMemo(
    () => [
      {
        accessorKey: "operator.full_name",
        id: "operator",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("dashboard.operator")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.operator.full_name}</span>
        ),
      },
      {
        accessorKey: "operation.operation_name",
        id: "operation",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("dashboard.operation")}
          />
        ),
        cell: ({ row }) => row.original.operation.operation_name,
      },
      {
        id: "job",
        header: t("dashboard.job"),
        cell: ({ row }) => (
          <div>
            <div>{row.original.operation.part.job.job_number}</div>
            {row.original.operation.part.job.customer && (
              <div className="text-xs text-muted-foreground">
                {row.original.operation.part.job.customer}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "operation.part.part_number",
        id: "part",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("dashboard.part")} />
        ),
        cell: ({ row }) => row.original.operation.part.part_number,
      },
      {
        id: "cell",
        header: t("dashboard.cell"),
        cell: ({ row }) => (
          <Badge className="bg-accent text-white">
            {row.original.operation.cell.name}
          </Badge>
        ),
      },
      {
        accessorKey: "start_time",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("dashboard.elapsedTime")}
          />
        ),
        cell: ({ row }) =>
          formatDistanceToNow(new Date(row.getValue("start_time"))),
      },
    ],
    [t],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSeed = async () => {
    if (!profile?.tenant_id) return;
    setSeeding(true);
    try {
      await seedDemoData(profile.tenant_id);
      await loadData();
      setNeedsSetup(false);
      toast({
        title: t("dashboard.demoDataAdded"),
        description: t("dashboard.demoDataDescription"),
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: t("dashboard.seedingFailed"),
        description: e?.message || String(e),
      });
    } finally {
      setSeeding(false);
    }
  };

  const handleWipeDemo = async () => {
    if (!profile?.tenant_id) return;

    // Confirm before wiping
    if (
      !confirm(
        "Are you sure you want to wipe all demo data? This cannot be undone.",
      )
    ) {
      return;
    }

    setWiping(true);
    try {
      const result = await clearMockData(profile.tenant_id);

      if (result.success) {
        await loadData();
        setNeedsSetup(true);
        toast({
          title: "Demo Data Wiped",
          description: "All demo data has been cleared successfully.",
        });
      } else {
        throw new Error(result.error || "Failed to clear demo data");
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Wipe Failed",
        description: e?.message || String(e),
      });
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            {t("dashboard.title")}
          </h1>
          <p className="text-muted-foreground text-lg">{t("dashboard.description")}</p>
        </div>
        {!needsSetup &&
          profile?.tenant_id === "11111111-1111-1111-1111-111111111111" && (
            <Button
              variant="destructive"
              onClick={handleWipeDemo}
              disabled={wiping}
              size="sm"
            >
              {wiping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wiping...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Wipe Demo Data
                </>
              )}
            </Button>
          )}
      </div>

      <hr className="title-divider" />

      {needsSetup && (
        <Card className="glass-card border-warning/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {t("dashboard.initialSetup")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <p className="text-muted-foreground">
                {t("dashboard.noStagesFound")}
              </p>
              <Button onClick={handleSeed} disabled={seeding} className="cta-button">
                {seeding ? t("dashboard.seeding") : t("dashboard.seedDemoData")}
                {!seeding && <ArrowRight className="ml-2 h-4 w-4 arrow-icon" />}
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
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl">{t("dashboard.quickStats")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("dashboard.totalJobs")}</p>
              <p className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {stats.totalJobs}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("dashboard.totalParts")}</p>
              <p className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {stats.totalParts}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("dashboard.activeCells")}</p>
              <p className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {stats.activeCells}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("dashboard.completedToday")}</p>
              <p className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {stats.completedToday}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QRM Dashboard */}
      <QRMDashboard />

      {/* Active Work Table */}
      <Card className="glass-card" data-tour="active-operations">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t("dashboard.activeWork")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeWork.length === 0 ? (
            <div className="text-center py-12">
              <div className="informational-text max-w-md mx-auto">
                {t("dashboard.noActiveWork")}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
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
                    <TableRow key={work.id} className="border-white/10 hover:bg-white/5">
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
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          {work.operation.cell.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(work.start_time))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
