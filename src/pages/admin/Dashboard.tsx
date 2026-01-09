import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  Square,
  User,
  Briefcase,
  Box,
  Layers,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { seedDemoData } from "@/lib/seed";
import { clearMockData } from "@/lib/mockDataGenerator";
import { QRMDashboard } from "@/components/qrm/QRMDashboard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { adminStopTimeTracking, stopAllActiveTimeEntries } from "@/lib/database";
import { cn } from "@/lib/utils";

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

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  href: string;
  trend?: "up" | "down" | "neutral";
  highlight?: boolean;
  accentColor?: string;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  trend,
  highlight,
  accentColor = "primary",
}: MetricCardProps) {
  const navigate = useNavigate();
  
  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        "border-border/50 bg-card/50 backdrop-blur-sm",
        highlight && "ring-1 ring-primary/20"
      )}
      onClick={() => navigate(href)}
    >
      {/* Gradient accent line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
        `bg-gradient-to-r from-${accentColor} via-${accentColor}/50 to-transparent`
      )} />
      
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{value}</span>
              {trend && trend !== "neutral" && (
                <TrendingUp className={cn(
                  "h-4 w-4",
                  trend === "up" ? "text-green-500" : "text-red-500 rotate-180"
                )} />
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
            "bg-primary/10 group-hover:bg-primary/20"
          )}>
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        {/* Drill-down indicator */}
        <div className="flex items-center gap-1 mt-4 text-xs text-muted-foreground group-hover:text-primary transition-colors">
          <span>View details</span>
          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickStatProps {
  label: string;
  value: number;
  href: string;
  icon: LucideIcon;
}

