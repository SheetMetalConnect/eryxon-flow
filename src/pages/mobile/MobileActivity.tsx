import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format, isToday, subDays } from "date-fns";
import {
  CalendarDays,
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

interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  notes: string | null;
  operation: {
    operation_name: string;
    status: string;
    part: {
      part_number: string;
      job: {
        job_number: string;
      };
    };
    cell: {
      name: string;
      color: string | null;
    };
  };
}

interface DayGroup {
  date: string;
  label: string;
  entries: TimeEntry[];
  totalMinutes: number;
  completed: number;
}

const formatMinutes = (totalMinutes: number) => {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

/**
 * Operator activity timeline. Groups time entries by day, biggest first,
 * shows the cumulative tracked time at the top of each day card. Optimized
 * for one-handed scanning on the train back from the shop.
 */
export default function MobileActivity() {
  const { t } = useTranslation();
  const profile = useProfile();
  const { activeOperator } = useOperator();
  const operatorId = activeOperator?.id || profile?.id;
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!operatorId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const startDate = subDays(new Date(), 7);
    const { data, error } = await supabase
      .from("time_entries")
      .select(
        `*,
        operation:operations!inner(
          operation_name,
          status,
          part:parts!inner(
            part_number,
            job:jobs!inner(job_number)
          ),
          cell:cells!inner(name, color)
        )`,
      )
      .eq("operator_id", operatorId)
      .gte("start_time", startDate.toISOString())
      .order("start_time", { ascending: false });
    if (error) {
      logger.error("MobileActivity", "Failed to load entries", error);
      setEntries([]);
    } else {
      setEntries((data ?? []) as unknown as TimeEntry[]);
    }
    setLoading(false);
  }, [operatorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();
    entries.forEach((entry) => {
      const dayKey = format(new Date(entry.start_time), "yyyy-MM-dd");
      const day = map.get(dayKey) ?? {
        date: dayKey,
        label: isToday(new Date(entry.start_time))
          ? "Today"
          : format(new Date(entry.start_time), "EEE, MMM d"),
        entries: [],
        totalMinutes: 0,
        completed: 0,
      };
      day.entries.push(entry);
      day.totalMinutes += entry.duration ?? 0;
      if (entry.operation.status === "completed") day.completed += 1;
      map.set(dayKey, day);
    });
    return [...map.values()].sort((a, b) =>
      a.date < b.date ? 1 : -1,
    );
  }, [entries]);

  const todayMinutes = grouped[0]?.totalMinutes ?? 0;
  const weekMinutes = grouped.reduce((sum, day) => sum + day.totalMinutes, 0);

  return (
    <div className="flex h-full flex-col">
      <MobileTopBar
        title={t("navigation.myActivity", "My Activity")}
        kicker={activeOperator?.full_name ?? profile?.full_name ?? ""}
      />

      <div className="grid shrink-0 grid-cols-2 gap-2 px-3 pt-2">
        <SummaryCard
          icon={<Clock3 className="h-4 w-4" />}
          label={t("activity.today", "Today")}
          value={formatMinutes(todayMinutes)}
        />
        <SummaryCard
          icon={<CalendarDays className="h-4 w-4" />}
          label={t("activity.lastWeek", "Last 7 days")}
          value={formatMinutes(weekMinutes)}
        />
      </div>

      <PullToRefresh onRefresh={load} className="flex-1 px-3 pb-4 pt-2">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <PackageSearch className="h-8 w-8" />
            <p className="text-sm">
              {t("activity.empty", "No tracked time in the last 7 days")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-4">
            {grouped.map((day) => (
              <section
                key={day.date}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card/60"
              >
                <header className="flex items-center justify-between bg-muted/30 px-4 py-2">
                  <span className="text-[13px] font-semibold">{day.label}</span>
                  <span className="text-[12px] text-muted-foreground">
                    {formatMinutes(day.totalMinutes)} ·{" "}
                    {t("activity.completedCount", "{{count}} done", {
                      count: day.completed,
                    })}
                  </span>
                </header>
                <ul className="divide-y divide-border/60">
                  {day.entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div
                        className="h-9 w-1 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            entry.operation.cell.color || "hsl(var(--primary))",
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                          <span className="font-mono">
                            {entry.operation.part.job.job_number}
                          </span>
                          <span>·</span>
                          <span className="truncate">
                            {entry.operation.part.part_number}
                          </span>
                        </div>
                        <div className="truncate text-[14px] font-semibold">
                          {entry.operation.operation_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {format(new Date(entry.start_time), "HH:mm")}
                          {entry.end_time
                            ? ` – ${format(new Date(entry.end_time), "HH:mm")}`
                            : " · running"}
                          {entry.duration
                            ? ` · ${formatMinutes(entry.duration)}`
                            : ""}
                        </div>
                      </div>
                      {entry.operation.status === "completed" ? (
                        <CheckCircle2
                          className={cn("h-5 w-5 shrink-0 text-emerald-500")}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-3">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
