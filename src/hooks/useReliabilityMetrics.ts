import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subDays, format, eachDayOfInterval, differenceInMinutes, startOfWeek } from "date-fns";

export interface ReliabilityMetrics {
  // Overall on-time performance
  onTimePercentage: number;
  latePercentage: number;

  // Weekly trend
  weeklyTrend: {
    date: string;
    onTime: number;
    late: number;
  }[];

  // Average delay in minutes
  avgDelayMinutes: number;

  // Daily delay trend
  delayTrend: {
    date: string;
    delay: number;
  }[];

  // On-time by cell
  byCell: {
    cellName: string;
    onTimePercentage: number;
    avgDelay: number;
    totalOperations: number;
  }[];

  // Summary stats
  totalOperations: number;
  onTimeOperations: number;
  lateOperations: number;
}

export function useReliabilityMetrics(dateRange: number = 30) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["reliability-metrics", profile?.tenant_id, dateRange],
    queryFn: async (): Promise<ReliabilityMetrics> => {
      if (!profile?.tenant_id) {
        throw new Error("No tenant ID");
      }

      const startDate = subDays(new Date(), dateRange).toISOString();
      const now = new Date();

      // Fetch operations with planned vs actual dates
      const { data: operations, error: opsError } = await supabase
        .from("operations")
        .select(`
          id,
          planned_start,
          planned_end,
          completed_at,
          status,
          cell_id,
          cells(name),
          created_at,
          updated_at
        `)
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "completed")
        .gte("completed_at", startDate);

      if (opsError) throw opsError;

      const completedOps = operations || [];

      // Calculate on-time vs late
      let onTimeCount = 0;
      let lateCount = 0;
      let totalDelayMinutes = 0;
      let opsWithDelay = 0;

      const delaysByDay = new Map<string, { total: number; count: number }>();
      const onTimeByWeek = new Map<string, { onTime: number; late: number }>();
      const cellStats = new Map<string, { onTime: number; late: number; totalDelay: number }>();

      completedOps.forEach(op => {
        const completedAt = op.completed_at ? new Date(op.completed_at) : null;
        const plannedEnd = op.planned_end ? new Date(op.planned_end) : null;

        // Determine if on-time
        let isOnTime = true;
        let delayMinutes = 0;

        if (completedAt && plannedEnd) {
          isOnTime = completedAt <= plannedEnd;
          if (!isOnTime) {
            delayMinutes = differenceInMinutes(completedAt, plannedEnd);
            totalDelayMinutes += delayMinutes;
            opsWithDelay++;
          }
        }

        if (isOnTime) {
          onTimeCount++;
        } else {
          lateCount++;
        }

        // Track by day for delay trend
        if (completedAt) {
          const dayStr = format(completedAt, "yyyy-MM-dd");
          const existing = delaysByDay.get(dayStr) || { total: 0, count: 0 };
          delaysByDay.set(dayStr, {
            total: existing.total + delayMinutes,
            count: existing.count + 1,
          });
        }

        // Track by week for on-time trend
        if (completedAt) {
          const weekStr = format(startOfWeek(completedAt), "MMM d");
          const existing = onTimeByWeek.get(weekStr) || { onTime: 0, late: 0 };
          if (isOnTime) {
            existing.onTime++;
          } else {
            existing.late++;
          }
          onTimeByWeek.set(weekStr, existing);
        }

        // Track by cell
        if (op.cells?.name) {
          const cellName = op.cells.name;
          const existing = cellStats.get(cellName) || { onTime: 0, late: 0, totalDelay: 0 };
          if (isOnTime) {
            existing.onTime++;
          } else {
            existing.late++;
            existing.totalDelay += delayMinutes;
          }
          cellStats.set(cellName, existing);
        }
      });

      const totalOps = completedOps.length || 1;
      const onTimePercentage = (onTimeCount / totalOps) * 100;
      const latePercentage = (lateCount / totalOps) * 100;
      const avgDelayMinutes = opsWithDelay > 0 ? totalDelayMinutes / opsWithDelay : 0;

      // Build weekly trend (last 5 weeks)
      const weeklyTrend = Array.from(onTimeByWeek.entries())
        .map(([date, data]) => ({
          date,
          onTime: Math.round((data.onTime / (data.onTime + data.late)) * 100),
          late: Math.round((data.late / (data.onTime + data.late)) * 100),
        }))
        .slice(-5);

      // Build daily delay trend (sample to ~7 points)
      const dateInterval = eachDayOfInterval({ start: subDays(now, Math.min(dateRange, 14)), end: now });
      const trendSampleInterval = Math.max(1, Math.floor(dateInterval.length / 7));

      const delayTrend = dateInterval
        .filter((_, i) => i % trendSampleInterval === 0)
        .map(date => {
          const dayStr = format(date, "yyyy-MM-dd");
          const dayData = delaysByDay.get(dayStr);
          const avgDelay = dayData && dayData.count > 0
            ? dayData.total / dayData.count
            : 0;
          return {
            date: format(date, "EEE"),
            delay: Math.round(avgDelay),
          };
        });

      // Build by cell stats
      const byCell = Array.from(cellStats.entries())
        .map(([cellName, data]) => {
          const total = data.onTime + data.late;
          return {
            cellName,
            onTimePercentage: total > 0 ? Math.round((data.onTime / total) * 100) : 100,
            avgDelay: data.late > 0 ? Math.round(data.totalDelay / data.late) : 0,
            totalOperations: total,
          };
        })
        .sort((a, b) => b.totalOperations - a.totalOperations)
        .slice(0, 8);

      return {
        onTimePercentage: Number(onTimePercentage.toFixed(1)),
        latePercentage: Number(latePercentage.toFixed(1)),
        weeklyTrend,
        avgDelayMinutes: Math.round(avgDelayMinutes),
        delayTrend,
        byCell,
        totalOperations: completedOps.length,
        onTimeOperations: onTimeCount,
        lateOperations: lateCount,
      };
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60000,
  });
}
