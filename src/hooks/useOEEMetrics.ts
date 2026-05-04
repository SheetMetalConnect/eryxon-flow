import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { logger } from '@/lib/logger';

export interface OEEMetrics {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  trend: { date: string; oee: number; availability: number; performance: number; quality: number }[];
  stateBreakdown: { name: string; value: number; color: string }[];
  byCell: { cellName: string; oee: number }[];
}

/** Time types that count as unplanned downtime */
const DOWNTIME_TYPES = ['breakdown', 'wait'];

/** All productive time types (planned production time = everything logged) */
const ALL_TIME_TYPES = ['setup', 'run', 'rework', 'wait', 'breakdown'];

const STATE_COLORS: Record<string, string> = {
  run: '#22c55e',
  setup: '#eab308',
  rework: '#f97316',
  wait: '#94a3b8',
  breakdown: '#ef4444',
};

interface DateRange {
  from: string;
  to: string;
}

function buildDateRange(days: number): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

/**
 * Calculate OEE metrics from time_entries and operation_quantities.
 *
 * OEE = Availability x Performance x Quality
 * - Availability = Run Time / Planned Production Time
 *   (Planned = total logged time, Run Time = Planned - Downtime)
 * - Performance = (Ideal Cycle Time x Total Count) / Run Time
 *   (uses operation.run_time_per_unit or estimated_time / part quantity)
 * - Quality = Good Count / Total Count
 */
