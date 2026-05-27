/**
 * DNC Transfer Lifecycle API Endpoint
 *
 * Manages state transitions for DNC transfer jobs, including the bridge
 * claim/ticket runtime contract:
 *
 * Bridge claim/ticket contract:
 *   POST /claim?id=xxx       — Bridge claims a pending transfer (exclusive)
 *   POST /tickets/:id/heartbeat — Refresh lease on an active ticket
 *   POST /tickets/:id/complete  — Complete a ticket + transfer job
 *   POST /tickets/:id/fail      — Fail a ticket + transfer job
 *
 * Legacy direct transitions:
 *   POST /start?id=xxx       — pending → transferring
 *   POST /complete?id=xxx    — transferring → completed
 *   POST /fail?id=xxx         — transferring/pending → failed
 *   POST /retry?id=xxx        — failed → pending (increments retry_count)
 *
 * All operations fire events for downstream consumers.
 */

import { serveApi, errorResponse, successResponse } from "@shared/handler.ts";
import type { HandlerContext } from "@shared/handler.ts";
import { REQUEST_ID_HEADER } from "@shared/observability.ts";

// ── Types ────────────────────────────────────────────────────────────────────

interface TransferJob {
  id: string;
  nc_program_id: string;
  status: string;
  retry_count: number;
  max_retries: number;
  lease_duration_seconds?: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  nc_program?: { program_name: string; program_type: string };
}

interface ActiveTicket {
  id: string;
  bridge_instance_id: string;
  status: string;
  lease_expires_at: string;
}

const TRANSFER_JOB_SELECT = `
  id, nc_program_id, target_machine_id, target_cell_id, destination_path,
  operation_id, status, transfer_protocol, transfer_config,
  started_at, completed_at, error_message, retry_count, max_retries,
  lease_duration_seconds,
  notes, metadata, created_at, updated_at,
  nc_program:nc_programs!nc_program_id (id, program_name, program_type, version)
`;

// ── Status flow (legacy direct transitions) ─────────────────────────────────

const STATUS_FLOW: Record<string, { from: string[]; to: string }> = {
  start: { from: ["pending"], to: "transferring" },
  complete: { from: ["transferring"], to: "completed" },
  fail: { from: ["transferring", "pending"], to: "failed" },
  retry: { from: ["failed"], to: "pending" },
};

// ── Event dispatch ──────────────────────────────────────────────────────────

async function triggerEvent(
  supabase: any,
  tenantId: string,
  eventType: string,
  data: any,
  requestId: string,
) {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [REQUEST_ID_HEADER]: requestId,
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY")}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        event_type: eventType,
        data,
      }),
    });
  } catch (error) {
    console.error(`Failed to trigger ${eventType} event:`, error);
  }
}

// ── Ticket helper: expire stale leases ──────────────────────────────────────

async function expireStaleTickets(supabase: any, tenantId: string, transferJobId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("dnc_transfer_tickets")
    .update({ status: "expired", updated_at: now })
    .eq("transfer_job_id", transferJobId)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .lt("lease_expires_at", now);
}

// ── Claim handler ───────────────────────────────────────────────────────────

