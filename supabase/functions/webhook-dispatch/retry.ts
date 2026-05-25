export const DEFAULT_WEBHOOK_RETRY_ATTEMPTS = 3;

const BASE_WEBHOOK_RETRY_DELAY_MS = 500;
const MAX_WEBHOOK_RETRY_DELAY_MS = 2000;

export interface WebhookDeliveryAttemptResult {
  success: boolean;
  retryable: boolean;
  statusCode: number | null;
  responseText?: string;
  error?: string;
}

export interface WebhookDeliveryResult extends WebhookDeliveryAttemptResult {
  attempts: number;
  exhaustedRetries: boolean;
  previousFailures: string[];
}

interface RetryWebhookDeliveryOptions {
  maxAttempts?: number;
  wait?: (delayMs: number) => Promise<void>;
}

function waitForDelay(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function describeWebhookFailure(result: WebhookDeliveryAttemptResult): string {
  if (result.statusCode !== null) {
    return result.responseText
      ? `HTTP ${result.statusCode}: ${result.responseText}`
      : `HTTP ${result.statusCode}`;
  }

  return result.error ?? "Unknown error";
}

export function isRetryableWebhookStatusCode(statusCode: number): boolean {
  return (
    statusCode === 408 ||
    statusCode === 429 ||
    (statusCode >= 500 && statusCode < 600)
  );
}

export function calculateWebhookRetryDelayMs(retryIndex: number): number {
  return Math.min(
    BASE_WEBHOOK_RETRY_DELAY_MS * 2 ** retryIndex,
    MAX_WEBHOOK_RETRY_DELAY_MS,
  );
}

export async function retryWebhookDelivery(
  runAttempt: (attemptNumber: number) => Promise<WebhookDeliveryAttemptResult>,
  options: RetryWebhookDeliveryOptions = {},
): Promise<WebhookDeliveryResult> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_WEBHOOK_RETRY_ATTEMPTS;
  const wait = options.wait ?? waitForDelay;
  const previousFailures: string[] = [];

  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    const result = await runAttempt(attemptNumber);

    if (result.success) {
      return {
        ...result,
        attempts: attemptNumber,
        exhaustedRetries: false,
        previousFailures,
      };
    }

    const failureDescription = describeWebhookFailure(result);
    const hasRetryBudget = attemptNumber < maxAttempts;

    if (!result.retryable || !hasRetryBudget) {
      return {
        ...result,
        attempts: attemptNumber,
        exhaustedRetries: result.retryable && !hasRetryBudget,
        previousFailures,
      };
    }

    previousFailures.push(failureDescription);
    await wait(calculateWebhookRetryDelayMs(attemptNumber - 1));
  }

  throw new Error("retryWebhookDelivery reached an unexpected terminal state");
}

export function formatWebhookDeliveryLogMessage(
  result: WebhookDeliveryResult,
): string | null {
  if (result.success) {
    if (result.attempts === 1) {
      return null;
    }

    return `Recovered after ${result.attempts - 1} retries; final attempt ${result.attempts}/${DEFAULT_WEBHOOK_RETRY_ATTEMPTS} succeeded. Prior failures: ${result.previousFailures.join(" | ")}`;
  }

  const lastFailure = describeWebhookFailure(result);

  if (result.exhaustedRetries) {
    return `Exhausted retries after ${result.attempts} attempts. Last failure: ${lastFailure}. Prior failures: ${result.previousFailures.join(" | ")}`;
  }

  return lastFailure;
}
