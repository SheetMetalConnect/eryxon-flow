import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProductionMetrics {
  // Quantities
  totalProduced: number;
  totalGood: number;
  totalScrap: number;
  totalRework: number;

  // Yields
  overallYield: number;
  scrapRate: number;
  reworkRate: number;

  // Time metrics (calculated from actual_time and quantity)
  avgCycleTimePerUnit: number | null; // in minutes
  totalActualTime: number; // in minutes
  totalEstimatedTime: number; // in minutes
  timeEfficiency: number | null; // actual vs estimated %

  // Scrap breakdown
  scrapByReason: Array<{
    scrap_reason_id: string;
    code: string;
    description: string;
    category: string;
    total_quantity: number;
    occurrence_count: number;
  }>;
}

export interface OperationProductionSummary {
  operationId: string;
  operationName: string;
  plannedQuantity: number;
  quantityGood: number;
  quantityScrap: number;
  quantityRework: number;
  remaining: number;
  completionPercentage: number;
  actualTime: number | null;
  estimatedTime: number;
  cycleTimePerUnit: number | null;
  scrapReasons: Array<{
    reason_id: string;
    code: string;
    description: string;
    quantity: number;
  }>;
}

/**
 * Hook for fetching production metrics for a specific operation
 */
export function useOperationProductionMetrics(operationId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["operation-production-metrics", operationId],
    enabled: !!operationId && !!profile?.tenant_id,
    queryFn: async (): Promise<OperationProductionSummary | null> => {
      if (!operationId) return null;

      // Fetch operation details
      const { data: operation, error: opError } = await supabase
        .from("operations")
        .select(`
          id,
          operation_name,
          estimated_time,
          actual_time,
          part:parts (
            quantity
          )
        `)
        .eq("id", operationId)
        .single();

      if (opError || !operation) {
        console.error("Error fetching operation:", opError);
        return null;
      }

      // Fetch quantity records for this operation
      const { data: quantities, error: qtyError } = await supabase
        .from("operation_quantities")
        .select(`
          quantity_produced,
          quantity_good,
          quantity_scrap,
          quantity_rework,
          scrap_reason_id,
          scrap_reason:scrap_reasons (
            id,
            code,
            description,
            category
          )
        `)
        .eq("operation_id", operationId);

      if (qtyError) {
        console.error("Error fetching quantities:", qtyError);
      }

      const records = quantities || [];
      const totalGood = records.reduce((sum, r) => sum + (r.quantity_good || 0), 0);
      const totalScrap = records.reduce((sum, r) => sum + (r.quantity_scrap || 0), 0);
      const totalRework = records.reduce((sum, r) => sum + (r.quantity_rework || 0), 0);

      // Calculate planned quantity from part
      const plannedQuantity = (operation.part as any)?.quantity || 0;
      const remaining = Math.max(0, plannedQuantity - totalGood);
      const completionPct = plannedQuantity > 0 ? (totalGood / plannedQuantity) * 100 : 0;

      // Calculate cycle time per unit from actual time and good quantity
      let cycleTimePerUnit: number | null = null;
      if (operation.actual_time && totalGood > 0) {
        cycleTimePerUnit = operation.actual_time / totalGood;
      }

      // Aggregate scrap reasons
      const scrapByReason = new Map<string, { reason_id: string; code: string; description: string; quantity: number }>();
      for (const rec of records) {
        if (rec.quantity_scrap > 0 && rec.scrap_reason) {
          const reason = rec.scrap_reason as any;
          const existing = scrapByReason.get(reason.id);
          if (existing) {
            existing.quantity += rec.quantity_scrap;
          } else {
            scrapByReason.set(reason.id, {
              reason_id: reason.id,
              code: reason.code,
              description: reason.description,
              quantity: rec.quantity_scrap,
            });
          }
        }
      }

      return {
        operationId: operation.id,
        operationName: operation.operation_name,
        plannedQuantity,
        quantityGood: totalGood,
        quantityScrap: totalScrap,
        quantityRework: totalRework,
        remaining,
        completionPercentage: Math.round(completionPct * 10) / 10,
        actualTime: operation.actual_time,
        estimatedTime: operation.estimated_time,
        cycleTimePerUnit: cycleTimePerUnit ? Math.round(cycleTimePerUnit * 100) / 100 : null,
        scrapReasons: Array.from(scrapByReason.values()),
      };
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for fetching production metrics for a job (all operations)
 */
export function useJobProductionMetrics(jobId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["job-production-metrics", jobId],
    enabled: !!jobId && !!profile?.tenant_id,
    queryFn: async (): Promise<ProductionMetrics | null> => {
      if (!jobId) return null;

      // First get all parts for this job
      const { data: parts, error: partsError } = await supabase
        .from("parts")
        .select("id")
        .eq("job_id", jobId);

      if (partsError || !parts || parts.length === 0) {
        return null;
      }

      const partIds = parts.map((p) => p.id);

      // Get all operations for these parts
      const { data: operations, error: opsError } = await supabase
        .from("operations")
        .select("id, estimated_time, actual_time")
        .in("part_id", partIds);

      if (opsError || !operations) {
        return null;
      }

      const operationIds = operations.map((o) => o.id);

      // Get all quantity records for these operations
      const { data: quantities, error: qtyError } = await supabase
        .from("operation_quantities")
        .select(`
          quantity_produced,
          quantity_good,
          quantity_scrap,
          quantity_rework,
          scrap_reason_id,
          scrap_reason:scrap_reasons (
            id,
            code,
            description,
            category
          )
        `)
        .in("operation_id", operationIds);

      if (qtyError) {
        console.error("Error fetching quantities:", qtyError);
      }

      const records = quantities || [];

      const totalProduced = records.reduce((sum, r) => sum + (r.quantity_produced || 0), 0);
      const totalGood = records.reduce((sum, r) => sum + (r.quantity_good || 0), 0);
      const totalScrap = records.reduce((sum, r) => sum + (r.quantity_scrap || 0), 0);
      const totalRework = records.reduce((sum, r) => sum + (r.quantity_rework || 0), 0);

      const overallYield = totalProduced > 0 ? (totalGood / totalProduced) * 100 : 0;
      const scrapRate = totalProduced > 0 ? (totalScrap / totalProduced) * 100 : 0;
      const reworkRate = totalProduced > 0 ? (totalRework / totalProduced) * 100 : 0;

      // Calculate time metrics
      const totalActualTime = operations.reduce((sum, o) => sum + (o.actual_time || 0), 0);
      const totalEstimatedTime = operations.reduce((sum, o) => sum + (o.estimated_time || 0), 0);
      const timeEfficiency = totalEstimatedTime > 0 ? (totalEstimatedTime / totalActualTime) * 100 : null;

      // Calculate average cycle time per unit
      const avgCycleTimePerUnit = totalGood > 0 ? totalActualTime / totalGood : null;

      // Aggregate scrap by reason
      const scrapByReasonMap = new Map<string, {
        scrap_reason_id: string;
        code: string;
        description: string;
        category: string;
        total_quantity: number;
        occurrence_count: number;
      }>();

      for (const rec of records) {
        if (rec.quantity_scrap > 0 && rec.scrap_reason) {
          const reason = rec.scrap_reason as any;
          const existing = scrapByReasonMap.get(reason.id);
          if (existing) {
            existing.total_quantity += rec.quantity_scrap;
            existing.occurrence_count += 1;
          } else {
            scrapByReasonMap.set(reason.id, {
              scrap_reason_id: reason.id,
              code: reason.code,
              description: reason.description,
              category: reason.category,
              total_quantity: rec.quantity_scrap,
              occurrence_count: 1,
            });
          }
        }
      }

      return {
        totalProduced,
        totalGood,
        totalScrap,
        totalRework,
        overallYield: Math.round(overallYield * 10) / 10,
        scrapRate: Math.round(scrapRate * 10) / 10,
        reworkRate: Math.round(reworkRate * 10) / 10,
        avgCycleTimePerUnit: avgCycleTimePerUnit ? Math.round(avgCycleTimePerUnit * 100) / 100 : null,
        totalActualTime,
        totalEstimatedTime,
        timeEfficiency: timeEfficiency ? Math.round(timeEfficiency * 10) / 10 : null,
        scrapByReason: Array.from(scrapByReasonMap.values()).sort((a, b) => b.total_quantity - a.total_quantity),
      };
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to record production quantity with optional scrap reasons
 */
export function useRecordProduction() {
  const { profile } = useAuth();

  const recordQuantity = async (data: {
    operationId: string;
    quantityGood: number;
    quantityScrap?: number;
    quantityRework?: number;
    scrapReasons?: Array<{ reasonId: string; quantity: number; notes?: string }>;
    notes?: string;
    materialLot?: string;
    materialSupplier?: string;
    materialCertNumber?: string;
  }) => {
    if (!profile?.tenant_id) {
      throw new Error("Not authenticated");
    }

    const quantityScrap = data.quantityScrap || 0;
    const quantityRework = data.quantityRework || 0;
    const quantityProduced = data.quantityGood + quantityScrap + quantityRework;

    // Insert the main quantity record
    const { data: quantityRecord, error: qtyError } = await supabase
      .from("operation_quantities")
      .insert({
        tenant_id: profile.tenant_id,
        operation_id: data.operationId,
        quantity_produced: quantityProduced,
        quantity_good: data.quantityGood,
        quantity_scrap: quantityScrap,
        quantity_rework: quantityRework,
        notes: data.notes,
        material_lot: data.materialLot,
        material_supplier: data.materialSupplier,
        material_cert_number: data.materialCertNumber,
        recorded_at: new Date().toISOString(),
        recorded_by: profile.id,
      })
      .select()
      .single();

    if (qtyError || !quantityRecord) {
      throw new Error(`Failed to record quantity: ${qtyError?.message}`);
    }

    // If there are multiple scrap reasons, insert them into the junction table
    if (data.scrapReasons && data.scrapReasons.length > 0) {
      const scrapReasonRecords = data.scrapReasons.map((sr) => ({
        operation_quantity_id: quantityRecord.id,
        scrap_reason_id: sr.reasonId,
        quantity: sr.quantity,
        notes: sr.notes,
      }));

      const { error: scrapError } = await supabase
        .from("operation_quantity_scrap_reasons" as any)
        .insert(scrapReasonRecords as any);

      if (scrapError) {
        console.error("Failed to record scrap reasons:", scrapError);
        // Don't throw - the main record was saved
      }
    }

    return quantityRecord;
  };

  return { recordQuantity };
}
