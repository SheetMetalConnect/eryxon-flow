import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subDays, format, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";

export interface EmployeeOEEMetrics {
  // Time metrics (in hours)
  scheduledHours: number;
  attendanceHours: number;
  productiveHours: number;
  
  // OEE Components
  availability: number; // attendance / scheduled
  performance: number; // productive / attendance
  quality: number; // good parts / total parts
  oee: number; // availability * performance * quality
  
  // Production metrics
  totalPartsProduced: number;
  goodParts: number;
  scrapParts: number;
  reworkParts: number;
  
  // Trend data
  trend: {
    date: string;
    scheduledHours: number;
    attendanceHours: number;
    productiveHours: number;
    oee: number;
  }[];
  
  // By operator breakdown
  byOperator: {
    operatorId: string;
    operatorName: string;
    employeeId: string;
    scheduledHours: number;
    attendanceHours: number;
    productiveHours: number;
    oee: number;
    partsProduced: number;
    goodParts: number;
  }[];
}

export function useEmployeeOEE(dateRange: number = 7) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["employee-oee", profile?.tenant_id, dateRange],
    queryFn: async (): Promise<EmployeeOEEMetrics> => {
      if (!profile?.tenant_id) {
        throw new Error("No tenant ID");
      }

      const now = new Date();
      const startDate = startOfDay(subDays(now, dateRange));
      const endDate = endOfDay(now);

      // Fetch attendance entries
      const { data: attendance, error: attError } = await supabase
        .from("attendance_entries")
        .select(`
          id,
          operator_id,
          clock_in,
          clock_out,
          duration_minutes,
          target_hours,
          status,
          operator:operators(id, full_name, employee_id)
        `)
        .eq("tenant_id", profile.tenant_id)
        .gte("clock_in", startDate.toISOString())
        .lte("clock_in", endDate.toISOString());

      if (attError) throw attError;

      // Fetch time entries (productive work time)
      const { data: timeEntries, error: teError } = await supabase
        .from("time_entries")
        .select(`
          id,
          operator_id,
          operation_id,
          start_time,
          end_time,
          duration,
          time_type
        `)
        .eq("tenant_id", profile.tenant_id)
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString());

      if (teError) throw teError;

      // Fetch production quantities
      const { data: quantities, error: qError } = await supabase
        .from("operation_quantities")
        .select(`
          quantity_produced,
          quantity_good,
          quantity_scrap,
          quantity_rework,
          recorded_by,
          recorded_at
        `)
        .eq("tenant_id", profile.tenant_id)
        .gte("recorded_at", startDate.toISOString())
        .lte("recorded_at", endDate.toISOString());

      if (qError) throw qError;

      // Calculate totals
      const totalScheduledMinutes = (attendance || []).reduce(
        (sum, a) => sum + (a.target_hours || 8) * 60,
        0
      );
      
      const totalAttendanceMinutes = (attendance || []).reduce((sum, a) => {
        if (a.duration_minutes) return sum + a.duration_minutes;
        if (a.status === "active" && a.clock_in) {
          // Calculate duration for active entries
          const clockIn = new Date(a.clock_in);
          const elapsed = (now.getTime() - clockIn.getTime()) / 1000 / 60;
          return sum + elapsed;
        }
        return sum;
      }, 0);

      const totalProductiveMinutes = (timeEntries || []).reduce((sum, te) => {
        if (te.duration) return sum + te.duration;
        if (te.end_time && te.start_time) {
          const duration =
            (new Date(te.end_time).getTime() - new Date(te.start_time).getTime()) /
            1000 /
            60;
          return sum + duration;
        }
        if (!te.end_time && te.start_time) {
          // Active entry
          const elapsed = (now.getTime() - new Date(te.start_time).getTime()) / 1000 / 60;
          return sum + elapsed;
        }
        return sum;
      }, 0);

      const totalProduced = (quantities || []).reduce(
        (sum, q) => sum + (q.quantity_produced || 0),
        0
      );
      const totalGood = (quantities || []).reduce(
        (sum, q) => sum + (q.quantity_good || 0),
        0
      );
      const totalScrap = (quantities || []).reduce(
        (sum, q) => sum + (q.quantity_scrap || 0),
        0
      );
      const totalRework = (quantities || []).reduce(
        (sum, q) => sum + (q.quantity_rework || 0),
        0
      );

      // Calculate OEE components
      const scheduledHours = totalScheduledMinutes / 60;
      const attendanceHours = totalAttendanceMinutes / 60;
      const productiveHours = totalProductiveMinutes / 60;

      const availability =
        scheduledHours > 0
          ? Math.min(100, (attendanceHours / scheduledHours) * 100)
          : 100;
      const performance =
        attendanceHours > 0
          ? Math.min(100, (productiveHours / attendanceHours) * 100)
          : 100;
      const quality = totalProduced > 0 ? (totalGood / totalProduced) * 100 : 100;
      const oee = (availability * performance * quality) / 10000;

      // Calculate trend by day
      const dateInterval = eachDayOfInterval({ start: startDate, end: now });
      const trend = dateInterval.map((date) => {
        const dayStr = format(date, "yyyy-MM-dd");
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const dayAttendance = (attendance || []).filter((a) => {
          const clockIn = new Date(a.clock_in);
          return clockIn >= dayStart && clockIn <= dayEnd;
        });

        const dayTimeEntries = (timeEntries || []).filter((te) => {
          const start = new Date(te.start_time);
          return start >= dayStart && start <= dayEnd;
        });

        const dayScheduled = dayAttendance.reduce(
          (sum, a) => sum + (a.target_hours || 8),
          0
        );
        const dayAttendanceHours = dayAttendance.reduce((sum, a) => {
          return sum + (a.duration_minutes || 0) / 60;
        }, 0);
        const dayProductiveHours = dayTimeEntries.reduce((sum, te) => {
          return sum + (te.duration || 0) / 60;
        }, 0);

        const dayAvail = dayScheduled > 0 ? (dayAttendanceHours / dayScheduled) * 100 : 100;
        const dayPerf = dayAttendanceHours > 0 ? (dayProductiveHours / dayAttendanceHours) * 100 : 100;
        const dayOee = Math.min(100, (dayAvail * dayPerf) / 100);

        return {
          date: format(date, "MMM d"),
          scheduledHours: dayScheduled,
          attendanceHours: Number(dayAttendanceHours.toFixed(1)),
          productiveHours: Number(dayProductiveHours.toFixed(1)),
          oee: Number(dayOee.toFixed(1)),
        };
      });

      // Calculate by operator
      const operatorMap = new Map<
        string,
        {
          operatorId: string;
          operatorName: string;
          employeeId: string;
          scheduledMinutes: number;
          attendanceMinutes: number;
          productiveMinutes: number;
          partsProduced: number;
          goodParts: number;
        }
      >();

      (attendance || []).forEach((a: any) => {
        if (!a.operator_id || !a.operator) return;
        const existing = operatorMap.get(a.operator_id) || {
          operatorId: a.operator_id,
          operatorName: a.operator.full_name,
          employeeId: a.operator.employee_id,
          scheduledMinutes: 0,
          attendanceMinutes: 0,
          productiveMinutes: 0,
          partsProduced: 0,
          goodParts: 0,
        };
        existing.scheduledMinutes += (a.target_hours || 8) * 60;
        existing.attendanceMinutes += a.duration_minutes || 0;
        operatorMap.set(a.operator_id, existing);
      });

      (timeEntries || []).forEach((te: any) => {
        if (!te.operator_id) return;
        const existing = operatorMap.get(te.operator_id);
        if (existing) {
          existing.productiveMinutes += te.duration || 0;
        }
      });

      const byOperator = Array.from(operatorMap.values())
        .map((op) => {
          const opAvail =
            op.scheduledMinutes > 0
              ? (op.attendanceMinutes / op.scheduledMinutes) * 100
              : 100;
          const opPerf =
            op.attendanceMinutes > 0
              ? (op.productiveMinutes / op.attendanceMinutes) * 100
              : 100;
          const opOee = Math.min(100, (opAvail * opPerf) / 100);

          return {
            operatorId: op.operatorId,
            operatorName: op.operatorName,
            employeeId: op.employeeId,
            scheduledHours: Number((op.scheduledMinutes / 60).toFixed(1)),
            attendanceHours: Number((op.attendanceMinutes / 60).toFixed(1)),
            productiveHours: Number((op.productiveMinutes / 60).toFixed(1)),
            oee: Number(opOee.toFixed(1)),
            partsProduced: op.partsProduced,
            goodParts: op.goodParts,
          };
        })
        .sort((a, b) => b.oee - a.oee);

      return {
        scheduledHours: Number(scheduledHours.toFixed(1)),
        attendanceHours: Number(attendanceHours.toFixed(1)),
        productiveHours: Number(productiveHours.toFixed(1)),
        availability: Number(availability.toFixed(1)),
        performance: Number(performance.toFixed(1)),
        quality: Number(quality.toFixed(1)),
        oee: Number(oee.toFixed(1)),
        totalPartsProduced: totalProduced,
        goodParts: totalGood,
        scrapParts: totalScrap,
        reworkParts: totalRework,
        trend,
        byOperator,
      };
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60000,
  });
}
