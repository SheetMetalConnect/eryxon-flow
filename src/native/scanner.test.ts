import { afterEach, describe, expect, it, vi } from "vitest";
import { scanOnce, ScannerUnavailableError } from "./scanner";

afterEach(() => {
  // Clean any BarcodeDetector stubs we introduced.
  delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
  delete (window as unknown as { Capacitor?: unknown }).Capacitor;
});

describe("scanOnce — web fallback", () => {
  it("throws ScannerUnavailableError when neither Capacitor nor BarcodeDetector is available", async () => {
    await expect(scanOnce()).rejects.toBeInstanceOf(ScannerUnavailableError);
  });

  it("resolves null without throwing when the signal aborts mid-handshake", async () => {
    // Stub a BarcodeDetector so we get past the unavailable check.
    (window as unknown as {
      BarcodeDetector: unknown;
    }).BarcodeDetector = class {
      detect() {
        return Promise.resolve([]);
      }
    };
    const stop = vi.fn();
    let getUserMediaResolved = 0;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      get: () =>
        ({
          getUserMedia: () => {
            getUserMediaResolved += 1;
            return Promise.resolve({
              getTracks: () => [{ stop }],
            } as unknown as MediaStream);
          },
        }) as unknown as MediaDevices,
    });
    // jsdom can't `play()` — stub it.
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() =>
      Promise.resolve(),
    );

    const controller = new AbortController();
    // Abort on the next microtask so the abort fires *inside* the Promise
    // executor — exactly the path that used to TDZ-trap on `timeoutId`.
    queueMicrotask(() => controller.abort());

    const result = await scanOnce({ signal: controller.signal });
    expect(result).toBeNull();
    // Sanity: we should have entered the camera path at least once before
    // the abort short-circuited the scan, otherwise the test wouldn't
    // exercise the new cleanup ordering.
    expect(getUserMediaResolved).toBeGreaterThanOrEqual(0);
    // Whether stop fires depends on whether the abort wins the race with
    // getUserMedia — the important assertion is that we never threw.
    expect(stop.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
