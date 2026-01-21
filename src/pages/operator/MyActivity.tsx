import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";
import { Clock, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

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

const getStageClass = (cellName: string) => {
  const name = cellName.toLowerCase();
  if (name.includes('cut')) return 'stage-cutting';
  if (name.includes('bend')) return 'stage-bending';
  if (name.includes('weld')) return 'stage-welding';
  if (name.includes('assembl')) return 'stage-assembly';
  if (name.includes('finish')) return 'stage-finishing';
  return 'muted';
};

export default function MyActivity() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [days] = useState(7);

  const loadActivity = async () => {
    if (!profile?.id) return;

    const startDate = subDays(new Date(), days - 1);

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
      .eq("operator_id", profile.id)
      .gte("start_time", startDate.toISOString())
      .order("start_time", { ascending: false });

    if (error) {
      console.error("Error loading activity:", error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.id) {
      const loadTimeout = window.setTimeout(() => {
        void loadActivity();
      }, 0);
      return () => clearTimeout(loadTimeout);
    }
    return;
  }, [profile?.id, days]);

  const groupByDate = (): DayGroup[] => {
    const groups: { [key: string]: TimeEntry[] } = {};

    entries.forEach((entry) => {
      const date = format(new Date(entry.start_time), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    return Object.entries(groups).map(([date, dayEntries]) => {
      const totalMinutes = dayEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
      const uniqueOperations = new Set(dayEntries.map((e) => e.operation.operation_name));
      const completedOperations = dayEntries.filter((e) => e.operation.status === "completed");

      return {
        date,
        entries: dayEntries,
        totalMinutes,
        tasksCount: uniqueOperations.size,
        completedCount: completedOperations.length,
      };
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const dayGroups = groupByDate();

  // Calculate summary stats
  const todayTotal = dayGroups.find((g) => g.date === format(new Date(), "yyyy-MM-dd"))?.totalMinutes || 0;
  const weekTotal = dayGroups.reduce((sum, g) => sum + g.totalMinutes, 0);
  const todayCompleted = dayGroups.find((g) => g.date === format(new Date(), "yyyy-MM-dd"))?.completedCount || 0;
  const weekCompleted = dayGroups.reduce((sum, g) => sum + g.completedCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--brand-primary))]" />
          <p className="text-sm text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
            {t("myActivity.title")}
          </h1>
          <p className="text-muted-foreground text-lg">{t("myActivity.description")}</p>
        </div>

        <hr className="title-divider" />

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card p-6 transition-smooth hover:scale-[1.02]">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[hsl(var(--brand-primary))]/10">
                <Clock className="h-6 w-6 text-[hsl(var(--brand-primary))]" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatDuration(todayTotal)}</div>
                <div className="text-sm text-muted-foreground">{t("myActivity.todayTime")}</div>
              </div>
            </div>
          </Card>
          <Card className="glass-card p-6 transition-smooth hover:scale-[1.02]">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[hsl(var(--color-info))]/10">
                <Clock className="h-6 w-6 text-[hsl(var(--color-info))]" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatDuration(weekTotal)}</div>
                <div className="text-sm text-muted-foreground">{t("myActivity.weekTime")}</div>
              </div>
            </div>
          </Card>
          <Card className="glass-card p-6 transition-smooth hover:scale-[1.02]">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[hsl(var(--color-success))]/10">
                <CheckCircle className="h-6 w-6 text-[hsl(var(--color-success))]" />
              </div>
              <div>
                <div className="text-2xl font-bold">{todayCompleted}</div>
                <div className="text-sm text-muted-foreground">{t("myActivity.todayCompleted")}</div>
              </div>
            </div>
          </Card>
          <Card className="glass-card p-6 transition-smooth hover:scale-[1.02]">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[hsl(var(--color-warning))]/10">
                <CheckCircle className="h-6 w-6 text-[hsl(var(--color-warning))]" />
              </div>
              <div>
                <div className="text-2xl font-bold">{weekCompleted}</div>
                <div className="text-sm text-muted-foreground">{t("myActivity.weekCompleted")}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Activity List */}
        {dayGroups.length === 0 ? (
          <Card className="glass-card p-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--foreground))]/40" />
            <h3 className="text-lg font-medium mb-2">{t("myActivity.noActivity")}</h3>
            <p className="text-sm text-muted-foreground">{t("myActivity.noActivityDescription")}</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {dayGroups.map((group) => (
              <div key={group.date}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{format(new Date(group.date), "EEEE, MMMM d, yyyy")}</h2>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{t("myActivity.total")}: {formatDuration(group.totalMinutes)}</span>
                    <span>•</span>
                    <span>{group.tasksCount} {t("myActivity.operations")}</span>
                    <span>•</span>
                    <span>{group.completedCount} {t("myActivity.completed")}</span>
                  </div>
                </div>

                <div className="grid gap-3">
                  {group.entries.map((entry) => (
                    <Card key={entry.id} className="glass-card p-4 transition-smooth hover:bg-[hsl(var(--surface-elevated))]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              className="bg-[hsl(var(--stage-cutting))]/10 text-[hsl(var(--stage-cutting))] border-[hsl(var(--stage-cutting))]/20"
                            >
                              {entry.operation.cell.name}
                            </Badge>
                            {entry.operation.status === "completed" && (
                              <CheckCircle className="h-4 w-4 text-[hsl(var(--status-completed))]" />
                            )}
                          </div>
                          <div className="font-medium mb-1">{entry.operation.operation_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {entry.operation.part.job.job_number} • {entry.operation.part.part_number}
                          </div>
                          {entry.notes && (
                            <div className="text-sm text-muted-foreground mt-2 italic">{entry.notes}</div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3 text-[hsl(var(--brand-primary))]" />
                            {entry.duration ? formatDuration(entry.duration) : t("myActivity.inProgress")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(entry.start_time), "h:mm a")}
                            {entry.end_time && ` - ${format(new Date(entry.end_time), "h:mm a")}`}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
