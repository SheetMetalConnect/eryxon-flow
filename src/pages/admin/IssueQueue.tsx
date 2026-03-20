import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SeverityBadge, StatusBadge } from "@/components/ui/status-badge";
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
import { logger } from "@/lib/logger";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertOctagon,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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

  const loadIssues = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIssues([]);
      setLoading(false);
      return;
    }

    setLoading(true);

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

    query = query
      .order("severity", { ascending: false })
      .order("created_at", { ascending: true });

    const { data, error } = await query;

    if (error) {
      logger.error('IssueQueue', 'Error loading issues', error);
    } else {
      setIssues(data || []);
    }
    setLoading(false);
  }, [profile?.tenant_id]);

  const setupRealtime = useCallback(() => {
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
  }, [loadIssues, profile?.tenant_id]);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    void loadIssues();
    return setupRealtime();
  }, [loadIssues, profile?.tenant_id, setupRealtime]);

  useEffect(() => {
    const loadImageUrls = async () => {
      setImageUrls([]);

      if (!selectedIssue?.image_paths || selectedIssue.image_paths.length === 0) {
        return;
      }

      const urls = await Promise.all(
        selectedIssue.image_paths.map(async (path) => {
          const { data } = await supabase.storage
            .from("issues")
            .createSignedUrl(path, 3600);
          return data?.signedUrl || "";
        }),
      );

      return urls.filter((url) => url !== "");
    };

    let isActive = true;

    void loadImageUrls().then((urls) => {
      if (isActive && urls) {
        setImageUrls(urls);
      }
    });

    return () => {
      isActive = false;
    };
  }, [selectedIssue?.id, selectedIssue?.image_paths]);

  const handleReview = async (action: "approved" | "rejected") => {
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
      await loadIssues();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("issues.failedToUpdateIssue"));
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityBadge = useCallback((severity: string) => (
    <SeverityBadge
      severity={
        (["critical", "high", "medium", "low"].includes(severity)
          ? severity
          : "low") as "critical" | "high" | "medium" | "low"
      }
      label={t(`issues.severity.${severity}`, severity)}
    />
  ), [t]);

  const getStatusBadge = useCallback((status: string) => {
    const badgeStatus: Record<string, "pending" | "approved" | "rejected" | "cancelled"> = {
      pending: "pending",
      approved: "approved",
      rejected: "rejected",
      closed: "cancelled",
    };
    return (
      <StatusBadge
        status={badgeStatus[status] || "pending"}
        label={t(`issues.status.${status}`, status)}
      />
    );
  }, [t]);

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
      accessorFn: (row) => row.operation?.part?.job?.job_number || "",
    },
    {
      id: "part",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("common.part", "Part")} />
      ),
      cell: ({ row }) => row.original.operation?.part?.part_number || "-",
      accessorFn: (row) => row.operation?.part?.part_number || "",
    },
    {
      id: "operation",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("common.operation", "Operation")} />
      ),
      cell: ({ row }) => row.original.operation?.operation_name || "-",
      accessorFn: (row) => row.operation?.operation_name || "",
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
      accessorFn: (row) => row.creator?.full_name || "",
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
  ], [getSeverityBadge, getStatusBadge, t]);

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

  const analytics = useMemo(() => {
    const total = issues.length;
    const byStatus = {
      pending: issues.filter((i) => i.status === "pending").length,
      approved: issues.filter((i) => i.status === "approved").length,
      rejected: issues.filter((i) => i.status === "rejected").length,
      closed: issues.filter((i) => i.status === "closed").length,
    };

    return {
      total,
      byStatus,
      criticalPending: issues.filter(
        (i) => i.severity === "critical" && i.status === "pending"
      ).length,
    };
  }, [issues]);

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

      <PageStatsRow
        stats={[
          { label: t("issues.totalIssues", "Total Issues"), value: analytics.total, icon: AlertCircle, color: "primary" },
          { label: t("issues.status.pending"), value: analytics.byStatus.pending, icon: Clock, color: analytics.byStatus.pending > 0 ? "warning" : "muted" },
          { label: t("issues.criticalPending", "Critical"), value: analytics.criticalPending, icon: AlertOctagon, color: analytics.criticalPending > 0 ? "error" : "muted" },
          { label: t("issues.resolved", "Resolved"), value: analytics.byStatus.approved + analytics.byStatus.closed, icon: CheckCircle, color: "success" },
        ]}
      />

      <div className="glass-card p-4">
        <DataTable
          columns={columns}
          data={issues}
          filterableColumns={filterableColumns}
          searchableColumns={[
            { id: "job", title: t("common.job", "Job") },
            { id: "part", title: t("common.part", "Part") },
            { id: "operation", title: t("common.operation", "Operation") },
            { id: "reporter", title: t("issues.reporter", "Reporter") },
            { id: "description", title: t("issues.description", "Description") },
          ]}
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

      <Dialog
        open={!!selectedIssue}
        onOpenChange={() => setSelectedIssue(null)}
      >
        <DialogContent className="glass-card max-w-2xl overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t("issues.reviewIssue")}</DialogTitle>
          </DialogHeader>

          {selectedIssue && (
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {getSeverityBadge(selectedIssue.severity)}
                {getStatusBadge(selectedIssue.status)}
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
            </div>
          )}

          {selectedIssue && (
            <div className="shrink-0 flex gap-3 border-t pt-4">
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
