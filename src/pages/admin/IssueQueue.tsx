import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Clock,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  BarChart3,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Issue {
  id: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  image_paths: string[] | null;
  operation: {
    operation_name: string;
    part: {
      part_number: string;
      job: {
        job_number: string;
      };
    };
  };
  creator: {
    full_name: string;
  };
}

export default function IssueQueue() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<
    "approved" | "closed" | "pending" | "rejected" | "all"
  >("pending");
  const [severityFilter, setSeverityFilter] = useState<
    "critical" | "high" | "low" | "medium" | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (profile?.tenant_id) {
      loadIssues();
      setupRealtime();
    }
  }, [profile?.tenant_id, statusFilter, severityFilter, searchQuery]);

  // Load signed URLs for issue images
  useEffect(() => {
    const loadImageUrls = async () => {
      if (!selectedIssue?.image_paths || selectedIssue.image_paths.length === 0) {
        setImageUrls([]);
        return;
      }

      const urls = await Promise.all(
        selectedIssue.image_paths.map(async (path) => {
          const { data } = await supabase.storage
            .from("issues")
            .createSignedUrl(path, 3600); // 1 hour expiry
          return data?.signedUrl || "";
        })
      );

      setImageUrls(urls.filter(url => url !== ""));
    };

    loadImageUrls();
  }, [selectedIssue?.id]);

  const loadIssues = async () => {
    if (!profile?.tenant_id) return;

    let query = supabase
      .from("issues")
      .select(
        `
        *,
        operation:operations!inner(
          operation_name,
          part:parts!inner(
            part_number,
            job:jobs!inner(job_number)
          )
        ),
        creator:profiles!issues_created_by_fkey(full_name)
      `,
      )
      .eq("tenant_id", profile.tenant_id);

    // Apply status filter
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    // Apply severity filter
    if (severityFilter !== "all") {
      query = query.eq("severity", severityFilter);
    }

    // Apply search query (job number, part number, or operation name)
    if (searchQuery) {
      query = query.or(
        `operation.part.job.job_number.ilike.%${searchQuery}%,operation.part.part_number.ilike.%${searchQuery}%,operation.operation_name.ilike.%${searchQuery}%`,
      );
    }

    query = query
      .order("severity", { ascending: false })
      .order("created_at", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Error loading issues:", error);
    } else {
      setIssues(data || []);
    }
    setLoading(false);
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel("issue-queue")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "issues",
          filter: `tenant_id=eq.${profile?.tenant_id}`,
        },
        () => loadIssues(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleReview = async (action: "approved" | "rejected" | "closed") => {
    if (!selectedIssue || !profile?.id || !resolutionNotes.trim()) {
      toast.error(t("issues.pleaseProvideResolutionNotes"));
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("issues")
        .update({
          status: action,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          resolution_notes: resolutionNotes.trim(),
        })
        .eq("id", selectedIssue.id);

      if (error) throw error;

      toast.success(
        t(`issues.issue${action.charAt(0).toUpperCase() + action.slice(1)}`),
      );
      setSelectedIssue(null);
      setResolutionNotes("");
      loadIssues();
    } catch (error: any) {
      toast.error(error.message || t("issues.failedToUpdateIssue"));
    } finally {
      setActionLoading(false);
    }
  };

  const severityColors = {
    low: "bg-severity-low",
    medium: "bg-severity-medium",
    high: "bg-severity-high",
    critical: "bg-severity-critical",
  };

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  // State for all issues (unfiltered) for analytics
  const [allIssues, setAllIssues] = useState<Issue[]>([]);

  // Load all issues for analytics
  useEffect(() => {
    const loadAllIssues = async () => {
      if (!profile?.tenant_id) return;
      const { data } = await supabase
        .from("issues")
        .select(`
          id,
          severity,
          status,
          created_at
        `)
        .eq("tenant_id", profile.tenant_id);
      setAllIssues((data as Issue[]) || []);
    };
    loadAllIssues();
  }, [profile?.tenant_id]);

  // Compute analytics from all issues
  const analytics = useMemo(() => {
    const total = allIssues.length;
    const byStatus = {
      pending: allIssues.filter((i) => i.status === "pending").length,
      approved: allIssues.filter((i) => i.status === "approved").length,
      rejected: allIssues.filter((i) => i.status === "rejected").length,
      closed: allIssues.filter((i) => i.status === "closed").length,
    };
    const bySeverity = {
      critical: allIssues.filter((i) => i.severity === "critical").length,
      high: allIssues.filter((i) => i.severity === "high").length,
      medium: allIssues.filter((i) => i.severity === "medium").length,
      low: allIssues.filter((i) => i.severity === "low").length,
    };

    // Calculate resolution rate
    const resolved = byStatus.approved + byStatus.rejected + byStatus.closed;
    const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;

    // Calculate average time to resolution (for resolved issues)
    const resolvedIssues = allIssues.filter(
      (i) => i.status === "approved" || i.status === "rejected" || i.status === "closed"
    );

    return {
      total,
      byStatus,
      bySeverity,
      resolutionRate,
      criticalPending: allIssues.filter(
        (i) => i.severity === "critical" && i.status === "pending"
      ).length,
      highPending: allIssues.filter(
        (i) => i.severity === "high" && i.status === "pending"
      ).length,
    };
  }, [allIssues]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
          {t("issues.issueQueue")}
        </h1>
        <p className="text-muted-foreground text-lg">
          {issues.length} {t("issues.pendingIssue", { count: issues.length })}
        </p>
      </div>

      <hr className="title-divider" />

      {/* Analytics Dashboard */}
      {analytics.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Total Issues */}
          <Card className="glass-card transition-smooth hover:scale-[1.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--brand-primary))]/10">
                  <BarChart3 className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
                </div>
                <div>
                  <div className="text-xl font-bold">{analytics.total}</div>
                  <div className="text-xs text-muted-foreground">{t("quality.totalIssues", "Total Issues")}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card className={cn(
            "glass-card transition-smooth hover:scale-[1.02]",
            analytics.byStatus.pending > 0 && "border-[hsl(var(--color-warning))]/30"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--color-warning))]/10">
                  <Clock className="h-4 w-4 text-[hsl(var(--color-warning))]" />
                </div>
                <div>
                  <div className={cn(
                    "text-xl font-bold",
                    analytics.byStatus.pending > 0 && "text-[hsl(var(--color-warning))]"
                  )}>{analytics.byStatus.pending}</div>
                  <div className="text-xs text-muted-foreground">{t("issues.status.pending")}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Critical */}
          <Card className={cn(
            "glass-card transition-smooth hover:scale-[1.02]",
            analytics.criticalPending > 0 && "border-[hsl(var(--color-error))]/30"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--color-error))]/10">
                  <AlertOctagon className="h-4 w-4 text-[hsl(var(--color-error))]" />
                </div>
                <div>
                  <div className={cn(
                    "text-xl font-bold",
                    analytics.criticalPending > 0 && "text-[hsl(var(--color-error))]"
                  )}>{analytics.criticalPending}</div>
                  <div className="text-xs text-muted-foreground">{t("quality.criticalPending", "Critical Pending")}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* High Priority */}
          <Card className={cn(
            "glass-card transition-smooth hover:scale-[1.02]",
            analytics.highPending > 0 && "border-[hsl(var(--severity-high))]/30"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--severity-high))]/10">
                  <AlertTriangle className="h-4 w-4 text-[hsl(var(--severity-high))]" />
                </div>
                <div>
                  <div className={cn(
                    "text-xl font-bold",
                    analytics.highPending > 0 && "text-[hsl(var(--severity-high))]"
                  )}>{analytics.highPending}</div>
                  <div className="text-xs text-muted-foreground">{t("quality.highPending", "High Pending")}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resolved */}
          <Card className="glass-card transition-smooth hover:scale-[1.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--color-success))]/10">
                  <CheckCircle className="h-4 w-4 text-[hsl(var(--color-success))]" />
                </div>
                <div>
                  <div className="text-xl font-bold text-[hsl(var(--color-success))]">
                    {analytics.byStatus.approved + analytics.byStatus.closed}
                  </div>
                  <div className="text-xs text-muted-foreground">{t("quality.resolved", "Resolved")}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resolution Rate */}
          <Card className="glass-card transition-smooth hover:scale-[1.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(var(--color-info))]/10">
                  <TrendingUp className="h-4 w-4 text-[hsl(var(--color-info))]" />
                </div>
                <div>
                  <div className={cn(
                    "text-xl font-bold",
                    analytics.resolutionRate >= 80 ? "text-[hsl(var(--color-success))]" :
                    analytics.resolutionRate >= 50 ? "text-[hsl(var(--color-warning))]" :
                    "text-[hsl(var(--color-error))]"
                  )}>{analytics.resolutionRate.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">{t("quality.resolutionRate", "Resolution Rate")}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Severity & Status Breakdown */}
      {analytics.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By Severity */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
                {t("quality.bySeverity", "Issues by Severity")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {[
                  { key: "critical", label: t("issues.severity.critical"), color: "bg-severity-critical", value: analytics.bySeverity.critical },
                  { key: "high", label: t("issues.severity.high"), color: "bg-severity-high", value: analytics.bySeverity.high },
                  { key: "medium", label: t("issues.severity.medium"), color: "bg-severity-medium", value: analytics.bySeverity.medium },
                  { key: "low", label: t("issues.severity.low"), color: "bg-severity-low", value: analytics.bySeverity.low },
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-muted-foreground">{item.label}</div>
                    <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", item.color)}
                        style={{ width: `${analytics.total > 0 ? (item.value / analytics.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="w-8 text-xs font-medium text-right">{item.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* By Status */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
                {t("quality.byStatus", "Issues by Status")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {[
                  { key: "pending", label: t("issues.status.pending"), color: "bg-[hsl(var(--color-warning))]", value: analytics.byStatus.pending },
                  { key: "approved", label: t("issues.status.approved"), color: "bg-[hsl(var(--color-success))]", value: analytics.byStatus.approved },
                  { key: "rejected", label: t("issues.status.rejected"), color: "bg-[hsl(var(--color-error))]", value: analytics.byStatus.rejected },
                  { key: "closed", label: t("issues.status.closed"), color: "bg-muted-foreground", value: analytics.byStatus.closed },
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-muted-foreground">{item.label}</div>
                    <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", item.color)}
                        style={{ width: `${analytics.total > 0 ? (item.value / analytics.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="w-8 text-xs font-medium text-right">{item.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="search" className="mb-2 block">
            {t('Search')}
          </Label>
          <Input
            id="search"
            placeholder={t('issues.searchByJobPartOperation')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="status-filter" className="mb-2 block">
            {t('Status')}
          </Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger id="status-filter">
              <SelectValue placeholder={t('issues.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('issues.allStatuses')}</SelectItem>
              <SelectItem value="pending">{t('issues.status.pending')}</SelectItem>
              <SelectItem value="approved">{t('issues.status.approved')}</SelectItem>
              <SelectItem value="rejected">{t('issues.status.rejected')}</SelectItem>
              <SelectItem value="closed">{t('issues.status.closed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="severity-filter" className="mb-2 block">
            {t('issues.severityLabel')}
          </Label>
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
            <SelectTrigger id="severity-filter">
              <SelectValue placeholder={t('issues.filterBySeverity')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('issues.allSeverities')}</SelectItem>
              <SelectItem value="critical">{t('issues.severity.critical')}</SelectItem>
              <SelectItem value="high">{t('issues.severity.high')}</SelectItem>
              <SelectItem value="medium">{t('issues.severity.medium')}</SelectItem>
              <SelectItem value="low">{t('issues.severity.low')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {issues.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
          <h3 className="text-lg font-medium mb-2">
            {t("issues.noPendingIssues")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("issues.allIssuesReviewed")}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {issues.map((issue) => (
            <Card
              key={issue.id}
              className="glass-card p-4 cursor-pointer hover:shadow-xl hover:scale-105 transition-all hover:border-white/20"
              onClick={() => {
                setSelectedIssue(issue);
                setResolutionNotes("");
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      className={
                        severityColors[
                        issue.severity as keyof typeof severityColors
                        ]
                      }
                    >
                      {t(`issues.severity.${issue.severity}`)}
                    </Badge>
                  </div>
                  <div className="font-medium mb-1">
                    {issue.operation.part.job.job_number} •{" "}
                    {issue.operation.part.part_number} •{" "}
                    {issue.operation.operation_name}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {issue.description}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {t("issues.reportedBy", {
                      name: issue.creator.full_name,
                      date: format(new Date(issue.created_at), "MMM d, yyyy"),
                    })}
                  </div>
                </div>
                <Button size="sm">{t("issues.review")}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Dialog
        open={!!selectedIssue}
        onOpenChange={() => setSelectedIssue(null)}
      >
        <DialogContent className="glass-card max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("issues.reviewIssue")}</DialogTitle>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    severityColors[
                    selectedIssue.severity as keyof typeof severityColors
                    ]
                  }
                >
                  {t(`issues.severity.${selectedIssue.severity}`)}
                </Badge>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  {t("issues.operation")}
                </div>
                <div className="font-medium">
                  {selectedIssue.operation.part.job.job_number} •{" "}
                  {selectedIssue.operation.part.part_number} •{" "}
                  {selectedIssue.operation.operation_name}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  {t("issues.description")}
                </div>
                <div className="text-sm p-3 bg-muted rounded">
                  {selectedIssue.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {t("issues.reportedBy")}
                  </div>
                  <div className="text-sm">
                    {selectedIssue.creator.full_name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {t("issues.created")}
                  </div>
                  <div className="text-sm">
                    {format(new Date(selectedIssue.created_at), "PPp")}
                  </div>
                </div>
              </div>

              {imageUrls.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {t("issues.attachedPhotos")}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {imageUrls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={t("issues.issuePhoto", { number: index + 1 })}
                          className="rounded border"
                        />
                      ))}
                    </div>
                  </div>
                )}

              <div>
                <Label htmlFor="resolution">
                  {t("issues.resolutionNotes")} *
                </Label>
                <Textarea
                  id="resolution"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={t("issues.enterResolutionNotes")}
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleReview("approved")}
                  disabled={actionLoading || !resolutionNotes.trim()}
                  className="flex-1 bg-success hover:bg-success/90"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t("issues.approve")}
                </Button>
                <Button
                  onClick={() => handleReview("rejected")}
                  disabled={actionLoading || !resolutionNotes.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t("issues.reject")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
