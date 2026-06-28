import type { TFunction } from "i18next";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/time-utils";
import type { OperationBookedHours } from "@/hooks/useOperationBookedHours";

/**
 * Booked-vs-budget time and the operators who worked the current operation.
 *
 * Reads the live booked totals from useOperationBookedHours (minutes) and the
 * planned estimate, and shows where the operation stands: time booked so far,
 * the budget, an over/under chip, and who put time on it. Display only — it
 * guides the team leader, it does not gate the operator.
 */
export function OperationTimeSummary({
  booked,
  t,
}: {
  booked: OperationBookedHours;
  t: TFunction;
}) {
  const { totalMinutes, plannedVsBooked: pvb, entries, activeCount } = booked;
  const planned = pvb.plannedMinutes;
  const over = pvb.isOverScheduled;
  const variance = Math.abs(pvb.varianceMinutes);
  const pct = planned > 0 ? Math.min(100, Math.round((totalMinutes / planned) * 100)) : 0;

  // Roll the per-session time entries up to one row per operator.
  const byOperator = new Map<string, { name: string; minutes: number; active: boolean }>();
  for (const entry of entries) {
    const prev = byOperator.get(entry.operator_id);
    byOperator.set(entry.operator_id, {
      name: entry.operator_name ?? t("terminal.other", "Operator"),
      minutes: (prev?.minutes ?? 0) + entry.minutes,
      active: (prev?.active ?? false) || entry.isActive,
    });
  }
  const operators = [...byOperator.values()].sort((a, b) => b.minutes - a.minutes);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("terminal.time.booked", "Booked")}
          </div>
          <div className="flex items-center gap-1.5 font-mono text-lg font-semibold text-foreground">
            {formatDuration(totalMinutes)}
            {activeCount > 0 ? (
              <span
                className="inline-block h-2 w-2 animate-pulse rounded-full bg-status-active"
                title={t("terminal.time.activeNow", "Running now")}
              />
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("terminal.time.budget", "Budget")}
          </div>
          <div className="font-mono text-lg font-semibold text-muted-foreground">
            {planned > 0 ? formatDuration(planned) : "—"}
          </div>
        </div>
      </div>

      {planned > 0 ? (
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className={cn(
                "h-full rounded-full",
                over ? "bg-destructive" : "bg-status-active",
              )}
              style={{ width: `${over ? 100 : pct}%` }}
            />
          </div>
          <div
            className={cn(
              "text-xs font-medium",
              over ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {formatDuration(variance)}{" "}
            {over
              ? t("terminal.time.over", "over budget")
              : t("terminal.time.left", "of budget left")}
          </div>
        </div>
      ) : null}

      {operators.length > 0 ? (
        <div className="space-y-1.5 border-t border-border pt-2">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="h-3 w-3" />
            {t("terminal.people.title", "Worked on this")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {operators.map((op) => (
              <span
                key={op.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-xs text-foreground"
              >
                {op.active ? (
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-status-active" />
                ) : null}
                {op.name}
                <span className="font-mono text-muted-foreground">{formatDuration(op.minutes)}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
