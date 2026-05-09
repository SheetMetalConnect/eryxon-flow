import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  Loader2,
  Pause,
  Play,
  Search,
  ScanLine,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { useOperator } from "@/contexts/OperatorContext";
import { useNative } from "@/hooks/useNative";
import { useHaptics } from "@/hooks/useHaptics";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchOperationsWithDetails,
  startTimeTracking,
  stopTimeTracking,
  type OperationWithDetails,
} from "@/lib/database";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import {
  dueUrgencyTextClass,
  getDueUrgency,
  type DueUrgency,
} from "@/lib/due-date";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MobileTopBar,
  PullToRefresh,
  SwipeRow,
  IPadSplit,
} from "@/components/mobile";
import MobileOperationDetail from "./MobileOperationDetail";

type Filter = "all" | "mine" | "active" | "rush";

const URGENCY_LABEL: Record<DueUrgency, string> = {
  overdue: "OVERDUE",
  today: "TODAY",
  soon: "SOON",
  normal: "",
  none: "",
};

/**
 * Mobile-first work queue for operators. iPhone shows a single scrollable
 * list; iPad shows the list plus the selected operation detail in a split
 * view. Both flavors use swipe-actions for the most common operator
 * gestures (Start / Pause / Issue) so the primary tasks never need a modal.
 */
