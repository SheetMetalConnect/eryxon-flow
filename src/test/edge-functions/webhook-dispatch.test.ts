import { describe, expect, it, vi } from "vitest";
import { WEBHOOK_MAX_ATTEMPTS, deliverWithRetry, isRetryableStatus, retryDelayMs } from "../../../supabase/functions/webhook-dispatch/retry.ts";
import { isAllowedTarget, signWebhook } from "../../../supabase/functions/webhook-dispatch/sign.ts";
import { createHmac } from "node:crypto";

describe("retry policy", () => {
  it("retries only transient statuses", () => {
    expect([408, 429, 500, 503].every(isRetryableStatus)).toBe(true);
    expect([200, 400, 401, 404].some(isRetryableStatus)).toBe(false);
  });

  it("backs off exponentially with a cap", () => {
    expect([0, 1, 2, 3, 4].map(retryDelayMs)).toEqual([500, 1000, 2000, 4000, 5000]);
  });

  it("recovers after a transient failure", async () => {
    const wait = vi.fn(() => Promise.resolve());
    const attempt = vi.fn()
      .mockResolvedValueOnce({ success: false, retryable: true, statusCode: 503 })
      .mockResolvedValueOnce({ success: true, retryable: false, statusCode: 200 });
    expect(await deliverWithRetry(attempt, wait)).toMatchObject({ success: true, attempts: 2 });
    expect(wait).toHaveBeenCalledWith(500);
  });

  it("does not retry a 4xx and stops at the budget", async () => {
    const wait = vi.fn(() => Promise.resolve());
    expect(await deliverWithRetry(() => Promise.resolve({ success: false, retryable: false, statusCode: 400 }), wait)).toMatchObject({ attempts: 1 });
    expect(wait).not.toHaveBeenCalled();
    const timeout = vi.fn(() => Promise.resolve({ success: false, retryable: true, statusCode: null, error: "timeout" }));
    expect(await deliverWithRetry(timeout, wait)).toMatchObject({ attempts: WEBHOOK_MAX_ATTEMPTS });
  });
});

describe("signature", () => {
  it("is t=<ts>,v1=<hmac(secret, ts.body)> and verifiable with node crypto", async () => {
    const header = await signWebhook("s3cret", '{"event":"job.created"}', 1700000000);
    const expected = createHmac("sha256", "s3cret").update('1700000000.{"event":"job.created"}').digest("hex");
    expect(header).toBe(`t=1700000000,v1=${expected}`);
  });
});

describe("target guard", () => {
  it("blocks private networks and plain http on hosted instances", () => {
    expect(isAllowedTarget("https://erp.example.com/hook", false)).toBe(true);
    for (const url of ["http://erp.example.com", "https://localhost/x", "https://127.0.0.1/x", "https://10.1.2.3/x", "https://192.168.1.5/x", "https://172.20.0.1/x", "https://[::1]/x", "https://printer.local/x", "not a url"]) {
      expect(isAllowedTarget(url, false), url).toBe(false);
    }
    expect(isAllowedTarget("https://192.168.1.5/x", true)).toBe(true);
  });
});
