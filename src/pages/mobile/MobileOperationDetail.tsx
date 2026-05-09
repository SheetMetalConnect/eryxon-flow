import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  FileText,
  Flame,
  Loader2,
  Package,
  Pause,
  Play,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { useOperator } from "@/contexts/OperatorContext";
import { useHaptics } from "@/hooks/useHaptics";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchOperationsWithDetails,
  startTimeTracking,
  stopTimeTracking,
  completeOperation,
  type OperationWithDetails,
} from "@/lib/database";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MobileTopBar } from "@/components/mobile";
import MobileIssueSheet from "./MobileIssueSheet";

interface MobileOperationDetailProps {
  /** Render without the navigation chrome (used inside iPad split view). */
  embedded?: boolean;
  operationId?: string;
  onAfterMutate?: () => void | Promise<void>;
}

/**
 * Mobile operation detail screen. Designed for one-handed iPhone use:
 * the primary action button (Start / Stop / Complete) is anchored at the
 * bottom in thumb reach, and secondary actions live above it.
 */
export default function MobileOperationDetail(
  props: MobileOperationDetailProps = {},
) {
  const { t } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const operationId = props.operationId ?? params.operationId ?? "";
  const profile = useProfile();
  const { activeOperator } = useOperator();
  const haptics = useHaptics();
  const operatorId = activeOperator?.id || profile?.id;

  const [operation, setOperation] = useState<OperationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"start" | "stop" | "complete" | null>(null);
  const [showIssue, setShowIssue] = useState(
    searchParams.get("tab") === "issue",
  );

  const reload = useCallback(async () => {
    if (!profile?.tenant_id) return;
    try {
      const ops = await fetchOperationsWithDetails(profile.tenant_id);
      const match = ops.find((op) => op.id === operationId) ?? null;
      setOperation(match);
    } catch (error) {
      logger.error("MobileOperationDetail", "Failed to load operation", error);
    } finally {
      setLoading(false);
    }
  }, [operationId, profile?.tenant_id]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void reload();
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const isMyTimer =
    operation?.active_time_entry?.operator_id === operatorId;
  const isOtherTimer = operation?.active_time_entry && !isMyTimer;
  const remainingMinutes = useMemo(
    () =>
      (operation?.estimated_time ?? 0) - (operation?.actual_time ?? 0),
    [operation?.estimated_time, operation?.actual_time],
  );

  const refresh = useCallback(async () => {
    await reload();
    if (props.onAfterMutate) await props.onAfterMutate();
  }, [reload, props]);

  const handleStart = useCallback(async () => {
    if (!operation || !operatorId || !profile?.tenant_id) return;
    setBusy("start");
    try {
      await startTimeTracking(operation.id, operatorId, profile.tenant_id);
      await haptics.success();
      toast.success(t("operations.timeTrackingStarted"));
      await refresh();
    } catch (error) {
      await haptics.error();
      toast.error(
        error instanceof Error
          ? error.message
          : t("operations.failedToStartTimeTracking"),
      );
    } finally {
      setBusy(null);
    }
  }, [operation, operatorId, profile?.tenant_id, haptics, t, refresh]);

  const handleStop = useCallback(async () => {
    if (!operation || !operatorId) return;
    setBusy("stop");
    try {
      await stopTimeTracking(operation.id, operatorId);
      await haptics.medium();
      toast.success(t("operations.timeTrackingStopped"));
      await refresh();
    } catch (error) {
      await haptics.error();
      toast.error(
        error instanceof Error
          ? error.message
          : t("operations.failedToStopTimeTracking"),
      );
    } finally {
      setBusy(null);
    }
  }, [operation, operatorId, haptics, t, refresh]);

  const handleComplete = useCallback(async () => {
    if (!operation || !profile?.tenant_id) return;
    setBusy("complete");
    try {
      await completeOperation(operation.id, profile.tenant_id, operatorId);
      await haptics.success();
      toast.success(t("operations.operationComplete"));
      await refresh();
      if (!props.embedded) navigate(-1);
    } catch (error) {
      await haptics.error();
      toast.error(
        error instanceof Error
          ? error.message
          : t("operations.failedToComplete"),
      );
    } finally {
      setBusy(null);
    }
  }, [operation, profile?.tenant_id, operatorId, haptics, t, refresh, props.embedded, navigate]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!operation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {t("operations.notFound", "Operation not found")}
        </p>
        {!props.embedded ? (
          <Button onClick={() => navigate(-1)} variant="outline" className="mt-2">
            {t("common.back", "Back")}
          </Button>
        ) : null}
      </div>
    );
  }

  const due =
    operation.part.job.due_date_override || operation.part.job.due_date;
  const dueDate = typeof due === "string" ? new Date(due) : null;
  const validDue = dueDate && Number.isFinite(dueDate.getTime());
  const isOvertime = remainingMinutes < 0;

  const primaryAction = isMyTimer ? (
    <PrimaryButton
      tone="amber"
      icon={<Square className="h-5 w-5" />}
      busy={busy === "stop"}
      onClick={handleStop}
    >
      {t("operations.stopTimer", "Stop timer")}
    </PrimaryButton>
  ) : isOtherTimer ? (
    <PrimaryButton tone="muted" disabled>
      {t("operations.lockedByOther", "Timer locked by another operator")}
    </PrimaryButton>
  ) : operation.status === "completed" ? (
    <PrimaryButton tone="emerald" disabled icon={<CheckCircle2 className="h-5 w-5" />}>
      {t("operations.completed", "Completed")}
    </PrimaryButton>
  ) : (
    <PrimaryButton
      tone="emerald"
      icon={<Play className="h-5 w-5" />}
      busy={busy === "start"}
      onClick={handleStart}
    >
      {t("operations.startTimer", "Start timer")}
    </PrimaryButton>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!props.embedded ? (
        <MobileTopBar
          title={operation.operation_name}
          kicker={`${operation.part.job.job_number} · ${operation.part.part_number}`}
          showBack
        />
      ) : null}

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
          <section className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/60 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <span className="font-mono">{operation.part.job.job_number}</span>
                <span>·</span>
                <span className="truncate">{operation.part.job.customer ?? ""}</span>
              </div>
              <h1 className="truncate text-xl font-semibold leading-tight">
                {operation.operation_name}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-[13px] text-muted-foreground">
                <span>{operation.part.part_number}</span>
                {operation.part.material ? (
                  <>
                    <span>·</span>
                    <span>{operation.part.material}</span>
                  </>
                ) : null}
                <span>·</span>
                <span>{operation.part.quantity} pcs</span>
              </div>
            </div>
            <span
              className="ml-3 shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold text-white"
              style={{
                backgroundColor: operation.cell.color || "hsl(var(--primary))",
              }}
            >
              {operation.cell.name}
            </span>
          </section>

          <section className="grid grid-cols-3 gap-2">
            <Stat
              label={t("operations.estimated", "Est.")}
              value={`${operation.estimated_time}m`}
              icon={<Clock3 className="h-3.5 w-3.5" />}
            />
            <Stat
              label={t("operations.actual", "Actual")}
              value={`${operation.actual_time ?? 0}m`}
            />
            <Stat
              label={t("operations.remaining", "Remaining")}
              value={`${isOvertime ? "+" : ""}${Math.abs(remainingMinutes)}m`}
              tone={isOvertime ? "danger" : undefined}
            />
          </section>

          {operation.active_time_entry ? (
            <section
              className={cn(
                "rounded-2xl border p-4",
                isMyTimer
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-orange-500/40 bg-orange-500/10",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">
                    {isMyTimer
                      ? t("operations.youAreRunning", "You are running this op")
                      : t("operations.someoneElseRunning", "Running by another operator")}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    {operation.active_time_entry.operator.full_name} ·{" "}
                    {formatDistanceToNow(
                      new Date(operation.active_time_entry.start_time),
                      { addSuffix: true },
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {operation.part.is_bullet_card ? (
            <Banner
              tone="danger"
              icon={<Flame className="h-4 w-4" />}
              title={t("operations.rushTitle", "Rush job")}
              body={t(
                "operations.rushBody",
                "Customer expedited. Prioritize this part above the rest of your queue.",
              )}
            />
          ) : null}

          {operation.part.parent_part_id ? (
            <Banner
              tone="warning"
              icon={<Package className="h-4 w-4" />}
              title={t("operations.assemblyPart", "Assembly part")}
              body={t(
                "operations.assemblyWarning",
                "Make sure all child parts are completed before assembly.",
              )}
            />
          ) : null}

          {validDue ? (
            <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("operations.dueDate", "Due")}
              </div>
              <div className="mt-1 text-base font-semibold">
                {format(dueDate, "EEEE, MMM d, yyyy")}
              </div>
              <div className="text-[12px] text-muted-foreground">
                {formatDistanceToNow(dueDate, { addSuffix: true })}
              </div>
            </section>
          ) : null}

          {operation.notes ? (
            <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("operations.notes", "Notes")}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[14px] leading-snug">
                {operation.notes}
              </p>
            </section>
          ) : null}

          <section className="grid grid-cols-2 gap-2">
            <SecondaryButton
              icon={<AlertTriangle className="h-4 w-4" />}
              tone="danger"
              onClick={() => {
                void haptics.warning();
                setShowIssue(true);
              }}
            >
              {t("issues.report", "Report issue")}
            </SecondaryButton>
            <SecondaryButton
              icon={<CheckCircle2 className="h-4 w-4" />}
              tone="emerald"
              onClick={handleComplete}
              busy={busy === "complete"}
              disabled={
                operation.status === "completed" || Boolean(operation.active_time_entry)
              }
            >
              {t("operations.complete", "Mark complete")}
            </SecondaryButton>
          </section>

          {operation.part.file_paths && operation.part.file_paths.length > 0 ? (
            <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("operations.files", "Drawings & models")}
              </div>
              <ul className="mt-2 flex flex-col divide-y divide-border/50">
                {operation.part.file_paths.map((path) => (
                  <li
                    key={path}
                    className="flex items-center gap-2 py-2 text-[13px]"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">
                      {path.split("/").pop()}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t(
                  "operations.openOnDesktop",
                  "Tap on the desktop terminal to open large STEP / PDF previews.",
                )}
              </p>
            </section>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-border/60 bg-background/85 backdrop-blur-xl px-4 pt-3",
          props.embedded
            ? "pb-3"
            : "pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
        )}
      >
        {primaryAction}
      </div>

      <MobileIssueSheet
        open={showIssue}
        onClose={() => setShowIssue(false)}
        operation={operation}
        onCreated={refresh}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border/50 bg-card/60 px-2 py-2.5 text-center">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[15px] font-semibold tabular-nums",
          tone === "danger" ? "text-red-500" : undefined,
        )}
      >
        {icon}
        {value}
      </span>
    </div>
  );
}

function Banner({
  tone,
  icon,
  title,
  body,
}: {
  tone: "danger" | "warning";
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <section
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-3",
        tone === "danger"
          ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
          : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      )}
    >
      <span className="mt-0.5">{icon}</span>
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[12px] opacity-90">{body}</div>
      </div>
    </section>
  );
}

interface PrimaryButtonProps {
  tone: "emerald" | "amber" | "muted";
  busy?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}

function PrimaryButton({
  tone,
  busy,
  disabled,
  icon,
  onClick,
  children,
}: PrimaryButtonProps) {
  const isDisabled = disabled || busy;
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold transition-all",
        "active:scale-[0.985]",
        isDisabled && "opacity-60",
        tone === "emerald"
          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
          : tone === "amber"
            ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25"
            : "bg-muted text-muted-foreground",
      )}
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      <span>{children}</span>
    </button>
  );
}

interface SecondaryButtonProps {
  tone: "emerald" | "danger" | "muted";
  busy?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}

function SecondaryButton({
  tone,
  busy,
  disabled,
  icon,
  onClick,
  children,
}: SecondaryButtonProps) {
  const isDisabled = disabled || busy;
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        "flex h-12 items-center justify-center gap-1.5 rounded-2xl border text-[13px] font-semibold transition-colors",
        "active:scale-[0.985]",
        isDisabled && "opacity-60",
        tone === "emerald" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        tone === "danger" && "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
        tone === "muted" && "border-border bg-muted/30 text-muted-foreground",
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      <span>{children}</span>
    </button>
  );
}
