import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  PackageSearch,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useOperator } from "@/contexts/OperatorContext";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { MobileTopBar, PullToRefresh } from "@/components/mobile";

interface Issue {
  id: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  resolution_notes: string | null;
  operation: {
    operation_name: string;
    part: {
      part_number: string;
      job: { job_number: string };
    };
  };
}

const SEVERITY_TONE: Record<Issue["severity"], string> = {
  low: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  medium: "bg-amber-500/15 text-amber-500 border-amber-500/40",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/40",
  critical: "bg-red-500/15 text-red-500 border-red-500/40",
};

const STATUS_LABEL: Record<Issue["status"], string> = {
  open: "Open",
  acknowledged: "Reviewing",
  resolved: "Resolved",
  rejected: "Closed",
};

type Tab = "open" | "resolved";

export default function MobileIssues() {
  const { t } = useTranslation();
  const profile = useProfile();
  const { activeOperator } = useOperator();
  const operatorId = activeOperator?.id || profile?.id;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("open");

  const load = useCallback(async () => {
    if (!operatorId) {
      setIssues([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("issues")
      .select(
        `id, description, severity, status, created_at, reviewed_at, resolution_notes,
        operation:operations!inner(
          operation_name,
          part:parts!inner(
            part_number,
            job:jobs!inner(job_number)
          )
        )`,
      )
      .eq("created_by", operatorId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      logger.error("MobileIssues", "Failed to load issues", error);
      setIssues([]);
    } else {
      setIssues((data ?? []) as unknown as Issue[]);
    }
    setLoading(false);
  }, [operatorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      open: issues.filter(
        (issue) => issue.status === "open" || issue.status === "acknowledged",
      ).length,
      resolved: issues.filter(
        (issue) => issue.status === "resolved" || issue.status === "rejected",
      ).length,
    }),
    [issues],
  );

  const filtered = useMemo(
    () =>
      issues.filter((issue) =>
        tab === "open"
          ? issue.status === "open" || issue.status === "acknowledged"
          : issue.status === "resolved" || issue.status === "rejected",
      ),
    [issues, tab],
  );

  return (
    <div className="flex h-full flex-col">
      <MobileTopBar
        title={t("navigation.myIssues", "My Issues")}
        kicker={activeOperator?.full_name ?? profile?.full_name ?? ""}
      />

      <div className="shrink-0 px-3 pt-2">
        <div
          role="tablist"
          className="flex gap-1 rounded-2xl bg-muted/40 p-1 text-[13px]"
        >
          {([
            { id: "open" as Tab, label: t("issues.openTab", "Open") },
            { id: "resolved" as Tab, label: t("issues.resolvedTab", "Resolved") },
          ]).map((option) => (
            <button
              key={option.id}
              role="tab"
              type="button"
              aria-selected={tab === option.id}
              onClick={() => setTab(option.id)}
              className={cn(
                "flex h-9 flex-1 items-center justify-center gap-2 rounded-xl px-3 font-medium",
                tab === option.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground active:bg-background/40",
              )}
            >
              {option.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[10px] font-semibold",
                  tab === option.id
                    ? "bg-primary/10 text-primary"
                    : "bg-muted-foreground/10 text-muted-foreground",
                )}
              >
                {counts[option.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <PullToRefresh onRefresh={load} className="flex-1 px-3 pb-4 pt-2">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            {tab === "open" ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm">
                  {t("issues.allClear", "All clear — no open issues")}
                </p>
              </>
            ) : (
              <>
                <PackageSearch className="h-8 w-8" />
                <p className="text-sm">
                  {t("issues.noResolved", "No resolved issues yet")}
                </p>
              </>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2 pb-4">
            {filtered.map((issue) => (
              <li
                key={issue.id}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card/60"
              >
                <div className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                      issue.severity === "critical" || issue.severity === "high"
                        ? "bg-red-500/15 text-red-500"
                        : issue.severity === "medium"
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-emerald-500/15 text-emerald-500",
                    )}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <span className="font-mono">
                        {issue.operation.part.job.job_number}
                      </span>
                      <span>·</span>
                      <span className="truncate">
                        {issue.operation.part.part_number}
                      </span>
                    </div>
                    <div className="text-[14px] font-semibold leading-tight">
                      {issue.operation.operation_name}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                      {issue.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px]">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wider",
                          SEVERITY_TONE[issue.severity],
                        )}
                      >
                        {issue.severity}
                      </span>
                      <span className="rounded-full bg-muted/40 px-2 py-0.5 font-medium text-muted-foreground">
                        {STATUS_LABEL[issue.status]}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        {format(new Date(issue.created_at), "dd MMM HH:mm")}
                      </span>
                    </div>
                    {issue.resolution_notes ? (
                      <div className="mt-2 rounded-xl border border-border/40 bg-muted/30 p-2 text-[12px] text-muted-foreground">
                        {issue.resolution_notes}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PullToRefresh>
    </div>
  );
}
