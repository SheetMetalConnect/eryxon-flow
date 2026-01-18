import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export interface LiveOperator {
  id: string;
  operatorId: string;
  operatorName: string;
  employeeId: string;
  status: "clocked_in" | "on_job" | "idle";
  clockInTime: string;
  currentCell?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  currentJob?: {
    jobNumber: string;
    partNumber: string;
    operationName: string;
    startTime: string;
  } | null;
  todayStats: {
    partsProduced: number;
    goodParts: number;
    scrapParts: number;
    reworkParts: number;
    hoursWorked: number;
  };
}

export interface LiveOperatorsData {
  operators: LiveOperator[];
  summary: {
    totalClockedIn: number;
    totalOnJob: number;
    totalIdle: number;
    totalPartsToday: number;
    totalGoodParts: number;
    totalScrapParts: number;
    qualityRate: number;
  };
  byCell: {
    cellId: string;
    cellName: string;
    cellColor: string | null;
    operators: LiveOperator[];
    partsProduced: number;
    goodParts: number;
  }[];
}

export function useLiveOperators() {
  const { profile } = useAuth();

  const query = useQuery({
    queryKey: ["live-operators", profile?.tenant_id],
    queryFn: async (): Promise<LiveOperatorsData> => {
      if (!profile?.tenant_id) {
        throw new Error("No tenant ID");
      }

      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      // Fetch active attendance entries (clocked in)
      const { data: attendance, error: attError } = await supabase
        .from("attendance_entries")
        .select(`
          id,
          operator_id,
          clock_in,
          operator:operators!inner(id, full_name, employee_id)
        `)
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "active")
        .is("clock_out", null);

      if (attError) throw attError;

      // Fetch active time entries (on job)
      const { data: timeEntries, error: teError } = await supabase
        .from("time_entries")
        .select(`
          id,
          operator_id,
          start_time,
          operation:operations!inner(
            id,
            operation_name,
            cell:cells!inner(id, name, color),
            part:parts!inner(
              part_number,
              job:jobs!inner(job_number)
            )
          )
        `)
        .eq("tenant_id", profile.tenant_id)
        .is("end_time", null);

      if (teError) throw teError;

      // Fetch today's production quantities
      const { data: quantities, error: qError } = await supabase
        .from("operation_quantities")
        .select(`
          quantity_produced,
          quantity_good,
          quantity_scrap,
          quantity_rework,
          recorded_by,
          operation:operations!inner(
            cell:cells!inner(id, name, color)
          )
        `)
        .eq("tenant_id", profile.tenant_id)
        .gte("recorded_at", startOfToday.toISOString());

      if (qError) throw qError;

      // Fetch all active cells
      const { data: cells, error: cellsError } = await supabase
        .from("cells")
        .select("id, name, color")
        .eq("tenant_id", profile.tenant_id)
        .eq("active", true)
        .order("sequence");

      if (cellsError) throw cellsError;

      // Build time entries map by operator
      const timeEntryMap = new Map<string, any>();
      (timeEntries || []).forEach((te: any) => {
        timeEntryMap.set(te.operator_id, te);
      });

      // Build production stats by operator
      const productionByOperator = new Map<string, {
        partsProduced: number;
        goodParts: number;
        scrapParts: number;
        reworkParts: number;
      }>();

      (quantities || []).forEach((q: any) => {
        const recordedBy = q.recorded_by;
        if (!recordedBy) return;
        const existing = productionByOperator.get(recordedBy) || {
          partsProduced: 0,
          goodParts: 0,
          scrapParts: 0,
          reworkParts: 0,
        };
        existing.partsProduced += q.quantity_produced || 0;
        existing.goodParts += q.quantity_good || 0;
        existing.scrapParts += q.quantity_scrap || 0;
        existing.reworkParts += q.quantity_rework || 0;
        productionByOperator.set(recordedBy, existing);
      });

      // Build production stats by cell
      const productionByCell = new Map<string, { partsProduced: number; goodParts: number }>();
      (quantities || []).forEach((q: any) => {
        const cellId = q.operation?.cell?.id;
        if (!cellId) return;
        const existing = productionByCell.get(cellId) || { partsProduced: 0, goodParts: 0 };
        existing.partsProduced += q.quantity_produced || 0;
        existing.goodParts += q.quantity_good || 0;
        productionByCell.set(cellId, existing);
      });

      // Map operators
      const operators: LiveOperator[] = (attendance || []).map((a: any) => {
        const operatorId = a.operator?.id || a.operator_id;
        const timeEntry = timeEntryMap.get(operatorId);
        const production = productionByOperator.get(operatorId) || {
          partsProduced: 0,
          goodParts: 0,
          scrapParts: 0,
          reworkParts: 0,
        };

        const clockIn = new Date(a.clock_in);
        const hoursWorked = (now.getTime() - clockIn.getTime()) / 1000 / 60 / 60;

        let status: LiveOperator["status"] = "clocked_in";
        let currentCell: LiveOperator["currentCell"] = null;
        let currentJob: LiveOperator["currentJob"] = null;

        if (timeEntry) {
          status = "on_job";
          currentCell = {
            id: timeEntry.operation.cell.id,
            name: timeEntry.operation.cell.name,
            color: timeEntry.operation.cell.color,
          };
          currentJob = {
            jobNumber: timeEntry.operation.part.job.job_number,
            partNumber: timeEntry.operation.part.part_number,
            operationName: timeEntry.operation.operation_name,
            startTime: timeEntry.start_time,
          };
        } else {
          status = "idle";
        }

        return {
          id: a.id,
          operatorId,
          operatorName: a.operator?.full_name || "Unknown",
          employeeId: a.operator?.employee_id || "",
          status,
          clockInTime: a.clock_in,
          currentCell,
          currentJob,
          todayStats: {
            ...production,
            hoursWorked: Number(hoursWorked.toFixed(1)),
          },
        };
      });

      // Calculate summary
      const totalClockedIn = operators.length;
      const totalOnJob = operators.filter((o) => o.status === "on_job").length;
      const totalIdle = operators.filter((o) => o.status === "idle").length;
      const totalPartsToday = operators.reduce((sum, o) => sum + o.todayStats.partsProduced, 0);
      const totalGoodParts = operators.reduce((sum, o) => sum + o.todayStats.goodParts, 0);
      const totalScrapParts = operators.reduce((sum, o) => sum + o.todayStats.scrapParts, 0);
      const qualityRate = totalPartsToday > 0 ? (totalGoodParts / totalPartsToday) * 100 : 100;

      // Build by cell breakdown
      const byCell = (cells || []).map((cell: any) => {
        const cellOperators = operators.filter(
          (o) => o.currentCell?.id === cell.id
        );
        const cellProduction = productionByCell.get(cell.id) || { partsProduced: 0, goodParts: 0 };

        return {
          cellId: cell.id,
          cellName: cell.name,
          cellColor: cell.color,
          operators: cellOperators,
          partsProduced: cellProduction.partsProduced,
          goodParts: cellProduction.goodParts,
        };
      });

      // Add "Not on Cell" group for idle operators
      const idleOperators = operators.filter((o) => o.status === "idle");
      if (idleOperators.length > 0) {
        byCell.push({
          cellId: "idle",
          cellName: "Not on Cell",
          cellColor: null,
          operators: idleOperators,
          partsProduced: 0,
          goodParts: 0,
        });
      }

      return {
        operators,
        summary: {
          totalClockedIn,
          totalOnJob,
          totalIdle,
          totalPartsToday,
          totalGoodParts,
          totalScrapParts,
          qualityRate: Number(qualityRate.toFixed(1)),
        },
        byCell,
      };
    },
    enabled: !!profile?.tenant_id,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel("live-operators-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_entries",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => query.refetch()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_entries",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => query.refetch()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operation_quantities",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => query.refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id]);

  return query;
}
