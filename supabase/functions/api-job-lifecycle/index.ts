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
 * Observability (ERY-51 / ERY-39):
 * - Routed through `createApiHandler`, so every request carries a boundary
 *   `x-request-id`, structured edge logs, and automatic `edge.error`
 *   persistence into `activity_log` on thrown failures.
 * - Successful state transitions record a `job.lifecycle` pilot event with the
 *   shared request id so the trace links edge log -> durable activity row.
 *
 * Authentication:
 * - Requires API key in Authorization header: "Bearer ery_live_xxx" or "Bearer ery_test_xxx"
 */

import { serveApi, errorResponse, successResponse } from "@shared/handler.ts";
import { REQUEST_ID_HEADER } from "@shared/observability.ts";

async function triggerWebhook(
  supabase: any,
  tenantId: string,
  eventType: string,
  data: any,
  requestId: string,
) {
  try {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Propagate the request id so the dispatch hop logs/persists under the
        // same correlation id as this lifecycle request.
        [REQUEST_ID_HEADER]: requestId,
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

serveApi(
  async (req, ctx) => {
    const { supabase, tenantId, url, requestId } = ctx;
    const jobId = url.searchParams.get('id');
    const operation = url.pathname.split('/').pop(); // start, stop, complete, resume

    if (!jobId) {
      return errorResponse('VALIDATION_ERROR', 'Job ID is required in query string (?id=xxx)', 400);
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
      return errorResponse('NOT_FOUND', 'Job not found', 404);
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
          return errorResponse(
            'INVALID_STATE_TRANSITION',
            `Cannot start job with status '${job.status}'. Job must be 'not_started' or 'on_hold'.`,
            400,
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
          return errorResponse(
            'INVALID_STATE_TRANSITION',
            `Cannot stop job with status '${job.status}'. Job must be 'in_progress'.`,
            400,
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
          return errorResponse(
            'INVALID_STATE_TRANSITION',
            `Cannot complete job with status '${job.status}'. Job must be 'in_progress'.`,
            400,
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
          return errorResponse(
            'INVALID_STATE_TRANSITION',
            `Cannot resume job with status '${job.status}'. Job must be 'on_hold'.`,
            400,
          );
        }

        updates.status = 'in_progress';
        updates.resumed_at = now;
        updates.paused_at = null; // Clear pause time
        newStatus = 'in_progress';
        webhookEvent = 'job.resumed';
        break;

      default:
        return errorResponse(
          'INVALID_OPERATION',
          `Invalid operation '${operation}'. Supported operations: start, stop, complete, resume`,
          400,
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

    // Record the pilot-critical lifecycle event (ERY-51) with the shared
    // request id before dispatching the webhook.
    await ctx.recordPilotEvent({
      level: 'info',
      eventType: 'job.lifecycle',
      action: `job.${operation}`,
      description: `Job ${updatedJob.job_number ?? updatedJob.id} ${operation}: ${job.status} -> ${newStatus}`,
      entityType: 'job',
      entityId: updatedJob.id,
      entityName: updatedJob.job_number,
      extra: {
        operation,
        previous_status: job.status,
        new_status: newStatus,
        actual_duration: updatedJob.actual_duration,
      },
    });

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
      }, requestId);
    }

    return successResponse({
      job: updatedJob,
      operation: operation,
      previous_status: job.status,
      new_status: newStatus,
    });
  },
  { methods: ['POST', 'OPTIONS'] },
);
