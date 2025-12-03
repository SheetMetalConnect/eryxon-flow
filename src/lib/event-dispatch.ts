import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized Event Dispatch System
 *
 * This module provides a unified interface for dispatching events to:
 * - Webhooks (HTTP POST to external endpoints)
 * - MQTT (Publish to MQTT brokers using UNS pattern)
 * - Future: SSE, WebSockets, etc.
 *
 * All integrations share the same:
 * - Event types and definitions
 * - Payload structure
 * - Validation
 * - Error handling
 */

// ============================================================================
// Event Type Definitions
// ============================================================================

export type EventType =
  // Job lifecycle events
  | 'job.created'
  | 'job.updated'
  | 'job.started'
  | 'job.stopped'
  | 'job.resumed'
  | 'job.completed'
  // Part lifecycle events
  | 'part.created'
  | 'part.updated'
  | 'part.started'
  | 'part.completed'
  // Operation lifecycle events
  | 'operation.started'
  | 'operation.paused'
  | 'operation.resumed'
  | 'operation.completed'
  // Issue and NCR events
  | 'issue.created'
  | 'ncr.created'
  | 'ncr.verified'
  // Step events
  | 'step.added'
  | 'step.completed'
  // Production metrics events
  | 'production.quantity_reported'
  | 'production.scrap_recorded';

export interface EventDefinition {
  id: EventType;
  label: string;
  description: string;
  category: 'job' | 'part' | 'operation' | 'issue' | 'step' | 'production';
}

/**
 * Available events with metadata - shared across all integrations
 */
export const AVAILABLE_EVENTS: EventDefinition[] = [
  // Job lifecycle events
  { id: 'job.created', label: 'Job Created', description: 'When a new job is created via API', category: 'job' },
  { id: 'job.updated', label: 'Job Updated', description: 'When a job is modified', category: 'job' },
  { id: 'job.started', label: 'Job Started', description: 'When a job changes to in_progress', category: 'job' },
  { id: 'job.stopped', label: 'Job Stopped', description: 'When a job is put on hold', category: 'job' },
  { id: 'job.resumed', label: 'Job Resumed', description: 'When a paused job is resumed', category: 'job' },
  { id: 'job.completed', label: 'Job Completed', description: 'When a job is marked complete', category: 'job' },
  // Part lifecycle events
  { id: 'part.created', label: 'Part Created', description: 'When a new part is added to a job', category: 'part' },
  { id: 'part.updated', label: 'Part Updated', description: 'When a part is modified', category: 'part' },
  { id: 'part.started', label: 'Part Started', description: 'When work begins on a part', category: 'part' },
  { id: 'part.completed', label: 'Part Completed', description: 'When a part is fully processed', category: 'part' },
  // Operation lifecycle events
  { id: 'operation.started', label: 'Operation Started', description: 'When an operator starts an operation', category: 'operation' },
  { id: 'operation.paused', label: 'Operation Paused', description: 'When an operation is paused', category: 'operation' },
  { id: 'operation.resumed', label: 'Operation Resumed', description: 'When a paused operation is resumed', category: 'operation' },
  { id: 'operation.completed', label: 'Operation Completed', description: 'When an operation is marked complete', category: 'operation' },
  // Issue/NCR events
  { id: 'issue.created', label: 'Issue Created', description: 'When a quality issue or NCR is reported', category: 'issue' },
  { id: 'ncr.created', label: 'NCR Created', description: 'When a non-conformance report is created', category: 'issue' },
  { id: 'ncr.verified', label: 'NCR Verified', description: 'When an NCR is verified/resolved', category: 'issue' },
  // Step events
  { id: 'step.added', label: 'Step Added', description: 'When a step is added to an operation', category: 'step' },
  { id: 'step.completed', label: 'Step Completed', description: 'When a step is marked complete', category: 'step' },
  // Production events
  { id: 'production.quantity_reported', label: 'Quantity Reported', description: 'When production quantity is reported', category: 'production' },
  { id: 'production.scrap_recorded', label: 'Scrap Recorded', description: 'When scrap/defects are recorded', category: 'production' },
];

// ============================================================================
// Event Context (UNS topic variables)
// ============================================================================

/**
 * Context for building UNS topics and enriching event payloads
 * Based on ISA-95 hierarchy: Enterprise > Site > Area > Cell > Line > Operation
 */
export interface EventContext {
  // ISA-95 hierarchy (all optional, use what makes sense)
  enterprise?: string;    // Company/organization
  site?: string;          // Physical location/factory
  area?: string;          // Manufacturing area (e.g., "fabrication")
  cell?: string;          // QRM cell / work center (e.g., "laser_cutting")
  line?: string;          // Production line within cell
  operation?: string;     // Operation type/name

  // Additional context
  job_number?: string;
  part_number?: string;
  operator_name?: string;
}

// ============================================================================
// Payload Types
// ============================================================================

export interface EventPayload {
  [key: string]: unknown;
}

export interface DispatchResult {
  success: boolean;
  webhooksDispatched?: number;
  mqttPublished?: number;
  errors?: string[];
}

// ============================================================================
// Dispatch Functions
// ============================================================================

/**
 * Main dispatch function - sends events to all configured integrations
 *
 * @param tenantId - Tenant ID for multi-tenancy
 * @param eventType - The event type (e.g., 'operation.started')
 * @param data - Event payload data
 * @param context - Optional context for UNS topic building
 */
