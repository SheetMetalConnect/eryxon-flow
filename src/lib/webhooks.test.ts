import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
            user: { id: 'test-user-id' },
          },
        },
        error: null,
      }),
    },
  },
}));

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
    },
  },
});

describe('webhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('WebhookEvent types', () => {
    it('has all expected job lifecycle events', () => {
      const jobEvents = [
        'job.created',
        'job.updated',
        'job.started',
        'job.stopped',
        'job.resumed',
        'job.completed',
      ];
      expect(jobEvents).toHaveLength(6);
    });

    it('has all expected part lifecycle events', () => {
      const partEvents = [
        'part.created',
        'part.updated',
        'part.started',
        'part.completed',
      ];
      expect(partEvents).toHaveLength(4);
    });

    it('has all expected operation lifecycle events', () => {
      const operationEvents = [
        'operation.started',
        'operation.paused',
        'operation.resumed',
        'operation.completed',
      ];
      expect(operationEvents).toHaveLength(4);
    });

    it('has all expected issue and NCR events', () => {
      const issueEvents = [
        'issue.created',
        'ncr.created',
        'ncr.verified',
      ];
      expect(issueEvents).toHaveLength(3);
    });

    it('has all expected step events', () => {
      const stepEvents = [
        'step.added',
        'step.completed',
      ];
      expect(stepEvents).toHaveLength(2);
    });

    it('has all expected production metrics events', () => {
      const productionEvents = [
        'production.quantity_reported',
        'production.scrap_recorded',
      ];
      expect(productionEvents).toHaveLength(2);
    });
  });

  describe('triggerWebhook', () => {
    it('returns error when no active session', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const { triggerWebhook } = await import('./webhooks');
      const result = await triggerWebhook('tenant-1', 'job.created', { id: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('makes POST request to webhook-dispatch endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { triggerWebhook } = await import('./webhooks');
      await triggerWebhook('tenant-1', 'job.created', { job_id: 'test' });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/webhook-dispatch'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });

    it('includes correct payload in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { triggerWebhook } = await import('./webhooks');
      const testData = { job_id: 'job-123', job_number: 'WO-2025-001' };
      await triggerWebhook('tenant-1', 'job.created', testData);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body).toEqual({
        tenant_id: 'tenant-1',
        event_type: 'job.created',
        data: testData,
      });
    });

    it('returns success when dispatch succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { triggerWebhook } = await import('./webhooks');
      const result = await triggerWebhook('tenant-1', 'job.created', {});

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns error when dispatch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Dispatch failed' }),
      });

      const { triggerWebhook } = await import('./webhooks');
      const result = await triggerWebhook('tenant-1', 'job.created', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Dispatch failed');
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { triggerWebhook } = await import('./webhooks');
      const result = await triggerWebhook('tenant-1', 'job.created', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('handles non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      const { triggerWebhook } = await import('./webhooks');
      const result = await triggerWebhook('tenant-1', 'job.created', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('triggerOperationStartedWebhook', () => {
    it('calls triggerWebhook with correct event type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { triggerOperationStartedWebhook } = await import('./webhooks');
      await triggerOperationStartedWebhook('tenant-1', {
        operation_id: 'op-1',
        operation_name: 'Lasersnijden',
        part_id: 'part-1',
        part_number: 'HF-FRAME-001',
        job_id: 'job-1',
        job_number: 'WO-2025-001',
        operator_id: 'user-1',
        operator_name: 'Jan de Vries',
        started_at: '2025-01-06T08:00:00Z',
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.event_type).toBe('operation.started');
    });
  });

  describe('triggerOperationCompletedWebhook', () => {
    it('includes timing data in payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { triggerOperationCompletedWebhook } = await import('./webhooks');
      await triggerOperationCompletedWebhook('tenant-1', {
        operation_id: 'op-1',
        operation_name: 'Lasersnijden',
        part_id: 'part-1',
        part_number: 'HF-FRAME-001',
        job_id: 'job-1',
        job_number: 'WO-2025-001',
        operator_id: 'user-1',
        operator_name: 'Jan de Vries',
        completed_at: '2025-01-06T10:00:00Z',
        actual_time: 120,
        estimated_time: 90,
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.event_type).toBe('operation.completed');
      expect(body.data.actual_time).toBe(120);
      expect(body.data.estimated_time).toBe(90);
    });
  });

  describe('triggerIssueCreatedWebhook', () => {
    it('includes severity and description', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { triggerIssueCreatedWebhook } = await import('./webhooks');
      await triggerIssueCreatedWebhook('tenant-1', {
        issue_id: 'issue-1',
        operation_id: 'op-1',
        operation_name: 'Lasersnijden',
        part_id: 'part-1',
        part_number: 'HF-FRAME-001',
        job_id: 'job-1',
        job_number: 'WO-2025-001',
        created_by: 'user-1',
        operator_name: 'Jan de Vries',
        severity: 'high',
        description: 'Material defect detected',
        created_at: '2025-01-06T09:00:00Z',
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.event_type).toBe('issue.created');
      expect(body.data.severity).toBe('high');
      expect(body.data.description).toBe('Material defect detected');
    });
  });

  describe('triggerJobCreatedWebhook', () => {
    it('includes job metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { triggerJobCreatedWebhook } = await import('./webhooks');
      await triggerJobCreatedWebhook('tenant-1', {
        job_id: 'job-1',
        job_number: 'WO-2025-001',
        customer: 'Van den Berg B.V.',
        parts_count: 5,
        operations_count: 12,
        created_at: '2025-01-06T08:00:00Z',
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.event_type).toBe('job.created');
      expect(body.data.parts_count).toBe(5);
      expect(body.data.operations_count).toBe(12);
    });
  });

  describe('triggerQuantityReportedWebhook', () => {
    it('includes yield percentage', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { triggerQuantityReportedWebhook } = await import('./webhooks');
      await triggerQuantityReportedWebhook('tenant-1', {
        quantity_id: 'qty-1',
        operation_id: 'op-1',
        operation_name: 'Lasersnijden',
        part_id: 'part-1',
        part_number: 'HF-FRAME-001',
        job_id: 'job-1',
        job_number: 'WO-2025-001',
        quantity_produced: 100,
        quantity_good: 95,
        quantity_scrap: 3,
        quantity_rework: 2,
        yield_percentage: 95.0,
        recorded_by: 'user-1',
        recorded_by_name: 'Jan de Vries',
        recorded_at: '2025-01-06T10:00:00Z',
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.event_type).toBe('production.quantity_reported');
      expect(body.data.yield_percentage).toBe(95.0);
      expect(body.data.quantity_scrap).toBe(3);
    });
  });

  describe('triggerScrapRecordedWebhook', () => {
    it('includes scrap reasons array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { triggerScrapRecordedWebhook } = await import('./webhooks');
      await triggerScrapRecordedWebhook('tenant-1', {
        quantity_id: 'qty-1',
        operation_id: 'op-1',
        operation_name: 'Lasersnijden',
        part_id: 'part-1',
        part_number: 'HF-FRAME-001',
        job_id: 'job-1',
        job_number: 'WO-2025-001',
        quantity_scrap: 5,
        scrap_reasons: [
          {
            reason_id: 'reason-1',
            reason_code: 'MAT-01',
            reason_description: 'Material defect',
            category: 'material',
            quantity: 3,
          },
          {
            reason_id: 'reason-2',
            reason_code: 'OPR-02',
            reason_description: 'Operator error',
            category: 'operator',
            quantity: 2,
          },
        ],
        recorded_by: 'user-1',
        recorded_by_name: 'Jan de Vries',
        recorded_at: '2025-01-06T10:00:00Z',
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.event_type).toBe('production.scrap_recorded');
      expect(body.data.scrap_reasons).toHaveLength(2);
      expect(body.data.scrap_reasons[0].reason_code).toBe('MAT-01');
    });
  });
});