async function handleClaim(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, requestId } = ctx;
  const url = ctx.url;
  const transferId = url.searchParams.get("id");

  if (!transferId) {
    return errorResponse("VALIDATION_ERROR", "Transfer ID is required (?id=xxx)", 400);
  }

  const body = await req.json().catch(() => ({}));
  const bridgeInstanceId = body.bridge_instance_id;
  if (!bridgeInstanceId || typeof bridgeInstanceId !== "string" || bridgeInstanceId.trim().length === 0) {
    return errorResponse("VALIDATION_ERROR", "bridge_instance_id is required", 400);
  }

  // Fetch transfer job (with lease config)
  const { data: transfer, error: fetchError } = await supabase
    .from("dnc_transfer_jobs")
    .select(`id, nc_program_id, status, retry_count, max_retries, lease_duration_seconds`)
    .eq("id", transferId)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !transfer) {
    return errorResponse("NOT_FOUND", "DNC transfer job not found", 404);
  }

  if (transfer.status !== "pending") {
    return errorResponse(
      "INVALID_STATE_TRANSITION",
      `Cannot claim transfer with status '${transfer.status}'. Only pending transfers can be claimed.`,
      400,
    );
  }

  // Expire any stale tickets for this job first
  await expireStaleTickets(supabase, tenantId, transferId);

  // Check no active ticket exists
  const { data: existingTickets } = await supabase
    .from("dnc_transfer_tickets")
    .select("id, bridge_instance_id, lease_expires_at")
    .eq("transfer_job_id", transferId)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .limit(1);

  if (existingTickets && existingTickets.length > 0) {
    return errorResponse(
      "ALREADY_CLAIMED",
      `Transfer is already claimed by bridge '${existingTickets[0].bridge_instance_id}' (lease expires ${existingTickets[0].lease_expires_at})`,
      409,
    );
  }

  // Calculate lease
  const leaseDuration = body.lease_duration_seconds ?? transfer.lease_duration_seconds ?? 300;
  const now = new Date();
  const leaseExpires = new Date(now.getTime() + leaseDuration * 1000);

  // Create ticket and update transfer in a transaction
  const { data: ticket, error: ticketError } = await supabase
    .from("dnc_transfer_tickets")
    .insert({
      tenant_id: tenantId,
      transfer_job_id: transferId,
      bridge_instance_id: bridgeInstanceId.trim(),
      status: "active",
      claimed_at: now.toISOString(),
      last_heartbeat_at: now.toISOString(),
      lease_duration_seconds: leaseDuration,
      lease_expires_at: leaseExpires.toISOString(),
    })
    .select(`id, transfer_job_id, bridge_instance_id, status, claimed_at, lease_expires_at, lease_duration_seconds`)
    .single();

  if (ticketError || !ticket) {
    throw new Error(`Failed to create ticket: ${ticketError?.message}`);
  }

  // Update transfer job to transferring
  const { data: updated, error: updateError } = await supabase
    .from("dnc_transfer_jobs")
    .update({
      status: "transferring",
      started_at: now.toISOString(),
      error_message: null,
      updated_at: now.toISOString(),
    })
    .eq("id", transferId)
    .eq("tenant_id", tenantId)
    .select(TRANSFER_JOB_SELECT)
    .single();

  if (updateError || !updated) {
    // Rollback ticket if transfer update fails
    await supabase
      .from("dnc_transfer_tickets")
      .update({ status: "expired", updated_at: now.toISOString() })
      .eq("id", ticket.id)
      .eq("tenant_id", tenantId);
    throw new Error(`Failed to update transfer: ${updateError?.message}`);
  }

  // Fire events
  await triggerEvent(supabase, tenantId, "dnc.transfer.claimed", {
    transfer_id: transferId,
    ticket_id: ticket.id,
    nc_program_id: transfer.nc_program_id,
    bridge_instance_id: ticket.bridge_instance_id,
    lease_expires_at: ticket.lease_expires_at,
    timestamp: now.toISOString(),
  }, requestId);

  await triggerEvent(supabase, tenantId, "dnc.transfer.start", {
    transfer_id: updated.id,
    nc_program_id: updated.nc_program_id,
    ticket_id: ticket.id,
    previous_status: transfer.status,
    new_status: "transferring",
    timestamp: now.toISOString(),
  }, requestId);

  return successResponse({
    ticket: {
      id: ticket.id,
      transfer_job_id: ticket.transfer_job_id,
      bridge_instance_id: ticket.bridge_instance_id,
      status: ticket.status,
      claimed_at: ticket.claimed_at,
      lease_expires_at: ticket.lease_expires_at,
      lease_duration_seconds: ticket.lease_duration_seconds,
    },
    dnc_transfer_job: updated,
    action: "claim",
    previous_status: transfer.status,
    new_status: "transferring",
  }, 201);
}

