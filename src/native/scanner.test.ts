import { afterEach, describe, expect, it } from "vitest";
import { isScannerAvailable, scanOnce, ScannerUnavailableError } from "./scanner";

afterEach(() => {
  // Clean any platform stubs we introduced.
  delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
  delete (window as unknown as { Capacitor?: unknown }).Capacitor;
});

describe("web/PWA scanner posture", () => {
  it("reports the scanner as unavailable on the web", async () => {
    // Hosted deployments lock the camera via Permissions-Policy, so the web
    // must never claim a live scanner — even if BarcodeDetector exists.
    await expect(isScannerAvailable()).resolves.toBe(false);
  });

  it("still reports unavailable even when BarcodeDetector is present", async () => {
    (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector =
      class {
        detect() {
          return Promise.resolve([]);
        }
      };
    await expect(isScannerAvailable()).resolves.toBe(false);
  });

  it("throws ScannerUnavailableError from scanOnce on the web", async () => {
    await expect(scanOnce()).rejects.toBeInstanceOf(ScannerUnavailableError);
  });

  it("throws without attempting getUserMedia, even with a camera API present", async () => {
    // Prove the web path never reaches the camera: if scanOnce touched
    // getUserMedia this spy would record a call. It must stay at zero.
    let getUserMediaCalls = 0;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      get: () =>
        ({
          getUserMedia: () => {
            getUserMediaCalls += 1;
            return Promise.reject(new Error("camera should never be opened"));
          },
        }) as unknown as MediaDevices,
    });
    (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector =
      class {
        detect() {
          return Promise.resolve([]);
        }
      };

    await expect(scanOnce()).rejects.toBeInstanceOf(ScannerUnavailableError);
    expect(getUserMediaCalls).toBe(0);
  });
});
