import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_WEBHOOK_RETRY_ATTEMPTS,
  calculateWebhookRetryDelayMs,
  formatWebhookDeliveryLogMessage,
  isRetryableWebhookStatusCode,
  retryWebhookDelivery,
} from "../../../supabase/functions/webhook-dispatch/retry.ts";

describe("webhook-dispatch retry policy", () => {
  it("retries only transient HTTP statuses", () => {
    expect(isRetryableWebhookStatusCode(408)).toBe(true);
    expect(isRetryableWebhookStatusCode(429)).toBe(true);
    expect(isRetryableWebhookStatusCode(500)).toBe(true);
    expect(isRetryableWebhookStatusCode(503)).toBe(true);

    expect(isRetryableWebhookStatusCode(200)).toBe(false);
    expect(isRetryableWebhookStatusCode(400)).toBe(false);
    expect(isRetryableWebhookStatusCode(401)).toBe(false);
    expect(isRetryableWebhookStatusCode(404)).toBe(false);
    expect(isRetryableWebhookStatusCode(600)).toBe(false);
  });

  it("uses exponential backoff with a cap", () => {
    expect(calculateWebhookRetryDelayMs(0)).toBe(500);
    expect(calculateWebhookRetryDelayMs(1)).toBe(1000);
    expect(calculateWebhookRetryDelayMs(2)).toBe(2000);
    expect(calculateWebhookRetryDelayMs(3)).toBe(2000);
  });
});

describe("retryWebhookDelivery", () => {
  it("retries a transient failure and returns the recovered result", async () => {
    const wait = vi.fn(() => Promise.resolve());
    const runAttempt = vi
      .fn()
      .mockResolvedValueOnce({
        success: false,
        retryable: true,
        statusCode: 503,
        responseText: "upstream unavailable",
      })
      .mockResolvedValueOnce({
        success: true,
        retryable: false,
        statusCode: 200,
        responseText: "ok",
      });

    const result = await retryWebhookDelivery(runAttempt, { wait });

    expect(runAttempt).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledWith(500);
    expect(result).toEqual({
      success: true,
      retryable: false,
      statusCode: 200,
      responseText: "ok",
      attempts: 2,
      exhaustedRetries: false,
      previousFailures: ["HTTP 503: upstream unavailable"],
    });
  });

  it("does not retry non-transient failures", async () => {
    const wait = vi.fn(() => Promise.resolve());
    const runAttempt = vi.fn().mockResolvedValue({
      success: false,
      retryable: false,
      statusCode: 400,
      responseText: "bad request",
    });

    const result = await retryWebhookDelivery(runAttempt, { wait });

    expect(runAttempt).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      retryable: false,
      statusCode: 400,
      responseText: "bad request",
      attempts: 1,
      exhaustedRetries: false,
      previousFailures: [],
    });
  });

  it("stops after the retry budget is exhausted", async () => {
    const wait = vi.fn(() => Promise.resolve());
    const runAttempt = vi.fn().mockResolvedValue({
      success: false,
      retryable: true,
      error: "network timeout",
      statusCode: null,
    });

    const result = await retryWebhookDelivery(runAttempt, { wait });

    expect(runAttempt).toHaveBeenCalledTimes(DEFAULT_WEBHOOK_RETRY_ATTEMPTS);
    expect(wait).toHaveBeenCalledTimes(DEFAULT_WEBHOOK_RETRY_ATTEMPTS - 1);
    expect(result).toEqual({
      success: false,
      retryable: true,
      error: "network timeout",
      statusCode: null,
      attempts: DEFAULT_WEBHOOK_RETRY_ATTEMPTS,
      exhaustedRetries: true,
      previousFailures: [
        "network timeout",
        "network timeout",
      ],
    });
  });
});

describe("formatWebhookDeliveryLogMessage", () => {
  it("describes recovered deliveries after retries", () => {
    expect(
      formatWebhookDeliveryLogMessage({
        success: true,
        retryable: false,
        statusCode: 200,
        responseText: "ok",
        attempts: 3,
        exhaustedRetries: false,
        previousFailures: ["HTTP 503: upstream unavailable", "network timeout"],
      })
    ).toBe(
      "Recovered after 2 retries; final attempt 3/3 succeeded. Prior failures: HTTP 503: upstream unavailable | network timeout"
    );
  });

  it("describes exhausted retry budgets", () => {
    expect(
      formatWebhookDeliveryLogMessage({
        success: false,
        retryable: true,
        error: "network timeout",
        statusCode: null,
        attempts: DEFAULT_WEBHOOK_RETRY_ATTEMPTS,
        exhaustedRetries: true,
        previousFailures: ["network timeout", "network timeout"],
      })
    ).toBe(
      "Exhausted retries after 3 attempts. Last failure: network timeout. Prior failures: network timeout | network timeout"
    );
  });
});