// ── Ticket heartbeat ────────────────────────────────────────────────────────

async function handleTicketHeartbeat(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, requestId, pathSegments } = ctx;
  const ticketIdIndex = pathSegments.indexOf("tickets");
  const ticketId = ticketIdIndex !== -1 ? pathSegments[ticketIdIndex + 1] : null;

  if (!ticketId) {
    return errorResponse("VALIDATION_ERROR", "Ticket ID is required in path (/tickets/:id/heartbeat)", 400);
  }

  // Fetch ticket and verify ownership
  const { data: ticket, error: fetchError } = await supabase
    .from("dnc_transfer_tickets")
    .select(`id, transfer_job_id, status, lease_expires_at, lease_duration_seconds, bridge_instance_id`)
    .eq("id", ticketId)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !ticket) {
    return errorResponse("NOT_FOUND", "DNC transfer ticket not found", 404);
  }

  if (ticket.status !== "active") {
    return errorResponse(
      "INVALID_STATE",
      `Cannot heartbeat ticket with status '${ticket.status}'. Only active tickets can receive heartbeats.`,
      400,
    );
  }

  // Calculate new lease expiry
  const now = new Date();
  const leaseDuration = ticket.lease_duration_seconds || 300;
  const newLeaseExpires = new Date(now.getTime() + leaseDuration * 1000).toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("dnc_transfer_tickets")
    .update({
      last_heartbeat_at: now.toISOString(),
      lease_expires_at: newLeaseExpires,
      updated_at: now.toISOString(),
    })
    .eq("id", ticketId)
    .eq("tenant_id", tenantId)
    .select(`id, transfer_job_id, bridge_instance_id, status, last_heartbeat_at, lease_expires_at, lease_duration_seconds`)
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to heartbeat ticket: ${updateError?.message}`);
  }

  // Fire event
  await triggerEvent(supabase, tenantId, "dnc.transfer.heartbeat", {
    ticket_id: updated.id,
    transfer_job_id: updated.transfer_job_id,
    bridge_instance_id: updated.bridge_instance_id,
    last_heartbeat_at: updated.last_heartbeat_at,
    lease_expires_at: updated.lease_expires_at,
    timestamp: now.toISOString(),
  }, requestId);

  return successResponse({
    ticket: updated,
    action: "heartbeat",
    lease_expires_at: newLeaseExpires,
  });
}

// ── Ticket complete ─────────────────────────────────────────────────────────

async function handleTicketComplete(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, requestId, pathSegments } = ctx;
  const ticketIdIndex = pathSegments.indexOf("tickets");
  const ticketId = ticketIdIndex !== -1 ? pathSegments[ticketIdIndex + 1] : null;

  if (!ticketId) {
    return errorResponse("VALIDATION_ERROR", "Ticket ID is required in path (/tickets/:id/complete)", 400);
  }

  // Fetch ticket
  const { data: ticket, error: fetchError } = await supabase
    .from("dnc_transfer_tickets")
    .select(`id, transfer_job_id, status, bridge_instance_id`)
    .eq("id", ticketId)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !ticket) {
    return errorResponse("NOT_FOUND", "DNC transfer ticket not found", 404);
  }

  if (ticket.status !== "active") {
    return errorResponse(
      "INVALID_STATE",
      `Cannot complete ticket with status '${ticket.status}'. Only active tickets can be completed.`,
      400,
    );
  }

  // Fetch the transfer job to verify state
  const { data: transfer, error: transferFetchError } = await supabase
    .from("dnc_transfer_jobs")
    .select(`id, nc_program_id, status`)
    .eq("id", ticket.transfer_job_id)
    .eq("tenant_id", tenantId)
    .single();

  if (transferFetchError || !transfer) {
    return errorResponse("NOT_FOUND", "Associated DNC transfer job not found", 404);
  }

  if (transfer.status !== "transferring") {
    return errorResponse(
      "INVALID_STATE_TRANSITION",
      `Cannot complete transfer with status '${transfer.status}'. Expected: transferring`,
      400,
    );
  }

  // Update ticket and transfer job
  const now = new Date().toISOString();

  const { data: updatedTicket, error: ticketUpdateError } = await supabase
    .from("dnc_transfer_tickets")
    .update({ status: "completed", completed_at: now, updated_at: now })
    .eq("id", ticketId)
    .eq("tenant_id", tenantId)
    .select(`id, transfer_job_id, bridge_instance_id, status, completed_at`)
    .single();

  if (ticketUpdateError || !updatedTicket) {
    throw new Error(`Failed to complete ticket: ${ticketUpdateError?.message}`);
  }

  const { data: updatedTransfer, error: transferUpdateError } = await supabase
    .from("dnc_transfer_jobs")
    .update({ status: "completed", completed_at: now, updated_at: now })
    .eq("id", ticket.transfer_job_id)
    .eq("tenant_id", tenantId)
    .select(TRANSFER_JOB_SELECT)
    .single();

  if (transferUpdateError || !updatedTransfer) {
    throw new Error(`Failed to complete transfer: ${transferUpdateError?.message}`);
  }

  // Fire events
  await triggerEvent(supabase, tenantId, "dnc.transfer.ticket_completed", {
    ticket_id: updatedTicket.id,
    transfer_id: updatedTransfer.id,
    nc_program_id: updatedTransfer.nc_program_id,
    bridge_instance_id: updatedTicket.bridge_instance_id,
    timestamp: now,
  }, requestId);

  await triggerEvent(supabase, tenantId, "dnc.transfer.complete", {
    transfer_id: updatedTransfer.id,
    nc_program_id: updatedTransfer.nc_program_id,
    ticket_id: updatedTicket.id,
    previous_status: transfer.status,
    new_status: "completed",
    timestamp: now,
  }, requestId);

  return successResponse({
    ticket: updatedTicket,
    dnc_transfer_job: updatedTransfer,
    action: "ticket_complete",
    previous_status: transfer.status,
    new_status: "completed",
  });
}

// ── Ticket fail ─────────────────────────────────────────────────────────────

async function handleTicketFail(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, requestId, pathSegments } = ctx;
  const ticketIdIndex = pathSegments.indexOf("tickets");
  const ticketId = ticketIdIndex !== -1 ? pathSegments[ticketIdIndex + 1] : null;

  if (!ticketId) {
    return errorResponse("VALIDATION_ERROR", "Ticket ID is required in path (/tickets/:id/fail)", 400);
  }

  const body = await req.json().catch(() => ({}));

  // Fetch ticket
  const { data: ticket, error: fetchError } = await supabase
    .from("dnc_transfer_tickets")
    .select(`id, transfer_job_id, status, bridge_instance_id`)
    .eq("id", ticketId)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !ticket) {
    return errorResponse("NOT_FOUND", "DNC transfer ticket not found", 404);
  }

  if (ticket.status !== "active") {
    return errorResponse(
      "INVALID_STATE",
      `Cannot fail ticket with status '${ticket.status}'. Only active tickets can be failed.`,
      400,
    );
  }

  // Fetch the transfer job
  const { data: transfer, error: transferFetchError } = await supabase
    .from("dnc_transfer_jobs")
    .select(`id, nc_program_id, status`)
    .eq("id", ticket.transfer_job_id)
    .eq("tenant_id", tenantId)
    .single();

  if (transferFetchError || !transfer) {
    return errorResponse("NOT_FOUND", "Associated DNC transfer job not found", 404);
  }

  if (transfer.status !== "transferring" && transfer.status !== "pending") {
    return errorResponse(
      "INVALID_STATE_TRANSITION",
      `Cannot fail transfer with status '${transfer.status}'. Expected: transferring or pending`,
      400,
    );
  }

  const now = new Date().toISOString();
  const errorMessage = body.error_message || "Transfer failed via ticket";

  const { data: updatedTicket, error: ticketUpdateError } = await supabase
    .from("dnc_transfer_tickets")
    .update({ status: "failed", completed_at: now, error_message: errorMessage, updated_at: now })
    .eq("id", ticketId)
    .eq("tenant_id", tenantId)
    .select(`id, transfer_job_id, bridge_instance_id, status, completed_at, error_message`)
    .single();

  if (ticketUpdateError || !updatedTicket) {
    throw new Error(`Failed to fail ticket: ${ticketUpdateError?.message}`);
  }

  const { data: updatedTransfer, error: transferUpdateError } = await supabase
    .from("dnc_transfer_jobs")
    .update({ status: "failed", error_message: errorMessage, updated_at: now })
    .eq("id", ticket.transfer_job_id)
    .eq("tenant_id", tenantId)
    .select(TRANSFER_JOB_SELECT)
    .single();

  if (transferUpdateError || !updatedTransfer) {
    throw new Error(`Failed to fail transfer: ${transferUpdateError?.message}`);
  }

  // Fire events
  await triggerEvent(supabase, tenantId, "dnc.transfer.ticket_failed", {
    ticket_id: updatedTicket.id,
    transfer_id: updatedTransfer.id,
    nc_program_id: updatedTransfer.nc_program_id,
    bridge_instance_id: updatedTicket.bridge_instance_id,
    error_message: errorMessage,
    timestamp: now,
  }, requestId);

  await triggerEvent(supabase, tenantId, "dnc.transfer.fail", {
    transfer_id: updatedTransfer.id,
    nc_program_id: updatedTransfer.nc_program_id,
    ticket_id: updatedTicket.id,
    previous_status: transfer.status,
    new_status: "failed",
    error_message: errorMessage,
    timestamp: now,
  }, requestId);

  return successResponse({
    ticket: updatedTicket,
    dnc_transfer_job: updatedTransfer,
    action: "ticket_fail",
    previous_status: transfer.status,
    new_status: "failed",
    error_message: errorMessage,
  });
}

// ── Legacy: handleStart ─────────────────────────────────────────────────────

async function handleLegacyStart(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, url, requestId } = ctx;
  const transferId = url.searchParams.get("id");

  if (!transferId) {
    return errorResponse("VALIDATION_ERROR", "Transfer ID is required (?id=xxx)", 400);
  }

  const body = await req.json().catch(() => ({}));

  // If bridge_instance_id provided, delegate to claim handler
  if (body.bridge_instance_id) {
    return handleClaim(req, ctx);
  }

  // Legacy direct start (no claim/ticket)
  const { data: transfer, error: fetchError } = await supabase
    .from("dnc_transfer_jobs")
    .select(`id, nc_program_id, status`)
    .eq("id", transferId)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !transfer) {
    return errorResponse("NOT_FOUND", "DNC transfer job not found", 404);
  }

  if (transfer.status !== "pending") {
    return errorResponse(
      "INVALID_STATE_TRANSITION",
      `Cannot start transfer with status '${transfer.status}'. Expected: pending`,
      400,
    );
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("dnc_transfer_jobs")
    .update({ status: "transferring", started_at: now, updated_at: now })
    .eq("id", transferId)
    .eq("tenant_id", tenantId)
    .select(TRANSFER_JOB_SELECT)
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to start transfer: ${updateError?.message}`);
  }

  await triggerEvent(supabase, tenantId, "dnc.transfer.start", {
    transfer_id: updated.id,
    nc_program_id: updated.nc_program_id,
    previous_status: transfer.status,
    new_status: "transferring",
    timestamp: now,
  }, requestId);

  return successResponse({
    dnc_transfer_job: updated,
    action: "start",
    previous_status: transfer.status,
    new_status: "transferring",
  });
}

