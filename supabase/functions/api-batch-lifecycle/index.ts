/**
 * Batch Lifecycle API Endpoint
 *
 * Dedicated endpoints for batch lifecycle operations:
 * - POST /start?id=xxx - Start a batch (creates time entries, sets in_progress)
 * - POST /stop?id=xxx  - Stop a batch (distributes time, sets completed)
 * - POST /add-operations?id=xxx - Add operations to a batch
 *
 * Authentication: API key in Authorization header
 */

import { createClient } from "@supabase/supabase-js";
import { authenticateAndSetContext } from "@shared/auth.ts";
import { corsHeaders } from "@shared/cors.ts";
import { handleOptions, handleError } from "@shared/validation/errorHandler.ts";

function jsonResponse(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 400) {
  return jsonResponse({ success: false, error: { code, message } }, status);
}

async function triggerWebhook(tenantId: string, eventType: string, data: object) {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY")}`,
      },
      body: JSON.stringify({ tenant_id: tenantId, event_type: eventType, data }),
    });
  } catch (error) {
    console.error(`Failed to trigger ${eventType} webhook:`, error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY") ?? ""
  );

  try {
    const { tenantId } = await authenticateAndSetContext(req, supabase);

    const url = new URL(req.url);
    const batchId = url.searchParams.get("id");
    const action = url.pathname.split("/").pop(); // start, stop, add-operations

    if (!batchId) return errorResponse("VALIDATION_ERROR", "Batch ID required (?id=xxx)");

    const body = await req.json().catch(() => ({}));

    // ── Fetch batch ────────────────────────────────────────────────
    const { data: batch, error: batchErr } = await supabase
      .from("operation_batches")
      .select("id, batch_number, status, cell_id")
      .eq("id", batchId)
      .eq("tenant_id", tenantId)
      .single();

    if (batchErr || !batch) return errorResponse("NOT_FOUND", "Batch not found", 404);

    // ── Route to action ────────────────────────────────────────────
    if (action === "start") {
      if (batch.status !== "draft" && batch.status !== "ready") {
        return errorResponse("INVALID_STATE", `Cannot start batch in '${batch.status}' status`);
      }

      // Get batch operations
      const { data: batchOps } = await supabase
        .from("batch_operations")
        .select("operation_id")
        .eq("batch_id", batchId)
        .eq("tenant_id", tenantId);

      if (!batchOps || batchOps.length === 0) {
        return errorResponse("VALIDATION_ERROR", "Cannot start batch with no operations");
      }

      const opIds = batchOps.map((bo: any) => bo.operation_id);
      const now = new Date().toISOString();
      const operatorId = body.operator_id || null;

      // Create time entries for all operations
      const timeEntries = opIds.map((opId: string) => ({
        tenant_id: tenantId,
        operation_id: opId,
        operator_id: operatorId,
        start_time: now,
      }));

      const { error: timeErr } = await supabase.from("time_entries").insert(timeEntries);
      if (timeErr) return errorResponse("INSERT_ERROR", `Time entries: ${timeErr.message}`, 500);

      // Update operations to in_progress
      await supabase
        .from("operations")
        .update({ status: "in_progress", started_at: now })
        .in("id", opIds)
        .eq("tenant_id", tenantId)
        .eq("status", "not_started");

      // Update batch
      await supabase
        .from("operation_batches")
        .update({ status: "in_progress", started_at: now, started_by: operatorId })
        .eq("id", batchId);

      await triggerWebhook(tenantId, "batch.started", {
        batch_id: batchId,
        batch_number: batch.batch_number,
        operations: opIds.length,
        started_at: now,
      });

      return jsonResponse({
        success: true,
        data: { batch_id: batchId, status: "in_progress", operations_started: opIds.length, started_at: now },
      });
    }

    if (action === "stop") {
      if (batch.status !== "in_progress") {
        return errorResponse("INVALID_STATE", `Cannot stop batch in '${batch.status}' status`);
      }

      // Get operations with estimated_time for weighted distribution
      const { data: batchOps } = await supabase
        .from("batch_operations")
        .select("operation_id, operation:operations(id, estimated_time)")
        .eq("batch_id", batchId)
        .eq("tenant_id", tenantId);

      if (!batchOps || batchOps.length === 0) {
        return errorResponse("VALIDATION_ERROR", "No operations in batch");
      }

      const opIds = batchOps.map((bo: any) => bo.operation_id);

      // Find active time entries
      const { data: activeEntries } = await supabase
        .from("time_entries")
        .select("id, operation_id, start_time")
        .in("operation_id", opIds)
        .eq("tenant_id", tenantId)
        .is("end_time", null);

      if (!activeEntries || activeEntries.length === 0) {
        return errorResponse("VALIDATION_ERROR", "No active timers for batch operations");
      }

      const now = new Date();
      const nowStr = now.toISOString();
      const earliest = Math.min(...activeEntries.map((e: any) => new Date(e.start_time).getTime()));
      const totalMinutes = Math.round((now.getTime() - earliest) / 60000);

      // Weighted distribution by estimated_time (fallback: equal)
      const ops = batchOps.map((bo: any) => ({
        id: bo.operation_id,
        est: bo.operation?.estimated_time ?? 0,
      }));
      const totalEst = ops.reduce((s: number, o: any) => s + (o.est || 0), 0);
      const useWeighted = totalEst > 0 && ops.every((o: any) => o.est > 0);

      const dist: { id: string; minutes: number }[] = [];
      if (useWeighted) {
        let allocated = 0;
        ops.forEach((op: any, i: number) => {
          const share = i === ops.length - 1
            ? totalMinutes - allocated
            : Math.round((op.est / totalEst) * totalMinutes);
          dist.push({ id: op.id, minutes: share });
          allocated += share;
        });
      } else {
        const base = Math.floor(totalMinutes / ops.length);
        const rem = totalMinutes - base * ops.length;
        ops.forEach((op: any, i: number) => {
          dist.push({ id: op.id, minutes: base + (i < rem ? 1 : 0) });
        });
      }

      // Close time entries
      for (const entry of activeEntries) {
        const alloc = dist.find((d) => d.id === entry.operation_id);
        await supabase
          .from("time_entries")
          .update({ end_time: nowStr, duration_minutes: alloc?.minutes ?? 0 })
          .eq("id", entry.id);
      }

      // Update operation actual_time
      for (const alloc of dist) {
        const { data: op } = await supabase
          .from("operations")
          .select("actual_time")
          .eq("id", alloc.id)
          .single();
        await supabase
          .from("operations")
          .update({ actual_time: (op?.actual_time ?? 0) + alloc.minutes })
          .eq("id", alloc.id);
      }

      // Complete batch
      const operatorId = body.operator_id || null;
      await supabase
        .from("operation_batches")
        .update({ status: "completed", completed_at: nowStr, completed_by: operatorId, actual_time: totalMinutes })
        .eq("id", batchId);

      await triggerWebhook(tenantId, "batch.completed", {
        batch_id: batchId,
        batch_number: batch.batch_number,
        total_minutes: totalMinutes,
        distribution: dist,
      });

      return jsonResponse({
        success: true,
        data: {
          batch_id: batchId,
          status: "completed",
          total_minutes: totalMinutes,
          distribution_method: useWeighted ? "weighted" : "equal",
          operations: dist,
        },
      });
    }

    if (action === "add-operations") {
      if (batch.status !== "draft" && batch.status !== "ready") {
        return errorResponse("INVALID_STATE", `Cannot modify operations in '${batch.status}' status`);
      }

      const opIds = body.operation_ids;
      if (!opIds || !Array.isArray(opIds) || opIds.length === 0) {
        return errorResponse("VALIDATION_ERROR", "operation_ids array required");
      }

      const { data: existing } = await supabase
        .from("batch_operations")
        .select("sequence_in_batch")
        .eq("batch_id", batchId)
        .eq("tenant_id", tenantId)
        .order("sequence_in_batch", { ascending: false })
        .limit(1);

      const startSeq = (existing?.[0]?.sequence_in_batch ?? 0) + 1;

      const rows = opIds.map((opId: string, i: number) => ({
        tenant_id: tenantId,
        batch_id: batchId,
        operation_id: opId,
        sequence_in_batch: startSeq + i,
      }));

      const { error } = await supabase.from("batch_operations").insert(rows);
      if (error) return errorResponse("INSERT_ERROR", error.message, 500);

      return jsonResponse({ success: true, data: { batch_id: batchId, operations_added: opIds.length } });
    }

    return errorResponse("NOT_FOUND", `Unknown action: ${action}`, 404);
  } catch (error) {
    return handleError(error);
  }
});