export async function dispatchEvent(
  tenantId: string,
  eventType: EventType,
  data: EventPayload,
  context?: EventContext
): Promise<DispatchResult> {
  const errors: string[] = [];
  let webhooksDispatched = 0;
  let mqttPublished = 0;

  // Dispatch to webhooks
  try {
    const webhookResult = await dispatchToWebhooks(tenantId, eventType, data);
    if (webhookResult.success) {
      webhooksDispatched = webhookResult.dispatched || 0;
    } else if (webhookResult.error) {
      errors.push(`Webhooks: ${webhookResult.error}`);
    }
  } catch (error) {
    errors.push(`Webhooks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Dispatch to MQTT
  try {
    const mqttResult = await dispatchToMqtt(tenantId, eventType, data, context);
    if (mqttResult.success) {
      mqttPublished = mqttResult.published || 0;
    } else if (mqttResult.error) {
      errors.push(`MQTT: ${mqttResult.error}`);
    }
  } catch (error) {
    errors.push(`MQTT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    success: errors.length === 0,
    webhooksDispatched,
    mqttPublished,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Dispatch to webhook endpoints
 */
async function dispatchToWebhooks(
  tenantId: string,
  eventType: EventType,
  data: EventPayload
): Promise<{ success: boolean; dispatched?: number; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vatgianzotsurljznsry.supabase.co';

    const response = await fetch(
      `${supabaseUrl}/functions/v1/webhook-dispatch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          event_type: eventType,
          data: data,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Webhook dispatch failed' };
    }

    return { success: true, dispatched: result.dispatched || 0 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Dispatch to MQTT brokers
 */
async function dispatchToMqtt(
  tenantId: string,
  eventType: EventType,
  data: EventPayload,
  context?: EventContext
): Promise<{ success: boolean; published?: number; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vatgianzotsurljznsry.supabase.co';

    const response = await fetch(
      `${supabaseUrl}/functions/v1/mqtt-publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          event_type: eventType,
          data: data,
          context: context,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'MQTT publish failed' };
    }

    return { success: true, published: result.published || 0 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Convenience Functions (typed wrappers for specific events)
// ============================================================================

/**
 * Dispatch operation.started event
 */
export async function dispatchOperationStarted(
  tenantId: string,
  data: {
    operation_id: string;
    operation_name: string;
    part_id: string;
    part_number: string;
    job_id: string;
    job_number: string;
    operator_id: string;
    operator_name: string;
    started_at: string;
  },
  context?: EventContext
) {
  return dispatchEvent(tenantId, 'operation.started', data, {
    ...context,
    operation: data.operation_name,
    job_number: data.job_number,
    part_number: data.part_number,
    operator_name: data.operator_name,
  });
}

/**
 * Dispatch operation.completed event
 */
export async function dispatchOperationCompleted(
  tenantId: string,
  data: {
    operation_id: string;
    operation_name: string;
    part_id: string;
    part_number: string;
    job_id: string;
    job_number: string;
    operator_id: string;
    operator_name: string;
    completed_at: string;
    actual_time: number;
    estimated_time: number;
  },
  context?: EventContext
) {
  return dispatchEvent(tenantId, 'operation.completed', data, {
    ...context,
    operation: data.operation_name,
    job_number: data.job_number,
    part_number: data.part_number,
    operator_name: data.operator_name,
  });
}

/**
 * Dispatch issue.created event
 */
export async function dispatchIssueCreated(
  tenantId: string,
  data: {
    issue_id: string;
    operation_id: string;
    operation_name: string;
    part_id: string;
    part_number: string;
    job_id: string;
    job_number: string;
    created_by: string;
    operator_name: string;
    severity: string;
    description: string;
    created_at: string;
  },
  context?: EventContext
) {
  return dispatchEvent(tenantId, 'issue.created', data, {
    ...context,
    operation: data.operation_name,
    job_number: data.job_number,
    part_number: data.part_number,
    operator_name: data.operator_name,
  });
}

/**
 * Dispatch job.created event
 */
export async function dispatchJobCreated(
  tenantId: string,
  data: {
    job_id: string;
    job_number: string;
    customer: string;
    parts_count: number;
    operations_count: number;
    created_at: string;
  },
  context?: EventContext
) {
  return dispatchEvent(tenantId, 'job.created', data, {
    ...context,
    job_number: data.job_number,
  });
}

/**
 * Dispatch production.quantity_reported event
 */
export async function dispatchQuantityReported(
  tenantId: string,
  data: {
    quantity_id: string;
    operation_id: string;
    operation_name: string;
    part_id: string;
    part_number: string;
    job_id: string;
    job_number: string;
    quantity_produced: number;
    quantity_good: number;
    quantity_scrap: number;
    quantity_rework: number;
    yield_percentage: number;
    recorded_by: string;
    recorded_by_name: string;
    recorded_at: string;
  },
  context?: EventContext
) {
  return dispatchEvent(tenantId, 'production.quantity_reported', data, {
    ...context,
    operation: data.operation_name,
    job_number: data.job_number,
    part_number: data.part_number,
  });
}

/**
 * Dispatch production.scrap_recorded event
 */
export async function dispatchScrapRecorded(
  tenantId: string,
  data: {
    quantity_id: string;
    operation_id: string;
    operation_name: string;
    part_id: string;
    part_number: string;
    job_id: string;
    job_number: string;
    quantity_scrap: number;
    scrap_reasons: Array<{
      reason_id: string;
      reason_code: string;
      reason_description: string;
      category: string;
      quantity: number;
    }>;
    recorded_by: string;
    recorded_by_name: string;
    recorded_at: string;
  },
  context?: EventContext
) {
  return dispatchEvent(tenantId, 'production.scrap_recorded', data, {
    ...context,
    operation: data.operation_name,
    job_number: data.job_number,
    part_number: data.part_number,
  });
}
