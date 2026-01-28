/**
 * Operation Lifecycle API Endpoint
 *
 * This Supabase Edge Function provides dedicated endpoints for operation lifecycle operations.
 * Manages state transitions with proper validation, time tracking, and webhook notifications.
 *
 * Supported Operations:
 * - POST /start?id=xxx - Start an operation (creates time entry)
 * - POST /pause?id=xxx - Pause an operation (ends current time entry)
 * - POST /resume?id=xxx - Resume a paused operation (creates new time entry)
 * - POST /complete?id=xxx - Complete an operation (ends time entry, updates completion)
 *
 * All operations:
 * - Update operation status appropriately
 * - Manage time_entries for accurate tracking
 * - Track timestamps (started_at, paused_at, resumed_at, completed_at)
 * - Trigger webhooks for lifecycle events
 * - Validate state transitions
 * - Return updated operation data
 *
 * Authentication:
 * - Requires API key in Authorization header: "Bearer ery_live_xxx" or "Bearer ery_test_xxx"
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { authenticateAndSetContext } from "@shared/auth.ts";
import { corsHeaders } from "@shared/cors.ts";
import { handleOptions, handleError } from "@shared/validation/errorHandler.ts";

async function triggerWebhook(supabase: any, tenantId: string, eventType: string, data: any) {
  try {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY")}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        event_type: eventType,
        data: data,
      }),
    });
  } catch (error) {
    console.error(`Failed to trigger ${eventType} webhook:`, error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptions();
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY") ?? ''
  );

  try {
    const { tenantId } = await authenticateAndSetContext(req, supabase);

    const url = new URL(req.url);
    const operationId = url.searchParams.get('id');
    const userId = url.searchParams.get('user_id'); // Optional: for time tracking
    const operation = url.pathname.split('/').pop(); // start, pause, resume, complete

    if (!operationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Operation ID is required in query string (?id=xxx)' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch current operation with related data
    const { data: operationData, error: fetchError } = await supabase
      .from('operations')
      .select(`
        id,
        operation_name,
        status,
        estimated_time,
        actual_time,
        started_at,
        paused_at,
        resumed_at,
        completed_at,
        part:parts (
          id,
          part_number,
          job:jobs (
            id,
            job_number,
            customer
          )
        )
      `)
      .eq('id', operationId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !operationData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Operation not found' }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    const updates: any = { updated_at: now };
    let newStatus: string = operationData.status;
    let webhookEvent: string | null = null;
    let timeEntryAction: 'create' | 'end' | null = null;

    // Handle different lifecycle operations
    switch (operation) {
      case 'start':
        // Validate: can only start if not_started or on_hold
        if (operationData.status !== 'not_started' && operationData.status !== 'on_hold') {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'INVALID_STATE_TRANSITION',
                message: `Cannot start operation with status '${operationData.status}'. Operation must be 'not_started' or 'on_hold'.`
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        updates.status = 'in_progress';
        updates.started_at = operationData.started_at || now;
        updates.paused_at = null;
        newStatus = 'in_progress';
        webhookEvent = 'operation.started';
        timeEntryAction = 'create';
        break;

      case 'pause':
        // Validate: can only pause if in_progress
        if (operationData.status !== 'in_progress') {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'INVALID_STATE_TRANSITION',
                message: `Cannot pause operation with status '${operationData.status}'. Operation must be 'in_progress'.`
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        updates.status = 'on_hold';
        updates.paused_at = now;
        newStatus = 'on_hold';
        webhookEvent = 'operation.paused';
        timeEntryAction = 'end';
        break;

      case 'resume':
        // Validate: can only resume if on_hold
        if (operationData.status !== 'on_hold') {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'INVALID_STATE_TRANSITION',
                message: `Cannot resume operation with status '${operationData.status}'. Operation must be 'on_hold'.`
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        updates.status = 'in_progress';
        updates.resumed_at = now;
        updates.paused_at = null;
        newStatus = 'in_progress';
        webhookEvent = 'operation.resumed';
        timeEntryAction = 'create';
        break;

      case 'complete':
        // Validate: can only complete if in_progress
        if (operationData.status !== 'in_progress') {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'INVALID_STATE_TRANSITION',
                message: `Cannot complete operation with status '${operationData.status}'. Operation must be 'in_progress'.`
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        updates.status = 'completed';
        updates.completed_at = now;
        updates.completion_percentage = 100;
        newStatus = 'completed';
        webhookEvent = 'operation.completed';
        timeEntryAction = 'end';
        break;

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'INVALID_OPERATION',
              message: `Invalid operation '${operation}'. Supported operations: start, pause, resume, complete`
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Handle time entry actions
    if (timeEntryAction === 'create' && userId) {
      // Create new time entry
      await supabase
        .from('time_entries')
        .insert({
          tenant_id: tenantId,
          operation_id: operationId,
          user_id: userId,
          start_time: now,
        });
    } else if (timeEntryAction === 'end') {
      // End active time entries for this operation
      const { data: activeEntries } = await supabase
        .from('time_entries')
        .select('id, start_time')
        .eq('operation_id', operationId)
        .is('end_time', null);

      if (activeEntries && activeEntries.length > 0) {
        for (const entry of activeEntries) {
          const startTime = new Date(entry.start_time).getTime();
          const endTime = new Date(now).getTime();
          const duration = Math.round((endTime - startTime) / 60000); // Minutes

          await supabase
            .from('time_entries')
            .update({
              end_time: now,
              duration: duration
            })
            .eq('id', entry.id);
        }

        // Calculate total actual time
        const { data: allEntries } = await supabase
          .from('time_entries')
          .select('duration')
          .eq('operation_id', operationId)
          .not('duration', 'is', null);

        if (allEntries) {
          const totalTime = allEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
          updates.actual_time = totalTime;
        }
      }
    }

    // Update the operation
    const { data: updatedOperation, error: updateError } = await supabase
      .from('operations')
      .update(updates)
      .eq('id', operationId)
      .eq('tenant_id', tenantId)
      .select(`
        *,
        part:parts (
          id,
          part_number,
          job:jobs (
            id,
            job_number,
            customer
          )
        )
      `)
      .single();

    if (updateError || !updatedOperation) {
      throw new Error(`Failed to update operation: ${updateError?.message}`);
    }

    // Trigger webhook
    if (webhookEvent) {
      await triggerWebhook(supabase, tenantId, webhookEvent, {
        operation_id: updatedOperation.id,
        operation_name: updatedOperation.operation_name,
        part_id: updatedOperation.part?.id,
        part_number: updatedOperation.part?.part_number,
        job_id: updatedOperation.part?.job?.id,
        job_number: updatedOperation.part?.job?.job_number,
        customer: updatedOperation.part?.job?.customer || '',
        previous_status: operationData.status,
        new_status: newStatus,
        timestamp: now,
        estimated_time: updatedOperation.estimated_time,
        actual_time: updatedOperation.actual_time,
        completion_percentage: updatedOperation.completion_percentage,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          operation: updatedOperation,
          operation_type: operation,
          previous_status: operationData.status,
          new_status: newStatus,
          time_entry_created: timeEntryAction === 'create',
          time_entry_ended: timeEntryAction === 'end'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-operation-lifecycle:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
