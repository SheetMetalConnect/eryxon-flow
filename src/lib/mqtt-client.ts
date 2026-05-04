import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * MQTT Client with retry, circuit breaker, and dead letter logging.
 *
 * This client wraps an MQTT transport function with production hardening:
 * - Exponential backoff retry on publish (configurable attempts and delays)
 * - Circuit breaker: after N consecutive failures, open circuit for M seconds
 * - Dead letter logging: all publish attempts logged to mqtt_logs via Supabase
 * - Connection health state tracking
 *
 * The actual MQTT transport is injected via setTransport() to allow testing
 * and to decouple from the MQTT.js library.
 */

export type MqttConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'circuit_open';

export interface MqttConnectionHealth {
  status: MqttConnectionStatus;
  consecutiveFailures: number;
  lastError: string | null;
  circuitOpenUntil: number | null;
}

export interface MqttClientConfig {
  /** ID of the mqtt_publishers row this client represents */
  publisherId: string;
  /** Broker URL (e.g., mqtt://broker.example.com) */
  brokerUrl: string;
  /** Broker port */
  port: number;
  /** Optional username for broker auth */
  username?: string;
  /** Optional password for broker auth */
  password?: string;
  /** Topic prefix prepended to all publish topics (ISA-95 hierarchy) */
  topicPrefix: string;
  /** Use TLS connection */
  useTls?: boolean;
  /** Number of retry attempts per publish (default: 3) */
  retryAttempts: number;
  /** Delay in ms between each retry attempt (default: [1000, 2000, 4000]) */
  retryDelaysMs: number[];
  /** Number of consecutive failures before opening circuit (default: 5) */
  circuitBreakerThreshold: number;
  /** Time in ms before half-open retry after circuit opens (default: 30000) */
  circuitBreakerResetMs: number;
}

export interface PublishResult {
  success: boolean;
  error?: string;
  attempts?: number;
}

/**
 * Transport function signature. The actual MQTT.js publish call
 * should be wrapped in a function matching this type.
 */
export type MqttTransportFn = (
  topic: string,
  payload: Record<string, unknown>
) => Promise<{ success: boolean }>;

export class MqttClient {
  private config: MqttClientConfig;
  private transport: MqttTransportFn | null = null;
  private consecutiveFailures = 0;
  private lastError: string | null = null;
  private circuitOpenUntil: number | null = null;

  constructor(config: MqttClientConfig) {
    this.config = config;
  }

  /**
   * Inject the transport function used to actually publish MQTT messages.
   * This decouples the retry/circuit-breaker logic from the MQTT.js library.
   */
  setTransport(fn: MqttTransportFn): void {
    this.transport = fn;
  }

  /**
   * Get the current connection health state.
   */
  getHealth(): MqttConnectionHealth {
    return {
      status: this.getStatus(),
      consecutiveFailures: this.consecutiveFailures,
      lastError: this.lastError,
      circuitOpenUntil: this.circuitOpenUntil,
    };
  }

  /**
   * Publish a message to the MQTT broker with retry and circuit breaker.
   *
   * @param eventTopic - Topic suffix appended to the configured prefix
   * @param payload - JSON payload to publish
   */
  async publish(
    eventTopic: string,
    payload: Record<string, unknown>
  ): Promise<PublishResult> {
    const fullTopic = this.buildTopic(eventTopic);
    const startTime = performance.now();

    // Circuit breaker check
    if (this.isCircuitOpen()) {
      const result: PublishResult = {
        success: false,
        error: `Circuit breaker open until ${new Date(this.circuitOpenUntil!).toISOString()}`,
        attempts: 0,
      };
      await this.logToDeadLetter(eventTopic, fullTopic, payload, false, result.error!, startTime);
      return result;
    }

    if (!this.transport) {
      const error = 'No transport configured';
      await this.logToDeadLetter(eventTopic, fullTopic, payload, false, error, startTime);
      return { success: false, error, attempts: 0 };
    }

    // Attempt publish with retries
    let lastError: string | null = null;
    const maxAttempts = this.config.retryAttempts;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await this.transport(fullTopic, payload);

        // Success: reset failures, log, return
        this.consecutiveFailures = 0;
        this.lastError = null;
        this.circuitOpenUntil = null;

        const latencyMs = Math.round(performance.now() - startTime);
        await this.logToDeadLetter(eventTopic, fullTopic, payload, true, null, startTime);

        logger.debug('MqttClient', `Published to ${fullTopic}`, { latencyMs });

        return { success: true, attempts: attempt + 1 };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('MqttClient', `Publish attempt ${attempt + 1}/${maxAttempts} failed: ${lastError}`);

        // Wait before retry (except on last attempt)
        if (attempt < maxAttempts - 1) {
          const delay = this.config.retryDelaysMs[attempt] ?? 1000;
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    this.consecutiveFailures++;
    this.lastError = lastError;

    // Check if we should open the circuit
    if (this.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      this.circuitOpenUntil = Date.now() + this.config.circuitBreakerResetMs;
      logger.error('MqttClient', `Circuit breaker opened after ${this.consecutiveFailures} consecutive failures`);
    }

    await this.logToDeadLetter(eventTopic, fullTopic, payload, false, lastError, startTime);

    return {
      success: false,
      error: lastError ?? 'Unknown error',
      attempts: maxAttempts,
    };
  }

  private buildTopic(eventTopic: string): string {
    if (!this.config.topicPrefix) {
      return eventTopic;
    }
    return `${this.config.topicPrefix}/${eventTopic}`;
  }

  private getStatus(): MqttConnectionStatus {
    if (this.isCircuitOpen()) {
      return 'circuit_open';
    }
    if (this.consecutiveFailures > 0) {
      return 'reconnecting';
    }
    if (!this.transport) {
      return 'disconnected';
    }
    return 'connected';
  }

  private isCircuitOpen(): boolean {
    if (this.circuitOpenUntil === null) {
      return false;
    }
    if (Date.now() > this.circuitOpenUntil) {
      // Reset to half-open: allow one probe
      return false;
    }
    return true;
  }

  private async logToDeadLetter(
    eventType: string,
    topic: string,
    payload: Record<string, unknown>,
    success: boolean,
    errorMessage: string | null,
    startTime: number
  ): Promise<void> {
    const latencyMs = Math.round(performance.now() - startTime);

    try {
      await supabase.from('mqtt_logs').insert({
        mqtt_publisher_id: this.config.publisherId,
        event_type: eventType,
        topic,
        payload: payload as unknown as Record<string, unknown>,
        success,
        error_message: errorMessage ?? null,
        latency_ms: latencyMs,
      });
    } catch (error) {
      // Don't let logging failures break the publish flow
      logger.error('MqttClient', 'Failed to log to mqtt_logs', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
