import { useEffect, useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  AlertOctagon,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PageStatsRow } from "@/components/admin/PageStatsRow";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "@/components/ui/data-table/DataTableColumnHeader";
import type { DataTableFilterableColumn } from "@/components/ui/data-table/DataTable";

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
    if (!profile?.tenant_id) return;
    loadIssues();
    return setupRealtime();
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

  const severityColors: Record<string, string> = {
    low: "bg-severity-low",
    medium: "bg-severity-medium",
    high: "bg-severity-high",
    critical: "bg-severity-critical",
  };

  const getSeverityBadge = (severity: string) => (
    <Badge className={cn("text-xs", severityColors[severity] || "bg-muted")}>
      {t(`issues.severity.${severity}`, severity)}
    </Badge>
  );

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      pending: "bg-[hsl(var(--color-warning))]/20 text-[hsl(var(--color-warning))]",
      approved: "bg-[hsl(var(--color-success))]/20 text-[hsl(var(--color-success))]",
      rejected: "bg-[hsl(var(--color-error))]/20 text-[hsl(var(--color-error))]",
      closed: "bg-muted text-muted-foreground",
    };
    return (
      <Badge className={cn("text-xs", statusStyles[status] || "bg-muted")}>
        {t(`issues.status.${status}`, status)}
      </Badge>
    );
  };

  // Table columns
  const columns: ColumnDef<Issue>[] = useMemo(() => [
    {
      accessorKey: "severity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("issues.severityLabel", "Severity")} />
      ),
      cell: ({ row }) => getSeverityBadge(row.getValue("severity")),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      id: "job",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("common.job", "Job")} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.operation?.part?.job?.job_number || "-"}</span>
      ),
    },
    {
      id: "part",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("common.part", "Part")} />
      ),
      cell: ({ row }) => row.original.operation?.part?.part_number || "-",
    },
    {
      id: "operation",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("common.operation", "Operation")} />
      ),
      cell: ({ row }) => row.original.operation?.operation_name || "-",
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("issues.description", "Description")} />
      ),
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-[200px]">{row.getValue("description")}</span>
      ),
    },
    {
      id: "reporter",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("issues.reporter", "Reporter")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.creator?.full_name || "-"}</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("common.date", "Date")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.getValue("created_at")), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("common.status", "Status")} />
      ),
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
  ], [t]);

  // Filterable columns
  const filterableColumns: DataTableFilterableColumn[] = useMemo(() => [
    {
      id: "severity",
      title: t("issues.severityLabel", "Severity"),
      options: [
        { label: t("issues.severity.critical"), value: "critical" },
        { label: t("issues.severity.high"), value: "high" },
        { label: t("issues.severity.medium"), value: "medium" },
        { label: t("issues.severity.low"), value: "low" },
      ],
    },
    {
      id: "status",
      title: t("common.status", "Status"),
      options: [
        { label: t("issues.status.pending"), value: "pending" },
        { label: t("issues.status.approved"), value: "approved" },
        { label: t("issues.status.rejected"), value: "rejected" },
        { label: t("issues.status.closed"), value: "closed" },
      ],
    },
  ], [t]);

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
    <div className="p-4 space-y-4">
      <AdminPageHeader
        title={t("issues.issueQueue")}
        description={t("issues.subtitle", "Review and manage quality issues reported from the shop floor")}
      />

      {/* Stats Row */}
      <PageStatsRow
        stats={[
          { label: t("issues.totalIssues", "Total Issues"), value: analytics.total, icon: AlertCircle, color: "primary" },
          { label: t("issues.status.pending"), value: analytics.byStatus.pending, icon: Clock, color: analytics.byStatus.pending > 0 ? "warning" : "muted" },
          { label: t("issues.criticalPending", "Critical"), value: analytics.criticalPending, icon: AlertOctagon, color: analytics.criticalPending > 0 ? "error" : "muted" },
          { label: t("issues.resolved", "Resolved"), value: analytics.byStatus.approved + analytics.byStatus.closed, icon: CheckCircle, color: "success" },
        ]}
      />

      {/* Issues Table */}
      <div className="glass-card p-4">
        <DataTable
          columns={columns}
          data={issues}
          filterableColumns={filterableColumns}
          searchPlaceholder={t("issues.searchPlaceholder", "Search issues...")}
          emptyMessage={t("issues.noIssuesFound", "No issues found")}
          loading={loading}
          pageSize={20}
          pageSizeOptions={[10, 20, 50, 100]}
          searchDebounce={250}
          onRowClick={(issue) => {
            setSelectedIssue(issue);
            setResolutionNotes("");
          }}
        />
      </div>

      {/* Review Modal */}
      <Dialog
        open={!!selectedIssue}
        onOpenChange={() => setSelectedIssue(null)}
      >
        <DialogContent className="glass-card max-w-2xl max-h-[85vh] overflow-y-auto">
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
