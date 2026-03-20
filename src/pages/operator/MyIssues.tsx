import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOperator } from "@/contexts/OperatorContext";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Clock3, ShieldAlert, PackageSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import {
  OperatorEmptyState,
  OperatorPageHeader,
  OperatorPanel,
  OperatorStatCard,
  OperatorStatusChip,
} from "@/components/operator/OperatorStation";

interface Issue {
  id: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  resolution_notes: string | null;
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
}

export default function MyIssues() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { activeOperator } = useOperator();
  const operatorId = activeOperator?.id || profile?.id;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

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
            .createSignedUrl(path, 3600);
          return data?.signedUrl || "";
        }),
      );

      setImageUrls(urls.filter(Boolean));
    };

    void loadImageUrls();
  }, [selectedIssue?.id, selectedIssue?.image_paths]);

  const loadIssues = useCallback(async () => {
    if (!operatorId) return;

    const { data, error } = await supabase
      .from("issues")
      .select(`
        *,
        operation:operations!inner(
          operation_name,
          part:parts!inner(
            part_number,
            job:jobs!inner(job_number)
          )
        )
      `)
      .eq("created_by", operatorId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("MyIssues", "Error loading issues", error);
    } else {
      setIssues((data as Issue[]) || []);
    }
    setLoading(false);
  }, [operatorId]);

  const setupRealtime = useCallback(() => {
    if (!operatorId) return;

    const channel = supabase
      .channel("my-issues")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "issues",
          filter: `created_by=eq.${operatorId}`,
        },
        () => void loadIssues(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadIssues, operatorId]);

  useEffect(() => {
    if (!operatorId) return;
    const loadTimeout = window.setTimeout(() => {
      void loadIssues();
    }, 0);
    const cleanup = setupRealtime();
    return () => {
      clearTimeout(loadTimeout);
      cleanup?.();
    };
  }, [loadIssues, operatorId, setupRealtime]);

  const severityColors = {
    low: "border-border bg-background/70 text-muted-foreground",
    medium: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    high: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    critical: "border-destructive/30 bg-destructive/10 text-destructive",
  };

  const statusColors = {
    pending: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    rejected: "border-destructive/30 bg-destructive/10 text-destructive",
    closed: "border-border bg-background/70 text-muted-foreground",
  };

  const pendingCount = issues.filter((issue) => issue.status === "pending").length;
  const resolvedCount = issues.filter(
    (issue) => issue.status === "approved" || issue.status === "closed",
  ).length;
  const criticalCount = issues.filter(
    (issue) => issue.severity === "critical" || issue.severity === "high",
  ).length;

  const latestIssueDate = useMemo(() => {
    if (!issues.length) return null;
    return format(new Date(issues[0].created_at), "MMM d, yyyy");
  }, [issues]);

  if (loading) {
    return (
      <OperatorPanel className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            {t("myIssues.loading", "Loading issues")}
          </p>
        </div>
      </OperatorPanel>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <OperatorPageHeader
          eyebrow={t("navigation.myIssues")}
          title={t("myIssues.title")}
          description={t(
            "myIssues.description",
            "Track operator-reported issues with clear severity, review status, and supporting photos without leaving the shop-floor flow.",
          )}
          meta={
            activeOperator ? (
              <OperatorStatusChip
                tone="active"
                label={`${activeOperator.full_name} • ${activeOperator.employee_id}`}
              />
            ) : undefined
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OperatorStatCard
            label={t("myIssues.openIssues", "Open issues")}
            value={pendingCount}
            icon={Clock3}
            tone="warning"
          />
          <OperatorStatCard
            label={t("myIssues.resolvedIssues", "Resolved")}
            value={resolvedCount}
            icon={CheckCircle2}
            tone="success"
          />
          <OperatorStatCard
            label={t("myIssues.highSeverity", "High severity")}
            value={criticalCount}
            icon={ShieldAlert}
            tone="danger"
          />
          <OperatorStatCard
            label={t("myIssues.lastReported", "Last reported")}
            value={latestIssueDate || "-"}
            icon={AlertCircle}
          />
        </div>

        {issues.length === 0 ? (
          <OperatorEmptyState
            icon={PackageSearch}
            title={t("myIssues.noIssues")}
            description={t("myIssues.noIssuesDescription")}
          />
        ) : (
          <div className="grid gap-4">
            {issues.map((issue) => (
              <OperatorPanel
                key={issue.id}
                className="cursor-pointer transition-colors hover:border-primary/30 hover:bg-muted/20"
                onClick={() => setSelectedIssue(issue)}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`rounded-full ${severityColors[issue.severity as keyof typeof severityColors]}`}
                      >
                        {issue.severity}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`rounded-full ${statusColors[issue.status as keyof typeof statusColors]}`}
                      >
                        {issue.status}
                      </Badge>
                    </div>
                    <div className="text-base font-semibold text-foreground">
                      {issue.operation.part.job.job_number} •{" "}
                      {issue.operation.part.part_number}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {issue.operation.operation_name}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {issue.description}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background/70 px-3 py-2 text-right text-sm text-muted-foreground">
                    {format(new Date(issue.created_at), "MMM d, yyyy")}
                  </div>
                </div>
              </OperatorPanel>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(selectedIssue)} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-2xl border-border/80 bg-popover">
          <DialogHeader>
            <DialogTitle>{t("myIssues.issueDetails")}</DialogTitle>
          </DialogHeader>

          {selectedIssue ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={`rounded-full ${severityColors[selectedIssue.severity as keyof typeof severityColors]}`}
                >
                  {selectedIssue.severity}
                </Badge>
                <Badge
                  variant="outline"
                  className={`rounded-full ${statusColors[selectedIssue.status as keyof typeof statusColors]}`}
                >
                  {selectedIssue.status}
                </Badge>
              </div>

              <OperatorPanel className="space-y-3 p-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("myIssues.operation")}
                  </div>
                  <div className="mt-1 font-semibold text-foreground">
                    {selectedIssue.operation.part.job.job_number} •{" "}
                    {selectedIssue.operation.part.part_number} •{" "}
                    {selectedIssue.operation.operation_name}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("myIssues.description")}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {selectedIssue.description}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("myIssues.created")}
                    </div>
                    <div className="mt-1 text-sm text-foreground">
                      {format(new Date(selectedIssue.created_at), "PPp")}
                    </div>
                  </div>
                  {selectedIssue.reviewed_at ? (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {t("myIssues.reviewed")}
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {format(new Date(selectedIssue.reviewed_at), "PPp")}
                      </div>
                    </div>
                  ) : null}
                </div>

                {selectedIssue.resolution_notes ? (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("myIssues.resolutionNotes")}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {selectedIssue.resolution_notes}
                    </div>
                  </div>
                ) : null}
              </OperatorPanel>

              {imageUrls.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("myIssues.attachedPhotos")}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {imageUrls.map((url, index) => (
                      <img
                        key={url}
                        src={url}
                        alt={`${t("myIssues.issuePhoto")} ${index + 1}`}
                        className="rounded-2xl border border-border object-cover"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