// ── Legacy: handleComplete ──────────────────────────────────────────────────

async function handleLegacyComplete(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, url, requestId } = ctx;
  const transferId = url.searchParams.get("id");

  if (!transferId) {
    return errorResponse("VALIDATION_ERROR", "Transfer ID is required (?id=xxx)", 400);
  }

  const { data: transfer, error: fetchError } = await supabase
    .from("dnc_transfer_jobs")
    .select(`id, nc_program_id, status`)
    .eq("id", transferId)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !transfer) {
    return errorResponse("NOT_FOUND", "DNC transfer job not found", 404);
  }

  if (transfer.status !== "transferring") {
    return errorResponse(
      "INVALID_STATE_TRANSITION",
      `Cannot complete transfer with status '${transfer.status}'. Expected: transferring`,
      400,
    );
  }

  // Close any active tickets
  const now = new Date().toISOString();
  await supabase
    .from("dnc_transfer_tickets")
    .update({ status: "completed", completed_at: now, updated_at: now })
    .eq("transfer_job_id", transferId)
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  const { data: updated, error: updateError } = await supabase
    .from("dnc_transfer_jobs")
    .update({ status: "completed", completed_at: now, updated_at: now })
    .eq("id", transferId)
    .eq("tenant_id", tenantId)
    .select(TRANSFER_JOB_SELECT)
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to complete transfer: ${updateError?.message}`);
  }

  await triggerEvent(supabase, tenantId, "dnc.transfer.complete", {
    transfer_id: updated.id,
    nc_program_id: updated.nc_program_id,
    previous_status: transfer.status,
    new_status: "completed",
    timestamp: now,
  }, requestId);

  return successResponse({
    dnc_transfer_job: updated,
    action: "complete",
    previous_status: transfer.status,
    new_status: "completed",
  });
}

// ── Legacy: handleFail ──────────────────────────────────────────────────────

async function handleLegacyFail(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, url, requestId } = ctx;
  const transferId = url.searchParams.get("id");

  if (!transferId) {
    return errorResponse("VALIDATION_ERROR", "Transfer ID is required (?id=xxx)", 400);
  }

  const { data: transfer, error: fetchError } = await supabase
    .from("dnc_transfer_jobs")
    .select(`id, nc_program_id, status`)
    .eq("id", transferId)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !transfer) {
    return errorResponse("NOT_FOUND", "DNC transfer job not found", 404);
  }

  if (transfer.status !== "transferring" && transfer.status !== "pending") {
    return errorResponse(
      "INVALID_STATE_TRANSITION",
      `Cannot fail transfer with status '${transfer.status}'. Expected: transferring or pending`,
      400,
    );
  }

  const body = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  const errorMessage = body.error_message || "Transfer failed";

  // Close any active tickets
  await supabase
    .from("dnc_transfer_tickets")
    .update({ status: "failed", completed_at: now, error_message: errorMessage, updated_at: now })
    .eq("transfer_job_id", transferId)
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  const { data: updated, error: updateError } = await supabase
    .from("dnc_transfer_jobs")
    .update({ status: "failed", error_message: errorMessage, updated_at: now })
    .eq("id", transferId)
    .eq("tenant_id", tenantId)
    .select(TRANSFER_JOB_SELECT)
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to fail transfer: ${updateError?.message}`);
  }

  await triggerEvent(supabase, tenantId, "dnc.transfer.fail", {
    transfer_id: updated.id,
    nc_program_id: updated.nc_program_id,
    previous_status: transfer.status,
    new_status: "failed",
    error_message: errorMessage,
    timestamp: now,
  }, requestId);

  return successResponse({
    dnc_transfer_job: updated,
    action: "fail",
    previous_status: transfer.status,
    new_status: "failed",
    error_message: errorMessage,
  });
}

