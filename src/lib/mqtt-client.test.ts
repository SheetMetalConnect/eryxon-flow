import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockFrom, mockInsert } = vi.hoisted(() => {
  const mockInsert = vi.fn();
  const mockFrom = vi.fn(() => ({ insert: mockInsert }));
  return { mockFrom, mockInsert };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  MqttClient,
  type MqttClientConfig,
  type MqttConnectionHealth,
} from './mqtt-client';

function createTestConfig(overrides?: Partial<MqttClientConfig>): MqttClientConfig {
  return {
    publisherId: 'pub-test-1',
    brokerUrl: 'mqtt://broker.example.com',
    port: 1883,
    topicPrefix: 'eryxon/main/production',
    retryAttempts: 3,
    retryDelaysMs: [0, 0, 0], // Zero delays for fast tests
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 30_000,
    ...overrides,
  };
}

describe('MqttClient', () => {
  let client: MqttClient;
  let mockPublishFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default Supabase mock: insert into mqtt_logs succeeds
    mockInsert.mockResolvedValue({ error: null });

    // Create a mock publish function that the client will use internally
    mockPublishFn = vi.fn().mockResolvedValue({ success: true });

    client = new MqttClient(createTestConfig());
    // Inject the mock transport
    client.setTransport(mockPublishFn);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts in disconnected state', () => {
      const freshClient = new MqttClient(createTestConfig());
      expect(freshClient.getHealth()).toEqual<MqttConnectionHealth>({
        status: 'disconnected',
        consecutiveFailures: 0,
        lastError: null,
        circuitOpenUntil: null,
      });
    });
  });

  describe('successful publish', () => {
    it('publishes a message and returns success', async () => {
      const result = await client.publish('operation/started', {
        operation_id: 'op-1',
      });

      expect(result.success).toBe(true);
      expect(mockPublishFn).toHaveBeenCalledTimes(1);
      expect(mockPublishFn).toHaveBeenCalledWith(
        'eryxon/main/production/operation/started',
        expect.objectContaining({ operation_id: 'op-1' })
      );
    });

    it('resets failure counter on successful publish', async () => {
      // Cause some failures first
      mockPublishFn
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockRejectedValueOnce(new Error('fail 3'));

      await client.publish('test/topic', { data: 1 });
      // That should have exhausted retries and failed

      // Now make it succeed
      mockPublishFn.mockResolvedValue({ success: true });

      const result = await client.publish('test/topic', { data: 2 });
      expect(result.success).toBe(true);
      expect(client.getHealth().consecutiveFailures).toBe(0);
    });
  });

  describe('retry logic', () => {
    it('retries on failure up to configured attempts', async () => {
      mockPublishFn
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce({ success: true });

      const result = await client.publish('test/topic', { data: 1 });

      expect(result.success).toBe(true);
      expect(mockPublishFn).toHaveBeenCalledTimes(3);
    });

    it('returns failure after all retry attempts exhausted', async () => {
      mockPublishFn
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockRejectedValueOnce(new Error('fail 3'));

      const result = await client.publish('test/topic', { data: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('fail 3');
      expect(mockPublishFn).toHaveBeenCalledTimes(3);
    });

    it('increments consecutive failures on exhausted retries', async () => {
      mockPublishFn.mockRejectedValue(new Error('persistent failure'));

      await client.publish('test/topic', { data: 1 });
      expect(client.getHealth().consecutiveFailures).toBe(1);

      await client.publish('test/topic', { data: 2 });
      expect(client.getHealth().consecutiveFailures).toBe(2);
    });
  });

  describe('circuit breaker', () => {
    it('opens circuit after threshold consecutive failures', async () => {
      mockPublishFn.mockRejectedValue(new Error('persistent failure'));

      // Cause 5 consecutive failures (threshold)
      for (let i = 0; i < 5; i++) {
        await client.publish('test/topic', { data: i });
      }

      const health = client.getHealth();
      expect(health.status).toBe('circuit_open');
      expect(health.consecutiveFailures).toBe(5);
      expect(health.circuitOpenUntil).not.toBeNull();
    });

    it('rejects immediately when circuit is open', async () => {
      mockPublishFn.mockRejectedValue(new Error('persistent failure'));

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await client.publish('test/topic', { data: i });
      }

      // Reset the mock to track new calls
      mockPublishFn.mockClear();
      mockPublishFn.mockResolvedValue({ success: true });

      const result = await client.publish('test/topic', { data: 'should-reject' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Circuit breaker open');
      // Should NOT have called the transport at all
      expect(mockPublishFn).not.toHaveBeenCalled();
    });

    it('transitions to half-open after reset timeout', async () => {
      const now = Date.now();
      const dateNowSpy = vi.spyOn(Date, 'now');

      // First phase: open the circuit at time T=0
      dateNowSpy.mockReturnValue(now);
      mockPublishFn.mockRejectedValue(new Error('persistent failure'));

      for (let i = 0; i < 5; i++) {
        await client.publish('test/topic', { data: i });
      }

      expect(client.getHealth().status).toBe('circuit_open');

      // Second phase: advance time past reset period (30s)
      dateNowSpy.mockReturnValue(now + 30_001);

      // Circuit should now be half-open: next publish should attempt
      mockPublishFn.mockClear();
      mockPublishFn.mockResolvedValue({ success: true });

      const result = await client.publish('test/topic', { data: 'probe' });

      expect(result.success).toBe(true);
      expect(mockPublishFn).toHaveBeenCalledTimes(1);
      expect(client.getHealth().status).toBe('connected');
      expect(client.getHealth().consecutiveFailures).toBe(0);

      dateNowSpy.mockRestore();
    });

    it('re-opens circuit if half-open probe fails', async () => {
      const now = Date.now();
      const dateNowSpy = vi.spyOn(Date, 'now');

      // Open the circuit at T=0
      dateNowSpy.mockReturnValue(now);
      mockPublishFn.mockRejectedValue(new Error('persistent failure'));

      for (let i = 0; i < 5; i++) {
        await client.publish('test/topic', { data: i });
      }

      // Advance past reset timeout
      dateNowSpy.mockReturnValue(now + 30_001);

      // Half-open probe fails
      mockPublishFn.mockClear();
      mockPublishFn.mockRejectedValue(new Error('still broken'));

      await client.publish('test/topic', { data: 'probe' });

      expect(client.getHealth().status).toBe('circuit_open');

      dateNowSpy.mockRestore();
    });

    it('successful publish resets failure counter and closes circuit', async () => {
      mockPublishFn.mockRejectedValue(new Error('fail'));

      // Get to 4 failures (one below threshold)
      for (let i = 0; i < 4; i++) {
        await client.publish('test/topic', { data: i });
      }

      expect(client.getHealth().consecutiveFailures).toBe(4);
      expect(client.getHealth().status).not.toBe('circuit_open');

      // Now succeed
      mockPublishFn.mockResolvedValue({ success: true });
      await client.publish('test/topic', { data: 'success' });

      expect(client.getHealth().consecutiveFailures).toBe(0);
      expect(client.getHealth().status).toBe('connected');
    });
  });

  describe('dead letter logging', () => {
    it('logs failed messages to mqtt_logs via Supabase', async () => {
      mockPublishFn.mockRejectedValue(new Error('publish failed'));

      await client.publish('operation/started', { operation_id: 'op-1' });

      expect(mockFrom).toHaveBeenCalledWith('mqtt_logs');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          mqtt_publisher_id: 'pub-test-1',
          event_type: 'operation/started',
          topic: 'eryxon/main/production/operation/started',
          payload: { operation_id: 'op-1' },
          success: false,
          error_message: 'publish failed',
        })
      );
    });

    it('logs successful messages to mqtt_logs', async () => {
      mockPublishFn.mockResolvedValue({ success: true });

      await client.publish('operation/started', { operation_id: 'op-1' });

      expect(mockFrom).toHaveBeenCalledWith('mqtt_logs');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          mqtt_publisher_id: 'pub-test-1',
          event_type: 'operation/started',
          topic: 'eryxon/main/production/operation/started',
          success: true,
          error_message: null,
        })
      );
    });

    it('includes latency in log entry', async () => {
      mockPublishFn.mockResolvedValue({ success: true });

      await client.publish('test/topic', { data: 1 });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          latency_ms: expect.any(Number),
        })
      );
    });
  });

  describe('topic construction', () => {
    it('prepends topic prefix to event topic', async () => {
      mockPublishFn.mockResolvedValue({ success: true });

      await client.publish('laser_cutting/operation/started', { id: '1' });

      expect(mockPublishFn).toHaveBeenCalledWith(
        'eryxon/main/production/laser_cutting/operation/started',
        expect.any(Object)
      );
    });

    it('handles empty topic prefix', async () => {
      const noPrefix = new MqttClient(createTestConfig({ topicPrefix: '' }));
      noPrefix.setTransport(mockPublishFn);
      mockPublishFn.mockResolvedValue({ success: true });

      await noPrefix.publish('operation/started', { id: '1' });

      expect(mockPublishFn).toHaveBeenCalledWith(
        'operation/started',
        expect.any(Object)
      );
    });
  });

  describe('configuration', () => {
    it('uses custom retry delays', async () => {
      const customClient = new MqttClient(
        createTestConfig({
          retryAttempts: 2,
          retryDelaysMs: [0, 0],
        })
      );
      customClient.setTransport(mockPublishFn);

      mockPublishFn
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'));

      await customClient.publish('test/topic', { data: 1 });

      // Should have attempted exactly 2 times
      expect(mockPublishFn).toHaveBeenCalledTimes(2);
    });

    it('uses custom circuit breaker threshold', async () => {
      const customClient = new MqttClient(
        createTestConfig({ circuitBreakerThreshold: 2 })
      );
      customClient.setTransport(mockPublishFn);

      mockPublishFn.mockRejectedValue(new Error('fail'));

      await customClient.publish('t', { d: 1 });
      await customClient.publish('t', { d: 2 });

      expect(customClient.getHealth().status).toBe('circuit_open');
    });
  });
});