export function useOEEMetrics(days: number, dateRange?: DateRange) {
  const profile = useProfile();

  return useQuery<OEEMetrics | null>({
    queryKey: ['oee-metrics', days, dateRange?.from, dateRange?.to, profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      if (!profile?.tenant_id) return null;

      const range = dateRange ?? buildDateRange(days);

      try {
        // Fetch time entries within the date range
        const { data: timeEntries, error: teError } = await supabase
          .from('time_entries')
          .select('id, operation_id, duration, start_time, end_time, time_type')
          .eq('tenant_id', profile.tenant_id)
          .gte('start_time', range.from)
          .lte('start_time', range.to)
          .not('end_time', 'is', null);

        if (teError) {
          logger.error('useOEEMetrics', 'Error fetching time entries', teError);
          return null;
        }

        if (!timeEntries || timeEntries.length === 0) return null;

        // Get unique operation IDs from time entries
        const operationIds = [...new Set(timeEntries.map((te) => te.operation_id))];

        // Fetch operations with cell info and run_time_per_unit
        const { data: operations, error: opsError } = await supabase
          .from('operations')
          .select(`
            id,
            estimated_time,
            run_time_per_unit,
            cell_id,
            cell:cells ( id, name ),
            part:parts ( quantity )
          `)
          .in('id', operationIds);

        if (opsError) {
          logger.error('useOEEMetrics', 'Error fetching operations', opsError);
          return null;
        }

        // Fetch operation quantities (production counts) in the date range
        const { data: quantities, error: qtyError } = await supabase
          .from('operation_quantities')
          .select('operation_id, quantity_produced, quantity_good, quantity_scrap, quantity_rework, recorded_at')
          .eq('tenant_id', profile.tenant_id)
          .in('operation_id', operationIds)
          .gte('recorded_at', range.from)
          .lte('recorded_at', range.to);

        if (qtyError) {
          logger.error('useOEEMetrics', 'Error fetching quantities', qtyError);
        }

        const qtyRecords = quantities || [];
        const opsMap = new Map((operations || []).map((op) => [op.id, op]));

        // --- Calculate durations by time_type (in minutes) ---
        const durationByType: Record<string, number> = {};
        for (const type of ALL_TIME_TYPES) {
          durationByType[type] = 0;
        }

        // Also build per-day and per-cell aggregates
        const dailyData = new Map<string, { planned: number; runTime: number; idealOutput: number; totalCount: number; goodCount: number }>();
        const cellData = new Map<string, { planned: number; runTime: number; idealOutput: number; totalCount: number; goodCount: number; name: string }>();

        for (const te of timeEntries) {
          const duration = te.duration ?? 0; // duration is in minutes
          if (duration <= 0) continue;

          const type = te.time_type || 'run';
          durationByType[type] = (durationByType[type] || 0) + duration;

          // Per-day aggregation
          const day = te.start_time.slice(0, 10); // YYYY-MM-DD
          if (!dailyData.has(day)) {
            dailyData.set(day, { planned: 0, runTime: 0, idealOutput: 0, totalCount: 0, goodCount: 0 });
          }
          const dayEntry = dailyData.get(day)!;
          dayEntry.planned += duration;
          if (!DOWNTIME_TYPES.includes(type)) {
            dayEntry.runTime += duration;
          }

          // Per-cell aggregation
          const op = opsMap.get(te.operation_id);
          const cellId = op?.cell_id;
          if (cellId && op) {
            const cellName = (op.cell as any)?.name || cellId;
            if (!cellData.has(cellId)) {
              cellData.set(cellId, { planned: 0, runTime: 0, idealOutput: 0, totalCount: 0, goodCount: 0, name: cellName });
            }
            const cellEntry = cellData.get(cellId)!;
            cellEntry.planned += duration;
            if (!DOWNTIME_TYPES.includes(type)) {
              cellEntry.runTime += duration;
            }
          }
        }

        // --- Availability ---
        const plannedProductionTime = Object.values(durationByType).reduce((a, b) => a + b, 0);
        const downtimeTotal = (durationByType['breakdown'] || 0) + (durationByType['wait'] || 0);
        const runTime = plannedProductionTime - downtimeTotal;
        const availability = plannedProductionTime > 0 ? runTime / plannedProductionTime : 0;

        // --- Quality ---
        const totalCount = qtyRecords.reduce((sum, r) => sum + (r.quantity_produced || 0), 0);
        const goodCount = qtyRecords.reduce((sum, r) => sum + (r.quantity_good || 0), 0);
        const quality = totalCount > 0 ? goodCount / totalCount : 0;

        // --- Performance ---
        // Ideal cycle time per unit: use run_time_per_unit if available, else estimated_time / quantity
        let idealOutputMinutes = 0;
        for (const qr of qtyRecords) {
          const op = opsMap.get(qr.operation_id);
          if (!op) continue;
          const idealCycleTime = op.run_time_per_unit
            ?? (((op.part as any)?.quantity || 1) > 0
              ? op.estimated_time / ((op.part as any)?.quantity || 1)
              : op.estimated_time);
          idealOutputMinutes += idealCycleTime * (qr.quantity_produced || 0);
        }
        const performance = runTime > 0 ? idealOutputMinutes / runTime : 0;

        // --- OEE ---
        const oee = availability * performance * quality;

        // --- Per-day quality/performance for trend ---
        // Build per-day quantity lookup
        const dailyQty = new Map<string, { totalCount: number; goodCount: number; idealOutput: number }>();
        for (const qr of qtyRecords) {
          const day = qr.recorded_at.slice(0, 10);
          if (!dailyQty.has(day)) {
            dailyQty.set(day, { totalCount: 0, goodCount: 0, idealOutput: 0 });
          }
          const entry = dailyQty.get(day)!;
          entry.totalCount += qr.quantity_produced || 0;
          entry.goodCount += qr.quantity_good || 0;

          const op = opsMap.get(qr.operation_id);
          if (op) {
            const idealCycleTime = op.run_time_per_unit
              ?? (((op.part as any)?.quantity || 1) > 0
                ? op.estimated_time / ((op.part as any)?.quantity || 1)
                : op.estimated_time);
            entry.idealOutput += idealCycleTime * (qr.quantity_produced || 0);
          }
        }

        // Merge daily data for trend
        const sortedDays = [...dailyData.keys()].sort();
        const trend = sortedDays.map((date) => {
          const dayTime = dailyData.get(date)!;
          const dayQty = dailyQty.get(date);

          const dayAvail = dayTime.planned > 0 ? dayTime.runTime / dayTime.planned : 0;
          const dayPerf = dayTime.runTime > 0 && dayQty ? dayQty.idealOutput / dayTime.runTime : 0;
          const dayQual = dayQty && dayQty.totalCount > 0 ? dayQty.goodCount / dayQty.totalCount : 0;
          const dayOee = dayAvail * dayPerf * dayQual;

          return {
            date,
            oee: Math.round(dayOee * 1000) / 10,
            availability: Math.round(dayAvail * 1000) / 10,
            performance: Math.round(dayPerf * 1000) / 10,
            quality: Math.round(dayQual * 1000) / 10,
          };
        });

        // --- State breakdown (pie chart data) ---
        const stateBreakdown = ALL_TIME_TYPES
          .filter((type) => (durationByType[type] || 0) > 0)
          .map((type) => ({
            name: type.charAt(0).toUpperCase() + type.slice(1),
            value: Math.round(durationByType[type]),
            color: STATE_COLORS[type] || '#6b7280',
          }));

        // --- Per-cell quality/performance ---
        // Build per-cell quantity lookup
        const cellQty = new Map<string, { totalCount: number; goodCount: number; idealOutput: number }>();
        for (const qr of qtyRecords) {
          const op = opsMap.get(qr.operation_id);
          if (!op) continue;
          const cellId = op.cell_id;
          if (!cellQty.has(cellId)) {
            cellQty.set(cellId, { totalCount: 0, goodCount: 0, idealOutput: 0 });
          }
          const entry = cellQty.get(cellId)!;
          entry.totalCount += qr.quantity_produced || 0;
          entry.goodCount += qr.quantity_good || 0;

          const idealCycleTime = op.run_time_per_unit
            ?? (((op.part as any)?.quantity || 1) > 0
              ? op.estimated_time / ((op.part as any)?.quantity || 1)
              : op.estimated_time);
          entry.idealOutput += idealCycleTime * (qr.quantity_produced || 0);
        }

        const byCell = [...cellData.entries()].map(([cellId, cellEntry]) => {
          const cq = cellQty.get(cellId);
          const cellAvail = cellEntry.planned > 0 ? cellEntry.runTime / cellEntry.planned : 0;
          const cellPerf = cellEntry.runTime > 0 && cq ? cq.idealOutput / cellEntry.runTime : 0;
          const cellQual = cq && cq.totalCount > 0 ? cq.goodCount / cq.totalCount : 0;
          const cellOee = cellAvail * cellPerf * cellQual;

          return {
            cellName: cellEntry.name,
            oee: Math.round(cellOee * 1000) / 10,
          };
        }).sort((a, b) => b.oee - a.oee);

        return {
          availability: Math.round(availability * 1000) / 10,
          performance: Math.round(performance * 1000) / 10,
          quality: Math.round(quality * 1000) / 10,
          oee: Math.round(oee * 1000) / 10,
          trend,
          stateBreakdown,
          byCell,
        };
      } catch (err) {
        logger.error('useOEEMetrics', 'Unexpected error calculating OEE', err);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}
