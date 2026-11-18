import { supabase } from "@/integrations/supabase/client";

export async function startBatchTimeTracking(batchId: string, operatorId: string, tenantId: string) {
  const { error } = await supabase.rpc("transition_batch", {
    p_tenant_id: tenantId,
    p_batch_id: batchId,
    p_action: "start",
    p_operator_id: operatorId,
  });
  if (error) throw error;
}

export async function stopBatchTimeTracking(batchId: string, operatorId: string, tenantId: string) {
  const { data, error } = await supabase.rpc("transition_batch", {
    p_tenant_id: tenantId,
    p_batch_id: batchId,
    p_action: "stop",
    p_operator_id: operatorId,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid batch transition response");
  const allocations = Array.isArray(data.operations) ? data.operations : [];
  const totalMinutes = Number(data.total_minutes ?? 0);
  return {
    totalMinutes,
    minutesPerOperation: allocations.length ? Math.floor(totalMinutes / allocations.length) : 0,
    operationsCount: allocations.length,
  };
}
