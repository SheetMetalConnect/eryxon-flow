/**
 * Job Lifecycle API Endpoint
 *
 * This Supabase Edge Function provides dedicated endpoints for job lifecycle operations.
 * These are high-level operations that manage state transitions with proper validation,
 * time tracking, and webhook notifications.
 *
 * Supported Operations:
 * - POST /start?id=xxx - Start a job
 * - POST /stop?id=xxx - Stop/pause a job
 * - POST /complete?id=xxx - Complete a job
 * - POST /resume?id=xxx - Resume a paused job
 *
 * All operations:
 * - Update job status appropriately
 * - Track timestamps (started_at, paused_at, completed_at, resumed_at)
 * - Trigger webhooks for lifecycle events
 * - Validate state transitions
 * - Return updated job data
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
    const jobId = url.searchParams.get('id');
    const operation = url.pathname.split('/').pop(); // start, stop, complete, resume

    if (!jobId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Job ID is required in query string (?id=xxx)' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch current job
    const { data: job, error: fetchError } = await supabase
      .from('jobs')
      .select(`
        id,
        job_number,
        customer,
        status,
        started_at,
        paused_at,
        completed_at,
        resumed_at,
        created_at
      `)
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !job) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Job not found' }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    const updates: any = { updated_at: now };
    let newStatus: string = job.status;
    let webhookEvent: string | null = null;

    // Handle different lifecycle operations
    switch (operation) {
      case 'start':
        // Validate: can only start if not_started or on_hold
        if (job.status !== 'not_started' && job.status !== 'on_hold') {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'INVALID_STATE_TRANSITION',
                message: `Cannot start job with status '${job.status}'. Job must be 'not_started' or 'on_hold'.`
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        updates.status = 'in_progress';
        updates.started_at = job.started_at || now; // Only set if not already started
        updates.paused_at = null; // Clear pause time
        newStatus = 'in_progress';
        webhookEvent = 'job.started';
        break;

      case 'stop':
      case 'pause':
        // Validate: can only stop if in_progress
        if (job.status !== 'in_progress') {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'INVALID_STATE_TRANSITION',
                message: `Cannot stop job with status '${job.status}'. Job must be 'in_progress'.`
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        updates.status = 'on_hold';
        updates.paused_at = now;
        newStatus = 'on_hold';
        webhookEvent = 'job.stopped';
        break;

      case 'complete':
        // Validate: can only complete if in_progress
        if (job.status !== 'in_progress') {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'INVALID_STATE_TRANSITION',
                message: `Cannot complete job with status '${job.status}'. Job must be 'in_progress'.`
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Calculate actual duration if started_at exists
        if (job.started_at) {
          const startTime = new Date(job.started_at).getTime();
          const endTime = new Date(now).getTime();
          updates.actual_duration = Math.round((endTime - startTime) / 60000); // Convert to minutes
        }

        updates.status = 'completed';
        updates.completed_at = now;
        newStatus = 'completed';
        webhookEvent = 'job.completed';
        break;

      case 'resume':
        // Validate: can only resume if on_hold
        if (job.status !== 'on_hold') {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'INVALID_STATE_TRANSITION',
                message: `Cannot resume job with status '${job.status}'. Job must be 'on_hold'.`
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        updates.status = 'in_progress';
        updates.resumed_at = now;
        updates.paused_at = null; // Clear pause time
        newStatus = 'in_progress';
        webhookEvent = 'job.resumed';
        break;

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'INVALID_OPERATION',
              message: `Invalid operation '${operation}'. Supported operations: start, stop, complete, resume`
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Update the job
    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError || !updatedJob) {
      throw new Error(`Failed to update job: ${updateError?.message}`);
    }

    // Trigger webhook
    if (webhookEvent) {
      await triggerWebhook(supabase, tenantId, webhookEvent, {
        job_id: updatedJob.id,
        job_number: updatedJob.job_number,
        customer: updatedJob.customer || '',
        previous_status: job.status,
        new_status: newStatus,
        timestamp: now,
        started_at: updatedJob.started_at,
        completed_at: updatedJob.completed_at,
        actual_duration: updatedJob.actual_duration,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          job: updatedJob,
          operation: operation,
          previous_status: job.status,
          new_status: newStatus
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-job-lifecycle:', error);
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
