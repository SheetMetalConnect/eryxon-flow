import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create a mock getSession function we can control
const mockGetSession = vi.fn();

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
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

describe('event-dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Reset to authenticated state by default
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-token',
          user: { id: 'test-user-id' },
        },
      },
      error: null,
    });
  });

  describe('AVAILABLE_EVENTS', () => {
    it('exports event definitions for all event types', async () => {
      const { AVAILABLE_EVENTS } = await import('./event-dispatch');

      expect(AVAILABLE_EVENTS.length).toBeGreaterThan(0);
      expect(AVAILABLE_EVENTS.every(e => e.id && e.label && e.description && e.category)).toBe(true);
    });

    it('has all job lifecycle events', async () => {
      const { AVAILABLE_EVENTS } = await import('./event-dispatch');
      const jobEvents = AVAILABLE_EVENTS.filter(e => e.category === 'job');

      expect(jobEvents.map(e => e.id)).toContain('job.created');
      expect(jobEvents.map(e => e.id)).toContain('job.completed');
    });

    it('has all operation lifecycle events', async () => {
      const { AVAILABLE_EVENTS } = await import('./event-dispatch');
      const operationEvents = AVAILABLE_EVENTS.filter(e => e.category === 'operation');

      expect(operationEvents.map(e => e.id)).toContain('operation.started');
      expect(operationEvents.map(e => e.id)).toContain('operation.paused');
      expect(operationEvents.map(e => e.id)).toContain('operation.resumed');
      expect(operationEvents.map(e => e.id)).toContain('operation.completed');
    });
  });

  describe('dispatchEvent', () => {
    it('returns error when no active session for webhooks', async () => {
      // Override to return no session
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { dispatchEvent } = await import('./event-dispatch');
      const result = await dispatchEvent('tenant-1', 'job.created', { id: 'test' });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.includes('Not authenticated'))).toBe(true);
    });

    it('dispatches to both webhooks and MQTT', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, dispatched: 1, published: 1 }),
      });

      const { dispatchEvent } = await import('./event-dispatch');
      await dispatchEvent('tenant-1', 'job.created', { job_id: 'test' });

      // Should call fetch twice - once for webhooks, once for MQTT
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify webhook call
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/webhook-dispatch'),
        expect.any(Object)
      );

      // Verify MQTT call
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/mqtt-publish'),
        expect.any(Object)
      );
    });

    it('includes context in MQTT dispatch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { dispatchEvent } = await import('./event-dispatch');
      await dispatchEvent(
        'tenant-1',
        'operation.started',
        { operation_id: 'op-1' },
        { cell: 'laser_cutting', job_number: 'WO-2025-001' }
      );

      // Find the MQTT call
      const mqttCall = mockFetch.mock.calls.find(
        call => call[0].includes('mqtt-publish')
      );
      expect(mqttCall).toBeDefined();

      const body = JSON.parse(mqttCall![1].body);
      expect(body.context).toBeDefined();
      expect(body.context.cell).toBe('laser_cutting');
      expect(body.context.job_number).toBe('WO-2025-001');
    });

    it('returns success when both dispatches succeed', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, dispatched: 2, published: 3 }),
      });

      const { dispatchEvent } = await import('./event-dispatch');
      const result = await dispatchEvent('tenant-1', 'job.created', {});

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('aggregates errors from failed dispatches', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Webhook failed' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'MQTT failed' }),
        });

      const { dispatchEvent } = await import('./event-dispatch');
      const result = await dispatchEvent('tenant-1', 'job.created', {});

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors?.some(e => e.includes('Webhook'))).toBe(true);
      expect(result.errors?.some(e => e.includes('MQTT'))).toBe(true);
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { dispatchEvent } = await import('./event-dispatch');
      const result = await dispatchEvent('tenant-1', 'job.created', {});

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('Network error'))).toBe(true);
    });
  });

  describe('dispatchOperationStarted', () => {
    it('dispatches operation.started event with correct data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { dispatchOperationStarted } = await import('./event-dispatch');
      await dispatchOperationStarted('tenant-1', {
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

      const webhookCall = mockFetch.mock.calls.find(
        call => call[0].includes('webhook-dispatch')
      );
      const body = JSON.parse(webhookCall![1].body);

      expect(body.event_type).toBe('operation.started');
      expect(body.data.operation_name).toBe('Lasersnijden');
      expect(body.data.operator_name).toBe('Jan de Vries');
    });

    it('enriches context with operation details', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { dispatchOperationStarted } = await import('./event-dispatch');
      await dispatchOperationStarted('tenant-1', {
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

      const mqttCall = mockFetch.mock.calls.find(
        call => call[0].includes('mqtt-publish')
      );
      const body = JSON.parse(mqttCall![1].body);

      expect(body.context.operation).toBe('Lasersnijden');
      expect(body.context.job_number).toBe('WO-2025-001');
      expect(body.context.part_number).toBe('HF-FRAME-001');
    });
  });

  describe('dispatchOperationCompleted', () => {
    it('includes timing data in payload', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { dispatchOperationCompleted } = await import('./event-dispatch');
      await dispatchOperationCompleted('tenant-1', {
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

      const webhookCall = mockFetch.mock.calls.find(
        call => call[0].includes('webhook-dispatch')
      );
      const body = JSON.parse(webhookCall![1].body);

      expect(body.event_type).toBe('operation.completed');
      expect(body.data.actual_time).toBe(120);
      expect(body.data.estimated_time).toBe(90);
    });
  });

  describe('dispatchOperationPaused', () => {
    it('dispatches operation.paused event', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { dispatchOperationPaused } = await import('./event-dispatch');
      await dispatchOperationPaused('tenant-1', {
        operation_id: 'op-1',
        operation_name: 'Lasersnijden',
        part_id: 'part-1',
        part_number: 'HF-FRAME-001',
        job_id: 'job-1',
        job_number: 'WO-2025-001',
        operator_id: 'user-1',
        operator_name: 'Jan de Vries',
        paused_at: '2025-01-06T09:00:00Z',
        time_entry_id: 'te-1',
      });

      const webhookCall = mockFetch.mock.calls.find(
        call => call[0].includes('webhook-dispatch')
      );
      const body = JSON.parse(webhookCall![1].body);

      expect(body.event_type).toBe('operation.paused');
      expect(body.data.time_entry_id).toBe('te-1');
    });
  });

  describe('dispatchOperationResumed', () => {
    it('includes pause duration in payload', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { dispatchOperationResumed } = await import('./event-dispatch');
      await dispatchOperationResumed('tenant-1', {
        operation_id: 'op-1',
        operation_name: 'Lasersnijden',
        part_id: 'part-1',
        part_number: 'HF-FRAME-001',
        job_id: 'job-1',
        job_number: 'WO-2025-001',
        operator_id: 'user-1',
        operator_name: 'Jan de Vries',
        resumed_at: '2025-01-06T09:30:00Z',
        time_entry_id: 'te-1',
        pause_duration_seconds: 1800,
      });

      const webhookCall = mockFetch.mock.calls.find(
        call => call[0].includes('webhook-dispatch')
      );
      const body = JSON.parse(webhookCall![1].body);

      expect(body.event_type).toBe('operation.resumed');
      expect(body.data.pause_duration_seconds).toBe(1800);
    });
  });

  describe('dispatchIssueCreated', () => {
    it('includes severity and description', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { dispatchIssueCreated } = await import('./event-dispatch');
      await dispatchIssueCreated('tenant-1', {
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

      const webhookCall = mockFetch.mock.calls.find(
        call => call[0].includes('webhook-dispatch')
      );
      const body = JSON.parse(webhookCall![1].body);

      expect(body.event_type).toBe('issue.created');
      expect(body.data.severity).toBe('high');
      expect(body.data.description).toBe('Material defect detected');
    });
  });

  describe('dispatchJobCreated', () => {
    it('includes job metadata', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { dispatchJobCreated } = await import('./event-dispatch');
      await dispatchJobCreated('tenant-1', {
        job_id: 'job-1',
        job_number: 'WO-2025-001',
        customer: 'Van den Berg B.V.',
        parts_count: 5,
        operations_count: 12,
        created_at: '2025-01-06T08:00:00Z',
      });

      const webhookCall = mockFetch.mock.calls.find(
        call => call[0].includes('webhook-dispatch')
      );
      const body = JSON.parse(webhookCall![1].body);

      expect(body.event_type).toBe('job.created');
      expect(body.data.parts_count).toBe(5);
      expect(body.data.operations_count).toBe(12);
    });
  });

  describe('dispatchQuantityReported', () => {
    it('includes yield percentage and quantities', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { dispatchQuantityReported } = await import('./event-dispatch');
      await dispatchQuantityReported('tenant-1', {
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

      const webhookCall = mockFetch.mock.calls.find(
        call => call[0].includes('webhook-dispatch')
      );
      const body = JSON.parse(webhookCall![1].body);

      expect(body.event_type).toBe('production.quantity_reported');
      expect(body.data.yield_percentage).toBe(95.0);
      expect(body.data.quantity_good).toBe(95);
      expect(body.data.quantity_scrap).toBe(3);
    });
  });

  describe('dispatchScrapRecorded', () => {
    it('includes scrap reasons array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { dispatchScrapRecorded } = await import('./event-dispatch');
      await dispatchScrapRecorded('tenant-1', {
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

      const webhookCall = mockFetch.mock.calls.find(
        call => call[0].includes('webhook-dispatch')
      );
      const body = JSON.parse(webhookCall![1].body);

      expect(body.event_type).toBe('production.scrap_recorded');
      expect(body.data.scrap_reasons).toHaveLength(2);
      expect(body.data.scrap_reasons[0].reason_code).toBe('MAT-01');
    });
  });
});