// ── Legacy: handleRetry ─────────────────────────────────────────────────────

async function handleLegacyRetry(req: Request, ctx: HandlerContext): Promise<Response> {
  const { supabase, tenantId, url, requestId } = ctx;
  const transferId = url.searchParams.get("id");

  if (!transferId) {
    return errorResponse("VALIDATION_ERROR", "Transfer ID is required (?id=xxx)", 400);
  }

  const { data: transfer, error: fetchError } = await supabase
    .from("dnc_transfer_jobs")
    .select(`id, nc_program_id, status, retry_count, max_retries`)
    .eq("id", transferId)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !transfer) {
    return errorResponse("NOT_FOUND", "DNC transfer job not found", 404);
  }

  if (transfer.status !== "failed") {
    return errorResponse(
      "INVALID_STATE_TRANSITION",
      `Cannot retry transfer with status '${transfer.status}'. Expected: failed`,
      400,
    );
  }

  const newRetryCount = (transfer.retry_count || 0) + 1;
  if (newRetryCount > (transfer.max_retries || 3)) {
    return errorResponse(
      "MAX_RETRIES_EXCEEDED",
      `Transfer has exceeded max retries (${transfer.max_retries})`,
      400,
    );
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("dnc_transfer_jobs")
    .update({
      status: "pending",
      started_at: null,
      completed_at: null,
      error_message: null,
      retry_count: newRetryCount,
      updated_at: now,
    })
    .eq("id", transferId)
    .eq("tenant_id", tenantId)
    .select(TRANSFER_JOB_SELECT)
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to retry transfer: ${updateError?.message}`);
  }

  await triggerEvent(supabase, tenantId, "dnc.transfer.retry", {
    transfer_id: updated.id,
    nc_program_id: updated.nc_program_id,
    previous_status: transfer.status,
    new_status: "pending",
    retry_count: newRetryCount,
    max_retries: transfer.max_retries,
    timestamp: now,
  }, requestId);

  return successResponse({
    dnc_transfer_job: updated,
    action: "retry",
    previous_status: transfer.status,
    new_status: "pending",
    retry_count: newRetryCount,
  });
}

// ── Main router ─────────────────────────────────────────────────────────────

serveApi(
  async (req: Request, ctx: HandlerContext) => {
    const { pathSegments } = ctx;

    // Route based on path structure:

    // /tickets/:ticketId/heartbeat
    if (pathSegments.length >= 3 && pathSegments[0] === "tickets") {
      const ticketAction = pathSegments[pathSegments.length - 1];
      switch (ticketAction) {
        case "heartbeat":
          return handleTicketHeartbeat(req, ctx);
        case "complete":
          return handleTicketComplete(req, ctx);
        case "fail":
          return handleTicketFail(req, ctx);
        default:
          return errorResponse(
            "INVALID_OPERATION",
            `Invalid ticket action '${ticketAction}'. Supported: heartbeat, complete, fail`,
            400,
          );
      }
    }

    // /claim?id=xxx
    // /start?id=xxx, /complete?id=xxx, /fail?id=xxx, /retry?id=xxx
    const action = pathSegments[0];

    switch (action) {
      case "claim":
        return handleClaim(req, ctx);
      case "start":
        return handleLegacyStart(req, ctx);
      case "complete":
        return handleLegacyComplete(req, ctx);
      case "fail":
        return handleLegacyFail(req, ctx);
      case "retry":
        return handleLegacyRetry(req, ctx);
      default:
        return errorResponse(
          "INVALID_OPERATION",
          `Invalid action '${action}'. Supported: claim, start, complete, fail, retry, tickets/:id/heartbeat, tickets/:id/complete, tickets/:id/fail`,
          400,
        );
    }
  },
  { methods: ["POST", "OPTIONS"] },
);
