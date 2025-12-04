import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subDays, format, eachDayOfInterval } from "date-fns";

export interface OEEMetrics {
  // OEE Components
  availability: number;
  performance: number;
  quality: number;
  oee: number;

  // Machine/Cell states based on operations
  stateBreakdown: {
    name: string;
    value: number;
    color: string;
  }[];

  // OEE trend over time
  trend: {
    date: string;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
  }[];

  // OEE by cell
  byCell: {
    cellName: string;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
  }[];
}

export function useOEEMetrics(dateRange: number = 30) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["oee-metrics", profile?.tenant_id, dateRange],
    queryFn: async (): Promise<OEEMetrics> => {
      if (!profile?.tenant_id) {
        throw new Error("No tenant ID");
      }

      const startDate = subDays(new Date(), dateRange).toISOString();
      const now = new Date();

      // Fetch operations with cell info
      const { data: operations, error: opsError } = await supabase
        .from("operations")
        .select(`
          id,
          actual_time,
          estimated_time,
          setup_time,
          wait_time,
          status,
          completed_at,
          cell_id,
          cells(name, capacity_hours_per_day)
        `)
        .eq("tenant_id", profile.tenant_id)
        .gte("updated_at", startDate);

      if (opsError) throw opsError;

      // Fetch quality data from operation_quantities
      const { data: quantities, error: quantitiesError } = await supabase
        .from("operation_quantities")
        .select(`
          quantity_produced,
          quantity_good,
          quantity_scrap,
          operation_id,
          recorded_at
        `)
        .eq("tenant_id", profile.tenant_id)
        .gte("recorded_at", startDate);

      if (quantitiesError) throw quantitiesError;

      // Calculate overall metrics
      const completedOps = operations?.filter(o => o.status === "completed") || [];

      // Availability = actual production time / scheduled time
      const totalActualTime = completedOps.reduce((sum, o) => sum + (o.actual_time || 0), 0);
      const totalEstimatedTime = completedOps.reduce((sum, o) => sum + (o.estimated_time || 0), 0);
      const totalWaitTime = operations?.reduce((sum, o) => sum + (o.wait_time || 0), 0) || 0;
      const totalSetupTime = operations?.reduce((sum, o) => sum + (o.setup_time || 0), 0) || 0;

      // Calculate availability (productive time / available time)
      const plannedTime = totalEstimatedTime + totalSetupTime;
      const availability = plannedTime > 0
        ? Math.min(100, ((plannedTime - totalWaitTime) / plannedTime) * 100)
        : 100;

      // Performance = actual output rate / ideal output rate
      const performance = totalActualTime > 0 && totalEstimatedTime > 0
        ? Math.min(100, (totalEstimatedTime / totalActualTime) * 100)
        : 100;

      // Quality from quantities
      const totalProduced = quantities?.reduce((sum, q) => sum + (q.quantity_produced || 0), 0) || 0;
      const totalGood = quantities?.reduce((sum, q) => sum + (q.quantity_good || 0), 0) || 0;
      const quality = totalProduced > 0 ? (totalGood / totalProduced) * 100 : 100;

      // Overall OEE
      const oee = (availability * performance * quality) / 10000;

      // State breakdown based on operation status
      const statusCounts = {
        completed: operations?.filter(o => o.status === "completed").length || 0,
        in_progress: operations?.filter(o => o.status === "in_progress").length || 0,
        pending: operations?.filter(o => o.status === "pending" || o.status === "not_started").length || 0,
        on_hold: operations?.filter(o => o.status === "on_hold").length || 0,
      };
      const totalOps = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;

      const stateBreakdown = [
        { name: "Completed", value: Math.round((statusCounts.completed / totalOps) * 100), color: "hsl(var(--color-success))" },
        { name: "In Progress", value: Math.round((statusCounts.in_progress / totalOps) * 100), color: "hsl(var(--brand-primary))" },
        { name: "Pending", value: Math.round((statusCounts.pending / totalOps) * 100), color: "hsl(var(--color-warning))" },
        { name: "On Hold", value: Math.round((statusCounts.on_hold / totalOps) * 100), color: "hsl(var(--neutral-400))" },
      ].filter(s => s.value > 0);

      // Trend calculation - group by day
      const dateInterval = eachDayOfInterval({ start: subDays(now, Math.min(dateRange, 14)), end: now });
      const trendSampleInterval = Math.max(1, Math.floor(dateInterval.length / 7));

      const trend = dateInterval
        .filter((_, i) => i % trendSampleInterval === 0)
        .map(date => {
          const dayStr = format(date, "yyyy-MM-dd");
          const dayOps = completedOps.filter(o =>
            o.completed_at && format(new Date(o.completed_at), "yyyy-MM-dd") === dayStr
          );
          const dayQuantities = quantities?.filter(q =>
            q.recorded_at && format(new Date(q.recorded_at), "yyyy-MM-dd") === dayStr
          ) || [];

          const dayEstTime = dayOps.reduce((sum, o) => sum + (o.estimated_time || 0), 0);
          const dayActTime = dayOps.reduce((sum, o) => sum + (o.actual_time || 0), 0);
          const dayProduced = dayQuantities.reduce((sum, q) => sum + (q.quantity_produced || 0), 0);
          const dayGood = dayQuantities.reduce((sum, q) => sum + (q.quantity_good || 0), 0);

          const dayAvail = dayOps.length > 0 ? availability : 100;
          const dayPerf = dayActTime > 0 ? Math.min(100, (dayEstTime / dayActTime) * 100) : performance;
          const dayQual = dayProduced > 0 ? (dayGood / dayProduced) * 100 : quality;
          const dayOee = (dayAvail * dayPerf * dayQual) / 10000;

          return {
            date: format(date, "MMM d"),
            oee: Number(dayOee.toFixed(1)),
            availability: Number(dayAvail.toFixed(1)),
            performance: Number(dayPerf.toFixed(1)),
            quality: Number(dayQual.toFixed(1)),
          };
        });

      // OEE by cell
      const cellMap = new Map<string, {
        estTime: number;
        actTime: number;
        produced: number;
        good: number;
        waitTime: number;
      }>();

      operations?.forEach(op => {
        if (op.cells?.name) {
          const cellName = op.cells.name;
          const current = cellMap.get(cellName) || { estTime: 0, actTime: 0, produced: 0, good: 0, waitTime: 0 };
          cellMap.set(cellName, {
            estTime: current.estTime + (op.estimated_time || 0),
            actTime: current.actTime + (op.actual_time || 0),
            produced: current.produced,
            good: current.good,
            waitTime: current.waitTime + (op.wait_time || 0),
          });
        }
      });

      // Add quality data to cells
      quantities?.forEach(q => {
        const op = operations?.find(o => o.id === q.operation_id);
        if (op?.cells?.name) {
          const current = cellMap.get(op.cells.name);
          if (current) {
            current.produced += q.quantity_produced || 0;
            current.good += q.quantity_good || 0;
          }
        }
      });

      const byCell = Array.from(cellMap.entries()).map(([cellName, data]) => {
        const cellAvail = data.estTime > 0
          ? Math.min(100, ((data.estTime - data.waitTime) / data.estTime) * 100)
          : 100;
        const cellPerf = data.actTime > 0 && data.estTime > 0
          ? Math.min(100, (data.estTime / data.actTime) * 100)
          : 100;
        const cellQual = data.produced > 0 ? (data.good / data.produced) * 100 : 100;
        const cellOee = (cellAvail * cellPerf * cellQual) / 10000;

        return {
          cellName,
          oee: Number(cellOee.toFixed(1)),
          availability: Number(cellAvail.toFixed(1)),
          performance: Number(cellPerf.toFixed(1)),
          quality: Number(cellQual.toFixed(1)),
        };
      }).sort((a, b) => b.oee - a.oee).slice(0, 8);

      return {
        availability: Number(availability.toFixed(1)),
        performance: Number(performance.toFixed(1)),
        quality: Number(quality.toFixed(1)),
        oee: Number(oee.toFixed(1)),
        stateBreakdown,
        trend,
        byCell,
      };
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60000,
  });
}