function QuickStat({ label, value, href, icon: Icon }: QuickStatProps) {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate(href)}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl transition-all text-left w-full",
        "bg-white/5 hover:bg-white/10 border border-transparent hover:border-primary/20",
        "group"
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground truncate">{label}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </button>
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
  const [selectedWork, setSelectedWork] = useState<ActiveWork | null>(null);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [stoppingAll, setStoppingAll] = useState(false);
  const [isPastClosingTime, setIsPastClosingTime] = useState(false);
  const [factoryClosingTime, setFactoryClosingTime] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!profile?.tenant_id) return;
    loadData();
    return setupRealtimeSubscription();
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

  // Check factory hours and set warning if past closing time
  const checkFactoryHours = async () => {
    if (!profile?.tenant_id) return;

    try {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("factory_closing_time, auto_stop_tracking")
        .eq("id", profile.tenant_id)
        .single();

      if (tenant?.factory_closing_time) {
        setFactoryClosingTime(tenant.factory_closing_time.substring(0, 5));

        // Parse closing time and compare with current time
        const now = new Date();
        const [hours, minutes] = tenant.factory_closing_time.split(":").map(Number);
        const closingTime = new Date();
        closingTime.setHours(hours, minutes, 0, 0);

        setIsPastClosingTime(now > closingTime);
      }
    } catch (error) {
      console.error("Error checking factory hours:", error);
    }
  };

  // Check factory hours on load and every minute
  useEffect(() => {
    if (!profile?.tenant_id) return;

    checkFactoryHours();
    const interval = setInterval(checkFactoryHours, 60000);

    return () => clearInterval(interval);
  }, [profile?.tenant_id]);

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

  const handleRowClick = (work: ActiveWork) => {
    setSelectedWork(work);
    setStopDialogOpen(true);
  };

  const handleStopClocking = async () => {
    if (!selectedWork) return;

    setStopping(true);
    try {
      await adminStopTimeTracking(selectedWork.id);
      toast({
        title: t("dashboard.clockingStopped"),
        description: t("dashboard.clockingStoppedDescription", {
          operator: selectedWork.operator.full_name,
          operation: selectedWork.operation.operation_name,
        }),
      });
      setStopDialogOpen(false);
      setSelectedWork(null);
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("dashboard.stopFailed"),
        description: error?.message || String(error),
      });
    } finally {
      setStopping(false);
    }
  };

  const handleStopAllClockings = async () => {
    if (!profile?.tenant_id) {
      console.error("No tenant ID available");
      return;
    }

    if (activeWork.length === 0) {
      toast({
        title: t("dashboard.noActiveClockings", "No active clockings"),
        description: t("dashboard.noActiveClockingsDescription", "There are no active time entries to stop."),
      });
      return;
    }

    setStoppingAll(true);
    try {
      const stoppedCount = await stopAllActiveTimeEntries(profile.tenant_id);
      toast({
        title: t("dashboard.allClockingsStopped"),
        description: t("dashboard.allClockingsStoppedDescription", { count: stoppedCount }),
      });
      await loadData();
    } catch (error: any) {
      console.error("Failed to stop all clockings:", error);
      toast({
        variant: "destructive",
        title: t("dashboard.stopAllFailed"),
        description: error?.message || String(error),
      });
    } finally {
      setStoppingAll(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("dashboard.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("dashboard.description")}</p>
        </div>
        {!needsSetup &&
          profile?.tenant_id === "11111111-1111-1111-1111-111111111111" && (
            <Button
              variant="outline"
              onClick={handleWipeDemo}
              disabled={wiping}
              size="sm"
              className="text-destructive hover:text-destructive"
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

      {needsSetup && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              {t("dashboard.initialSetup")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <p className="text-muted-foreground">
                {t("dashboard.noStagesFound")}
              </p>
              <Button onClick={handleSeed} disabled={seeding}>
                {seeding ? t("dashboard.seeding") : t("dashboard.seedDemoData")}
                {!seeding && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Primary Metrics - 4 Column Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="dashboard-stats">
        <MetricCard
          title={t("dashboard.activeWorkers")}
          value={stats.activeWorkers}
          subtitle={t("dashboard.currentlyWorking")}
          icon={Users}
          href="/admin/activity"
          highlight={stats.activeWorkers > 0}
        />

        <MetricCard
          title={t("dashboard.pendingIssues")}
          value={stats.pendingIssues}
          subtitle={t("dashboard.awaitingReview")}
          icon={AlertTriangle}
          href="/admin/issues?status=pending"
          highlight={stats.pendingIssues > 0}
        />

        <MetricCard
          title={t("dashboard.inProgress")}
          value={stats.inProgressTasks}
          subtitle={t("dashboard.activeTasks")}
          icon={Activity}
          href="/admin/operations?status=in_progress"
        />

        <MetricCard
          title={t("dashboard.dueThisWeek")}
          value={stats.dueThisWeek}
          subtitle={t("dashboard.jobsDue")}
          icon={Clock}
          href="/admin/jobs?dueWithin=7"
        />
      </div>

      {/* Secondary Stats - Compact Row */}
      <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickStat
              label={t("dashboard.totalJobs")}
              value={stats.totalJobs}
              href="/admin/jobs"
              icon={Briefcase}
            />
            <QuickStat
              label={t("dashboard.totalParts")}
              value={stats.totalParts}
              href="/admin/parts"
              icon={Box}
            />
            <QuickStat
              label={t("dashboard.activeCells")}
              value={stats.activeCells}
              href="/admin/config/stages"
              icon={Layers}
            />
            <QuickStat
              label={t("dashboard.completedToday")}
              value={stats.completedToday}
              href="/admin/operations?status=completed&today=true"
              icon={CheckCircle2}
            />
          </div>
        </CardContent>
      </Card>

      {/* QRM Dashboard */}
      <QRMDashboard />

      {/* Past Closing Time Warning */}
      {isPastClosingTime && activeWork.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/20">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="font-medium text-warning">
                    {t("dashboard.pastClosingTimeWarning")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.pastClosingTimeDescription", {
                      time: factoryClosingTime,
                      count: activeWork.length,
                    })}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-warning text-warning hover:bg-warning hover:text-warning-foreground gap-2"
                onClick={handleStopAllClockings}
                disabled={stoppingAll}
              >
                {stoppingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("common.stopping")}
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4" />
                    {t("dashboard.stopAllClockings")}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Work Table */}
      <Card className="border-border/50" data-tour="active-operations">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("dashboard.activeWork")}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeWork.length > 0 
                  ? `${activeWork.length} active session${activeWork.length > 1 ? 's' : ''}`
                  : 'No active sessions'
                }
              </p>
            </div>
          </div>
          {activeWork.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopAllClockings}
              disabled={stoppingAll}
              className="gap-2"
            >
              {stoppingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.stopping")}
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  {t("dashboard.stopAll")}
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {activeWork.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-4">
                <Activity className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {t("dashboard.noActiveWork")}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="font-medium">{t("dashboard.operator")}</TableHead>
                    <TableHead className="font-medium">{t("dashboard.operation")}</TableHead>
                    <TableHead className="font-medium">{t("dashboard.job")}</TableHead>
                    <TableHead className="font-medium">{t("dashboard.part")}</TableHead>
                    <TableHead className="font-medium">{t("dashboard.cell")}</TableHead>
                    <TableHead className="font-medium text-right">{t("dashboard.elapsedTime")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeWork.map((work) => (
                    <TableRow
                      key={work.id}
                      className="border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(work)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="font-medium">{work.operator.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {work.operation.operation_name}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{work.operation.part.job.job_number}</div>
                          {work.operation.part.job.customer && (
                            <div className="text-xs text-muted-foreground">
                              {work.operation.part.job.customer}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {work.operation.part.part_number}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {work.operation.cell.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
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

      {/* Stop Clocking Dialog */}
      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {t("dashboard.stopClockingTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("dashboard.stopClockingDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedWork && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.operator")}</p>
                  <p className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedWork.operator.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.operation")}</p>
                  <p className="font-medium">{selectedWork.operation.operation_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.job")}</p>
                  <p className="font-medium">{selectedWork.operation.part.job.job_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.part")}</p>
                  <p className="font-medium">{selectedWork.operation.part.part_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.cell")}</p>
                  <Badge variant="secondary">
                    {selectedWork.operation.cell.name}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.startedAt")}</p>
                  <p className="font-medium">
                    {format(new Date(selectedWork.start_time), "PPp")}
                  </p>
                </div>
              </div>

              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                <p className="text-sm text-warning flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {t("dashboard.elapsedTime")}: {formatDistanceToNow(new Date(selectedWork.start_time))}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setStopDialogOpen(false)}
              disabled={stopping}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleStopClocking}
              disabled={stopping}
              className="gap-2"
            >
              {stopping ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.stopping")}
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  {t("dashboard.stopClocking")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
