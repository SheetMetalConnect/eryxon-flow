import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { logger } from '@/lib/logger';

export interface ReliabilityMetrics {
  totalOperations: number;
  onTimeOperations: number;
  onTimePercentage: number;
  lateOperations: number;
  latePercentage: number;
  avgDelayMinutes: number;
  weeklyTrend: { week: string; onTime: number; late: number }[];
  delayTrend: { date: string; avgDelay: number }[];
  byCell: { name: string; onTime: number; late: number }[];
}

/**
 * Returns the ISO week string for a date (e.g. "2026-W14")
 */
function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Hook to calculate on-time delivery reliability from completed operations.
 *
 * Compares `completed_at` against `planned_end` for all operations completed
 * in the last N days. Operations completed on or before their planned end
 * are considered on-time; operations completed after are late.
 */
export function useReliabilityMetrics(days: number) {
  const profile = useProfile();

  return useQuery<ReliabilityMetrics | null>({
    queryKey: ['reliability-metrics', days, profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async (): Promise<ReliabilityMetrics | null> => {
      if (!profile?.tenant_id) return null;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Fetch completed operations with a planned_end within the period
      const { data: operations, error } = await supabase
        .from('operations')
        .select(`
          id,
          completed_at,
          planned_end,
          cell_id,
          cell:cells!tasks_stage_id_fkey (
            name
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .not('completed_at', 'is', null)
        .not('planned_end', 'is', null)
        .gte('completed_at', cutoffDate.toISOString())
        .is('deleted_at', null);

      if (error) {
        logger.error('useReliabilityMetrics', 'Failed to fetch operations', error);
        throw error;
      }

      if (!operations || operations.length === 0) {
        return {
          totalOperations: 0,
          onTimeOperations: 0,
          onTimePercentage: 0,
          lateOperations: 0,
          latePercentage: 0,
          avgDelayMinutes: 0,
          weeklyTrend: [],
          delayTrend: [],
          byCell: [],
        };
      }

      // Classify each operation as on-time or late
      let onTimeCount = 0;
      let lateCount = 0;
      let totalDelayMinutes = 0;

      // Accumulators for trends and breakdowns
      const weeklyMap = new Map<string, { onTime: number; late: number }>();
      const dailyDelayMap = new Map<string, { totalDelay: number; count: number }>();
      const cellMap = new Map<string, { onTime: number; late: number }>();

      for (const op of operations) {
        const completedAt = new Date(op.completed_at!);
        const plannedEnd = new Date(op.planned_end!);
        const delayMs = completedAt.getTime() - plannedEnd.getTime();
        const isLate = delayMs > 0;
        const delayMinutes = isLate ? delayMs / 60000 : 0;

        if (isLate) {
          lateCount++;
          totalDelayMinutes += delayMinutes;
        } else {
          onTimeCount++;
        }

        // Weekly trend (keyed by completion week)
        const week = getISOWeek(completedAt);
        const weekEntry = weeklyMap.get(week) || { onTime: 0, late: 0 };
        if (isLate) weekEntry.late++;
        else weekEntry.onTime++;
        weeklyMap.set(week, weekEntry);

        // Daily delay trend (only for late operations, keyed by completion date)
        if (isLate) {
          const dateKey = completedAt.toISOString().slice(0, 10);
          const dayEntry = dailyDelayMap.get(dateKey) || { totalDelay: 0, count: 0 };
          dayEntry.totalDelay += delayMinutes;
          dayEntry.count++;
          dailyDelayMap.set(dateKey, dayEntry);
        }

        // By cell breakdown
        const cellName = (op.cell as { name?: string } | null)?.name || 'Unknown';
        const cellEntry = cellMap.get(cellName) || { onTime: 0, late: 0 };
        if (isLate) cellEntry.late++;
        else cellEntry.onTime++;
        cellMap.set(cellName, cellEntry);
      }

      const total = operations.length;
      const avgDelay = lateCount > 0 ? totalDelayMinutes / lateCount : 0;

      // Sort weekly trend chronologically
      const weeklyTrend = Array.from(weeklyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, counts]) => ({ week, ...counts }));

      // Sort daily delay trend chronologically
      const delayTrend = Array.from(dailyDelayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, { totalDelay, count }]) => ({
          date,
          avgDelay: Math.round(totalDelay / count),
        }));

      // Sort cells by total operations descending
      const byCell = Array.from(cellMap.entries())
        .sort(([, a], [, b]) => (b.onTime + b.late) - (a.onTime + a.late))
        .map(([name, counts]) => ({ name, ...counts }));

      return {
        totalOperations: total,
        onTimeOperations: onTimeCount,
        onTimePercentage: total > 0 ? Math.round((onTimeCount / total) * 1000) / 10 : 0,
        lateOperations: lateCount,
        latePercentage: total > 0 ? Math.round((lateCount / total) * 1000) / 10 : 0,
        avgDelayMinutes: Math.round(avgDelay),
        weeklyTrend,
        delayTrend,
        byCell,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
