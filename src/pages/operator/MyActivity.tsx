import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOperator } from "@/contexts/OperatorContext";
import { Badge } from "@/components/ui/badge";
import { Clock3, CheckCircle2, CalendarDays, PackageSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import {
  OperatorEmptyState,
  OperatorPageHeader,
  OperatorPanel,
  OperatorStatCard,
  OperatorStatusChip,
} from "@/components/operator/OperatorStation";

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
  entries: TimeEntry[];
  totalMinutes: number;
  tasksCount: number;
  completedCount: number;
}

export default function MyActivity() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { activeOperator } = useOperator();
  const operatorId = activeOperator?.id || profile?.id;
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [days] = useState(7);
  const operatorIdRef = useRef<string | null>(operatorId || null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    operatorIdRef.current = operatorId || null;
    requestIdRef.current += 1;
    queueMicrotask(() => {
      setEntries([]);
      setLoading(Boolean(operatorId));
    });
  }, [operatorId]);

  const loadActivity = useCallback(async () => {
    if (!operatorId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const startDate = subDays(new Date(), days - 1);
    const requestId = ++requestIdRef.current;
    const requestedOperatorId = operatorId;
    setLoading(true);

    const { data, error } = await supabase
      .from("time_entries")
      .select(`
        *,
        operation:operations!inner(
          operation_name,
          status,
          part:parts!inner(
            part_number,
            job:jobs!inner(job_number)
          ),
          cell:cells!inner(name, color)
        )
      `)
      .eq("operator_id", requestedOperatorId)
      .gte("start_time", startDate.toISOString())
      .order("start_time", { ascending: false });

    if (
      requestIdRef.current !== requestId ||
      operatorIdRef.current !== requestedOperatorId
    ) {
      return;
    }

    if (error) {
      logger.error("MyActivity", "Error loading activity", error);
    } else {
      setEntries((data as TimeEntry[]) || []);
    }
    setLoading(false);
  }, [days, operatorId]);

  useEffect(() => {
    if (!operatorId) return;
    queueMicrotask(() => {
      void loadActivity();
    });
  }, [loadActivity, operatorId]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    const groups: Record<string, TimeEntry[]> = {};

    entries.forEach((entry) => {
      const date = format(new Date(entry.start_time), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    return Object.entries(groups).map(([date, dayEntries]) => {
      const totalMinutes = dayEntries.reduce(
        (sum, entry) => sum + (entry.duration || 0),
        0,
      );
      const uniqueOperations = new Set(
        dayEntries.map((entry) => entry.operation.operation_name),
      );
      const completedOperations = dayEntries.filter(
        (entry) => entry.operation.status === "completed",
      );

      return {
        date,
        entries: dayEntries,
        totalMinutes,
        tasksCount: uniqueOperations.size,
        completedCount: completedOperations.length,
      };
    });
  }, [entries]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const todayTotal = dayGroups.find((group) => group.date === today)?.totalMinutes || 0;
  const weekTotal = dayGroups.reduce((sum, group) => sum + group.totalMinutes, 0);
  const todayCompleted =
    dayGroups.find((group) => group.date === today)?.completedCount || 0;
  const weekCompleted = dayGroups.reduce(
    (sum, group) => sum + group.completedCount,
    0,
  );

  if (loading) {
    return (
      <OperatorPanel className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            {t("myActivity.loading", "Loading activity")}
          </p>
        </div>
      </OperatorPanel>
    );
  }

  return (
    <div className="space-y-4">
      <OperatorPageHeader
        eyebrow={t("navigation.myActivity")}
        title={t("myActivity.title")}
        description={t(
          "myActivity.description",
          "Review the active operator's recent work by day, with completed operations and time captured in the same production workspace format as the queue.",
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
          label={t("myActivity.todayTime")}
          value={formatDuration(todayTotal)}
          icon={Clock3}
          tone="active"
        />
        <OperatorStatCard
          label={t("myActivity.weekTime")}
          value={formatDuration(weekTotal)}
          icon={CalendarDays}
        />
        <OperatorStatCard
          label={t("myActivity.todayCompleted")}
          value={todayCompleted}
          icon={CheckCircle2}
          tone="success"
        />
        <OperatorStatCard
          label={t("myActivity.weekCompleted")}
          value={weekCompleted}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      {dayGroups.length === 0 ? (
        <OperatorEmptyState
          icon={PackageSearch}
          title={t("myActivity.noActivity")}
          description={t("myActivity.noActivityDescription")}
        />
      ) : (
        <div className="space-y-4">
          {dayGroups.map((group) => (
            <OperatorPanel key={group.date} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {format(new Date(group.date), "EEEE, MMMM d, yyyy")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {group.tasksCount} {t("myActivity.operations")} •{" "}
                    {group.completedCount} {t("myActivity.completed")}
                  </p>
                </div>
                <OperatorStatusChip
                  tone="info"
                  label={`${t("myActivity.total")}: ${formatDuration(group.totalMinutes)}`}
                />
              </div>

              <div className="grid gap-3">
                {group.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-border bg-background/70 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full">
                            <span
                              className="mr-2 h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  entry.operation.cell.color || "currentColor",
                              }}
                            />
                            {entry.operation.cell.name}
                          </Badge>
                          {entry.operation.status === "completed" ? (
                            <Badge className="rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              {t("myActivity.completed")}
                            </Badge>
                          ) : null}
                        </div>
                        <div>
                          <div className="text-base font-semibold text-foreground">
                            {entry.operation.operation_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {entry.operation.part.job.job_number} •{" "}
                            {entry.operation.part.part_number}
                          </div>
                        </div>
                        {entry.notes ? (
                          <div className="text-sm text-muted-foreground">
                            {entry.notes}
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2 text-sm font-semibold text-foreground">
                          <Clock3 className="h-4 w-4 text-primary" />
                          {entry.duration
                            ? formatDuration(entry.duration)
                            : t("myActivity.inProgress")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(entry.start_time), "h:mm a")}
                          {entry.end_time
                            ? ` - ${format(new Date(entry.end_time), "h:mm a")}`
                            : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </OperatorPanel>
          ))}
        </div>
      )}
    </div>
  );
}
