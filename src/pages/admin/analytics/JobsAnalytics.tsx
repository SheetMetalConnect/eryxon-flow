import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Briefcase, Layers, CheckCircle2, PauseCircle, AlertTriangle, Clock, TrendingUp, Package, Trash2, AlertOctagon, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQualityMetrics } from "@/hooks/useQualityMetrics";
import { addDays, isBefore, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface JobStats {
  total: number;
  inProgress: number;
  completed: number;
  onHold: number;
  overdue: number;
  dueThisWeek: number;
  notStarted: number;
}

export default function JobsAnalytics() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, status, due_date, due_date_override, created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: qualityMetrics, isLoading: qualityLoading } = useQualityMetrics();

  const stats: JobStats = useMemo(() => {
    if (!jobs) return { total: 0, inProgress: 0, completed: 0, onHold: 0, overdue: 0, dueThisWeek: 0, notStarted: 0 };

    const today = new Date();
    const weekFromNow = addDays(today, 7);

    return {
      total: jobs.length,
      inProgress: jobs.filter((j) => j.status === "in_progress").length,
      completed: jobs.filter((j) => j.status === "completed").length,
      onHold: jobs.filter((j) => j.status === "on_hold").length,
      notStarted: jobs.filter((j) => j.status === "not_started").length,
      overdue: jobs.filter((j) => {
        const dueDate = new Date(j.due_date_override || j.due_date);
        return isBefore(dueDate, today) && j.status !== "completed";
      }).length,
      dueThisWeek: jobs.filter((j) => {
        const dueDate = new Date(j.due_date_override || j.due_date);
        return isAfter(dueDate, today) && isBefore(dueDate, weekFromNow) && j.status !== "completed";
      }).length,
    };
  }, [jobs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            {t("analytics.jobsTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("analytics.jobsSubtitle")}
          </p>
        </div>
      </div>

      <hr className="title-divider" />

      {/* Job Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--brand-primary))]/10">
                <Briefcase className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">{t("jobs.total")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-info))]/10">
                <Layers className="h-4 w-4 text-[hsl(var(--color-info))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats.inProgress}</div>
                <div className="text-xs text-muted-foreground">{t("operations.status.inProgress")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-success))]/10">
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--color-success))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats.completed}</div>
                <div className="text-xs text-muted-foreground">{t("operations.status.completed")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-warning))]/10">
                <PauseCircle className="h-4 w-4 text-[hsl(var(--color-warning))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats.onHold}</div>
                <div className="text-xs text-muted-foreground">{t("operations.status.onHold")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "glass-card transition-smooth hover:scale-[1.02]",
          stats.overdue > 0 && "border-[hsl(var(--color-error))]/30"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-error))]/10">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--color-error))]" />
              </div>
              <div>
                <div className={cn(
                  "text-xl font-bold",
                  stats.overdue > 0 && "text-[hsl(var(--color-error))]"
                )}>{stats.overdue}</div>
                <div className="text-xs text-muted-foreground">{t("jobs.overdue")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "glass-card transition-smooth hover:scale-[1.02]",
          stats.dueThisWeek > 0 && "border-[hsl(var(--color-warning))]/30"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-warning))]/10">
                <Clock className="h-4 w-4 text-[hsl(var(--color-warning))]" />
              </div>
              <div>
                <div className={cn(
                  "text-xl font-bold",
                  stats.dueThisWeek > 0 && "text-[hsl(var(--color-warning))]"
                )}>{stats.dueThisWeek}</div>
                <div className="text-xs text-muted-foreground">{t("jobs.dueThisWeek")}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Metrics Dashboard */}
      {qualityMetrics && (qualityMetrics.totalProduced > 0 || qualityMetrics.issueMetrics.total > 0) && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
              {t("quality.dashboardTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Yield Rate */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t("quality.yieldRate")}
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  qualityMetrics.overallYield >= 95 ? "text-[hsl(var(--color-success))]" :
                  qualityMetrics.overallYield >= 85 ? "text-[hsl(var(--color-warning))]" :
                  "text-[hsl(var(--color-error))]"
                )}>
                  {qualityMetrics.overallYield.toFixed(1)}%
                </div>
              </div>

              {/* Total Produced */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  {t("quality.totalProduced")}
                </div>
                <div className="text-lg font-bold">{qualityMetrics.totalProduced.toLocaleString()}</div>
              </div>

              {/* Good Parts */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--color-success))]" />
                  {t("quality.goodParts")}
                </div>
                <div className="text-lg font-bold text-[hsl(var(--color-success))]">
                  {qualityMetrics.totalGood.toLocaleString()}
                </div>
              </div>

              {/* Scrap */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Trash2 className="h-3.5 w-3.5 text-[hsl(var(--color-error))]" />
                  {t("quality.scrap")}
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  qualityMetrics.totalScrap > 0 ? "text-[hsl(var(--color-error))]" : ""
                )}>
                  {qualityMetrics.totalScrap.toLocaleString()}
                  {qualityMetrics.scrapRate > 0 && (
                    <span className="text-xs font-normal ml-1">({qualityMetrics.scrapRate.toFixed(1)}%)</span>
                  )}
                </div>
              </div>

              {/* Open Issues */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--color-warning))]" />
                  {t("quality.openIssues")}
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  qualityMetrics.issueMetrics.pending > 0 ? "text-[hsl(var(--color-warning))]" : ""
                )}>
                  {qualityMetrics.issueMetrics.pending}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    / {qualityMetrics.issueMetrics.total}
                  </span>
                </div>
              </div>

              {/* Critical Issues */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertOctagon className="h-3.5 w-3.5 text-[hsl(var(--color-error))]" />
                  {t("quality.critical")}
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  qualityMetrics.issueMetrics.bySeverity.critical > 0 ? "text-[hsl(var(--color-error))]" : ""
                )}>
                  {qualityMetrics.issueMetrics.bySeverity.critical}
                </div>
              </div>
            </div>

            {/* Top Scrap Reasons Mini-Bar */}
            {qualityMetrics.topScrapReasons.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-xs text-muted-foreground mb-2">
                  {t("quality.topScrapReasons")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {qualityMetrics.topScrapReasons.slice(0, 5).map((reason) => (
                    <Badge key={reason.code} variant="outline" className="text-xs">
                      {reason.code}: {reason.quantity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Link to Jobs page */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => navigate("/admin/jobs")}>
          {t("jobs.title")} →
        </Button>
      </div>
    </div>
  );
}