export default function MobileQueue() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useProfile();
  const { activeOperator } = useOperator();
  const native = useNative();
  // Drive the master/detail decision off the *viewport*, not the UA. This
  // means iPad Slide Over (which shrinks the WebView below tablet width)
  // collapses to single-column, and Android freeform / split-screen does
  // the same. UA-based `isIPad` would lie in both cases.
  const { isLargeTablet } = useTabletLayout();
  const useSplit = isLargeTablet;
  const haptics = useHaptics();
  const [operations, setOperations] = useState<OperationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const operatorId = activeOperator?.id || profile?.id;

  const load = useCallback(async () => {
    if (!profile?.tenant_id) return;
    try {
      const data = await fetchOperationsWithDetails(profile.tenant_id);
      setOperations(data);
    } catch (error) {
      logger.error("MobileQueue", "Failed to load operations", error);
      toast.error(t("workQueue.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, t]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    if (!profile?.tenant_id) return () => { cancelled = true; };
    const channel = supabase
      .channel("mobile-queue-ops")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operations",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => void load(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_entries",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [load, profile?.tenant_id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return operations
      .filter((op) => {
        if (filter === "active" && op.status !== "in_progress") return false;
        if (
          filter === "mine" &&
          op.assigned_operator_id !== operatorId &&
          op.active_time_entry?.operator_id !== operatorId
        )
          return false;
        if (filter === "rush" && !op.part?.is_bullet_card) return false;
        if (!q) return true;
        return (
          op.operation_name.toLowerCase().includes(q) ||
          op.part.part_number.toLowerCase().includes(q) ||
          op.part.job.job_number.toLowerCase().includes(q) ||
          (op.part.job.customer ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const orderA = statusOrder(a.status);
        const orderB = statusOrder(b.status);
        if (orderA !== orderB) return orderA - orderB;
        return a.sequence - b.sequence;
      });
  }, [operations, search, filter, operatorId]);

  const handleStart = useCallback(
    async (op: OperationWithDetails) => {
      if (!operatorId || !profile?.tenant_id) return;
      try {
        await startTimeTracking(op.id, operatorId, profile.tenant_id);
        await haptics.success();
        toast.success(t("operations.timeTrackingStarted"));
        await load();
      } catch (error) {
        await haptics.error();
        toast.error(
          error instanceof Error
            ? error.message
            : t("operations.failedToStartTimeTracking"),
        );
      }
    },
    [operatorId, profile?.tenant_id, haptics, t, load],
  );

  const handleStop = useCallback(
    async (op: OperationWithDetails) => {
      if (!operatorId) return;
      try {
        await stopTimeTracking(op.id, operatorId);
        await haptics.medium();
        toast.success(t("operations.timeTrackingStopped"));
        await load();
      } catch (error) {
        await haptics.error();
        toast.error(
          error instanceof Error
            ? error.message
            : t("operations.failedToStopTimeTracking"),
        );
      }
    },
    [operatorId, haptics, t, load],
  );

  const onSelect = useCallback(
    (op: OperationWithDetails) => {
      void haptics.selection();
      if (useSplit) {
        setSelectedId(op.id);
      } else {
        navigate(`/m/op/${op.id}`);
      }
    },
    [useSplit, navigate, haptics],
  );

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <MobileTopBar
        title={t("navigation.workQueue", "Work Queue")}
        kicker={activeOperator?.full_name}
        trailing={
          <button
            type="button"
            onClick={() => {
              void haptics.light();
              navigate("/m/scan");
            }}
            className="grid h-10 w-10 place-items-center rounded-full text-primary active:bg-primary/10"
            aria-label="Scan"
          >
            <ScanLine className="h-5 w-5" />
          </button>
        }
      />

      <div className="flex shrink-0 flex-col gap-2 px-3 pb-2 pt-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            inputMode="search"
            enterKeyHint="search"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder={t(
              "workQueue.searchPlaceholder",
              "Search job, part, operation",
            )}
            className="h-11 rounded-2xl border-border/60 bg-card/70 pl-9 text-base"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-muted text-muted-foreground active:bg-muted/80"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div
          role="tablist"
          className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-muted/40 p-1 text-[13px]"
        >
          {(
            [
              { id: "all", label: t("filters.all", "All") },
              { id: "mine", label: t("filters.mine", "Mine") },
              { id: "active", label: t("filters.active", "Active") },
              { id: "rush", label: t("filters.rush", "Rush") },
            ] as { id: Filter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => {
                void haptics.selection();
                setFilter(tab.id);
              }}
              className={cn(
                "h-9 flex-1 rounded-xl px-3 font-medium transition-colors",
                filter === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground active:bg-background/40",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <PullToRefresh
        onRefresh={load}
        className="flex-1 px-3 pb-3"
      >
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyQueue
            label={
              search
                ? t("workQueue.noMatches", "No operations match your search")
                : t("workQueue.empty", "Nothing on your queue right now")
            }
          />
        ) : (
          <ul className="flex flex-col gap-2 pb-4">
            {filtered.map((op) => (
              <MobileQueueRow
                key={op.id}
                operation={op}
                operatorId={operatorId}
                selected={selectedId === op.id}
                onSelect={() => onSelect(op)}
                onStart={() => void handleStart(op)}
                onStop={() => void handleStop(op)}
                onIssue={() => navigate(`/m/op/${op.id}?tab=issue`)}
              />
            ))}
          </ul>
        )}
      </PullToRefresh>
    </div>
  );

  if (useSplit) {
    const selected = filtered.find((op) => op.id === selectedId) ?? null;
    return (
      <IPadSplit
        master={list}
        detail={
          selected ? (
            <MobileOperationDetail
              operationId={selected.id}
              embedded
              onAfterMutate={load}
            />
          ) : null
        }
        emptyState={t(
          "workQueue.selectPrompt",
          "Tap an operation to see details, start a timer, or report an issue.",
        )}
      />
    );
  }

  return list;
}

interface MobileQueueRowProps {
  operation: OperationWithDetails;
  operatorId: string | undefined;
  selected: boolean;
  onSelect: () => void;
  onStart: () => void;
  onStop: () => void;
  onIssue: () => void;
}

function MobileQueueRow({
  operation: op,
  operatorId,
  selected,
  onSelect,
  onStart,
  onStop,
  onIssue,
}: MobileQueueRowProps) {
  const { t } = useTranslation();
  const isActive = Boolean(op.active_time_entry);
  const isMine =
    op.assigned_operator_id === operatorId ||
    op.active_time_entry?.operator_id === operatorId;
  const isRush = Boolean(op.part?.is_bullet_card);
  const dueRaw = op.part.job.due_date_override || op.part.job.due_date;
  const due = typeof dueRaw === "string" ? new Date(dueRaw) : null;
  const urgency = getDueUrgency(typeof dueRaw === "string" ? dueRaw : null);
  const remainingHours =
    (op.estimated_time || 0) / 60 - (op.actual_time || 0) / 60;
  const overtime = remainingHours < 0;

  // Trailing swipe always offers Issue. The primary lead swipe is start/stop
  // depending on whether the timer is already running for this operator.
  const leading = isActive
    ? [
        {
          key: "stop",
          label: t("operations.stop", "Stop"),
          icon: <Pause className="h-5 w-5" />,
          color: "bg-amber-500",
          onAction: onStop,
        },
      ]
    : [
        {
          key: "start",
          label: t("operations.start", "Start"),
          icon: <Play className="h-5 w-5" />,
          color: "bg-emerald-500",
          onAction: onStart,
        },
      ];

  return (
    <li>
      <SwipeRow
        leading={leading}
        trailing={[
          {
            key: "issue",
            label: t("issues.report", "Issue"),
            icon: <AlertTriangle className="h-5 w-5" />,
            color: "bg-red-500",
            onAction: onIssue,
          },
        ]}
      >
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "flex w-full items-stretch gap-3 px-4 py-3 text-left",
            "min-h-[64px]",
            selected ? "bg-primary/10" : "active:bg-muted/50",
          )}
        >
          <div
            className={cn(
              "w-1 shrink-0 rounded-full",
              isActive
                ? "bg-amber-500"
                : op.status === "on_hold"
                  ? "bg-orange-400"
                  : op.status === "completed"
                    ? "bg-emerald-500"
                    : "bg-slate-300 dark:bg-slate-600",
            )}
          />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-mono text-[12px] text-muted-foreground">
                {op.part.job.job_number}
              </span>
              {isRush ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/15 px-1.5 py-px text-[10px] font-bold text-red-500">
                  <Flame className="h-3 w-3" /> RUSH
                </span>
              ) : null}
              {isMine && !isActive ? (
                <span className="rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Mine
                </span>
              ) : null}
              <span className="ml-auto truncate text-[11px] font-medium">
                <span className={cn("inline-flex items-center gap-1", dueUrgencyTextClass[urgency])}>
                  {URGENCY_LABEL[urgency] ? (
                    <span className="rounded px-1 py-px text-[8px] font-bold uppercase tracking-wider">
                      {URGENCY_LABEL[urgency]}
                    </span>
                  ) : null}
                  {due && Number.isFinite(due.getTime()) ? format(due, "dd MMM") : ""}
                </span>
              </span>
            </div>
            <div className="truncate text-[15px] font-semibold leading-tight text-foreground">
              {op.operation_name}
            </div>
            <div className="flex items-center gap-2 truncate text-[12px] text-muted-foreground">
              <span className="truncate">{op.part.part_number}</span>
              {op.part.material ? (
                <>
                  <span className="text-border">·</span>
                  <span className="truncate">{op.part.material}</span>
                </>
              ) : null}
              <span className="text-border">·</span>
              <span className="font-medium">{op.cell?.name ?? ""}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-[11px]">
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-medium",
                  overtime
                    ? "text-red-500"
                    : "text-muted-foreground",
                )}
              >
                <Clock3 className="h-3 w-3" />
                {overtime ? "+" : ""}
                {Math.abs(remainingHours).toFixed(1)}h
              </span>
              <span className="text-muted-foreground">
                {op.part.quantity} pcs
              </span>
              {isActive ? (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                  </span>
                  {op.active_time_entry?.operator.full_name?.split(" ")[0]}
                </span>
              ) : op.status === "completed" ? (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" /> DONE
                </span>
              ) : null}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground/60" />
        </button>
      </SwipeRow>
    </li>
  );
}

function statusOrder(status: string): number {
  if (status === "in_progress") return 0;
  if (status === "not_started") return 1;
  if (status === "on_hold") return 2;
  return 3;
}

function EmptyQueue({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-muted/40">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
      </div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="max-w-[260px] text-xs text-muted-foreground">
        Pull down to refresh, or tap the scan icon to jump to a job by QR.
      </p>
    </div>
  );
}
