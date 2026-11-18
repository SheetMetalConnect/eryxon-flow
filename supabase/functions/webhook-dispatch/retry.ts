export const WEBHOOK_MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 5000;

export interface AttemptResult {
  success: boolean;
  retryable: boolean;
  statusCode: number | null;
  responseText?: string;
  error?: string;
}

export interface DeliveryResult extends AttemptResult {
  attempts: number;
}

export function isRetryableStatus(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 429 || (statusCode >= 500 && statusCode < 600);
}

export function retryDelayMs(retryIndex: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** retryIndex, MAX_DELAY_MS);
}

export async function deliverWithRetry(
  attempt: () => Promise<AttemptResult>,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  maxAttempts = WEBHOOK_MAX_ATTEMPTS,
): Promise<DeliveryResult> {
  let result = await attempt();
  let attempts = 1;
  while (!result.success && result.retryable && attempts < maxAttempts) {
    await wait(retryDelayMs(attempts - 1));
    result = await attempt();
    attempts += 1;
  }
  return { ...result, attempts };
}
