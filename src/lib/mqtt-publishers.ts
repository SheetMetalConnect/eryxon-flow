import { supabase } from "@/integrations/supabase/client";

// Reuse the same event types as webhooks for consistency
export type MqttEvent =
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

export interface MqttEventData {
  [key: string]: unknown;
  cell_name?: string; // Optional cell name for UNS topic routing
}

/**
 * Triggers MQTT publish for the given event and data
 * This calls the mqtt-publish edge function which will publish
 * to all registered MQTT brokers subscribed to this event type
 */
export async function triggerMqttPublish(
  tenantId: string,
  eventType: MqttEvent,
  data: MqttEventData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No active session for MQTT publish');
      return { success: false, error: 'Not authenticated' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co';

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
          cell_name: data.cell_name,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('MQTT publish failed:', result);
      return { success: false, error: result.error || 'MQTT publish failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error triggering MQTT publish:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Triggers MQTT publish for operation.started event
 */
export async function triggerMqttOperationStarted(
  tenantId: string,
  operationData: {
    operation_id: string;
    operation_name: string;
    part_id: string;
    part_number: string;
    job_id: string;
    job_number: string;
    operator_id: string;
    operator_name: string;
    started_at: string;
    cell_name?: string;
  }
) {
  return triggerMqttPublish(tenantId, 'operation.started', operationData);
}

/**
 * Triggers MQTT publish for operation.completed event
 */
export async function triggerMqttOperationCompleted(
  tenantId: string,
  operationData: {
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
    cell_name?: string;
  }
) {
  return triggerMqttPublish(tenantId, 'operation.completed', operationData);
}

/**
 * Triggers MQTT publish for issue.created event
 */
export async function triggerMqttIssueCreated(
  tenantId: string,
  issueData: {
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
    cell_name?: string;
  }
) {
  return triggerMqttPublish(tenantId, 'issue.created', issueData);
}

/**
 * Triggers MQTT publish for job.created event
 */
export async function triggerMqttJobCreated(
  tenantId: string,
  jobData: {
    job_id: string;
    job_number: string;
    customer: string;
    parts_count: number;
    operations_count: number;
    created_at: string;
  }
) {
  return triggerMqttPublish(tenantId, 'job.created', jobData);
}

/**
 * Triggers MQTT publish for production.quantity_reported event
 */
export async function triggerMqttQuantityReported(
  tenantId: string,
  quantityData: {
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
    cell_name?: string;
  }
) {
  return triggerMqttPublish(tenantId, 'production.quantity_reported', quantityData);
}

/**
 * Triggers MQTT publish for production.scrap_recorded event
 */
export async function triggerMqttScrapRecorded(
  tenantId: string,
  scrapData: {
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
    cell_name?: string;
  }
) {
  return triggerMqttPublish(tenantId, 'production.scrap_recorded', scrapData);
}
