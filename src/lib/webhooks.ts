import { supabase } from "@/integrations/supabase/client";

export type WebhookEvent =
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
  | 'step.completed';

export interface WebhookData {
  [key: string]: any;
}

/**
 * Triggers a webhook dispatch for the given event and data
 * This calls the webhook-dispatch edge function which will send webhooks
 * to all registered endpoints subscribed to this event type
 */
export async function triggerWebhook(
  tenantId: string,
  eventType: WebhookEvent,
  data: WebhookData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No active session for webhook dispatch');
      return { success: false, error: 'Not authenticated' };
    }

    // Get Supabase URL from environment or construct from current origin
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
      console.error('Webhook dispatch failed:', result);
      return { success: false, error: result.error || 'Webhook dispatch failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error triggering webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Triggers an operation.started webhook
 */
export async function triggerOperationStartedWebhook(
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
  }
) {
  return triggerWebhook(tenantId, 'operation.started', operationData);
}

/**
 * Triggers an operation.completed webhook
 */
export async function triggerOperationCompletedWebhook(
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
  }
) {
  return triggerWebhook(tenantId, 'operation.completed', operationData);
}

/**
 * Triggers an issue.created webhook
 */
export async function triggerIssueCreatedWebhook(
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
  }
) {
  return triggerWebhook(tenantId, 'issue.created', issueData);
}

/**
 * Triggers a job.created webhook (for API integrations)
 */
export async function triggerJobCreatedWebhook(
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
  return triggerWebhook(tenantId, 'job.created', jobData);
}
