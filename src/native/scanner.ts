/**
 * Barcode/QR scanner abstraction.
 *
 * Native: ML Kit barcode scanner — fast, accurate, supports CODE_128/CODE_39/QR/DATA_MATRIX
 *         used for parts, jobs, batches, CNC programs.
 * Web:    falls back to BarcodeDetector API (Chromium ≥ 88) which works in dev on
 *         desktop with a webcam, and on Android Chrome. If neither is available
 *         the caller can prompt for manual entry via the UI.
 */

import { isNativeApp } from "./platform";

export type ScanFormat =
  | "QR_CODE"
  | "CODE_128"
  | "CODE_39"
  | "DATA_MATRIX"
  | "EAN_13"
  | "EAN_8"
  | "UPC_A"
  | "PDF_417"
  | "AZTEC";

export const DEFAULT_FORMATS: ScanFormat[] = [
  "QR_CODE",
  "CODE_128",
  "CODE_39",
  "DATA_MATRIX",
];

export interface ScanResult {
  value: string;
  format?: string;
}

export interface ScanOptions {
  formats?: ScanFormat[];
  /** Web-only: pass an element to mount the live preview into. */
  previewTarget?: HTMLElement | null;
  /**
   * Abort the in-flight scan. Web fallback: stops the `getUserMedia`
   * stream and removes the preview element so the camera indicator
   * goes away the moment the user closes the dialog.
   */
  signal?: AbortSignal;
}

/**
 * Throw when the caller invokes `scanOnce()` outside the native shell on a
 * device without `BarcodeDetector`. The mobile scanner page catches this and
 * shows a manual-entry fallback rather than failing silently.
 */
export class ScannerUnavailableError extends Error {
  constructor() {
    super("Camera scanner is only available in the native iOS / Android app.");
    this.name = "ScannerUnavailableError";
  }
}

/** Thrown when iOS / Android camera permission is declined. */
export class ScannerPermissionError extends Error {
  constructor() {
    super("Camera permission denied.");
    this.name = "ScannerPermissionError";
  }
}

interface CapacitorBarcodeScannerModule {
  BarcodeScanner: {
    isSupported: () => Promise<{ supported: boolean }>;
    requestPermissions: () => Promise<{ camera: string }>;
    scan: (opts?: { formats?: string[] }) => Promise<{
      barcodes: Array<{ rawValue: string; format: string }>;
    }>;
  };
}

export async function isScannerAvailable(): Promise<boolean> {
  if (isNativeApp()) {
    try {
      const mod = (await import(
        "@capacitor-mlkit/barcode-scanning"
      )) as unknown as CapacitorBarcodeScannerModule;
      const { supported } = await mod.BarcodeScanner.isSupported();
      return supported;
    } catch {
      return false;
    }
  }
  return typeof (window as unknown as { BarcodeDetector?: unknown })
    .BarcodeDetector !== "undefined";
}

async function ensurePermission(): Promise<boolean> {
  if (!isNativeApp()) return true;
  try {
    const mod = (await import(
      "@capacitor-mlkit/barcode-scanning"
    )) as unknown as CapacitorBarcodeScannerModule;
    const { camera } = await mod.BarcodeScanner.requestPermissions();
    return camera === "granted" || camera === "limited";
  } catch {
    return false;
  }
}

export async function scanOnce(
  opts: ScanOptions = {}
): Promise<ScanResult | null> {
  const formats = opts.formats?.length ? opts.formats : DEFAULT_FORMATS;

  if (isNativeApp()) {
    const ok = await ensurePermission();
    if (!ok) throw new ScannerPermissionError();
    const mod = (await import(
      "@capacitor-mlkit/barcode-scanning"
    )) as unknown as CapacitorBarcodeScannerModule;
    const { barcodes } = await mod.BarcodeScanner.scan({ formats });
    const first = barcodes?.[0];
    return first ? { value: first.rawValue, format: first.format } : null;
  }

  // Web fallback uses the BarcodeDetector API; if that's missing too, the
  // caller should branch on `isScannerAvailable()` first or catch this.
  if (
    typeof (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector ===
    "undefined"
  ) {
    throw new ScannerUnavailableError();
  }
  return scanWithBarcodeDetector(
    formats,
    opts.previewTarget ?? null,
    opts.signal,
  );
}

interface BarcodeDetectorCtor {
  new (opts: { formats: string[] }): {
    detect: (source: CanvasImageSource) => Promise<
      Array<{ rawValue: string; format: string }>
    >;
  };
}

async function scanWithBarcodeDetector(
  formats: ScanFormat[],
  preview: HTMLElement | null,
  signal?: AbortSignal,
): Promise<ScanResult | null> {
  const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector;
  if (!Ctor) throw new Error("Scanner unavailable on this platform");

  if (signal?.aborted) return null;

  const detector = new Ctor({
    formats: formats.map((f) => f.toLowerCase().replace(/_/g, "_")),
  });

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
  });
  const video = document.createElement("video");
  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  video.muted = true;
  if (preview) {
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
    preview.appendChild(video);
  }
  await video.play();

  const stop = () => {
    stream.getTracks().forEach((track) => track.stop());
    if (preview && video.parentNode === preview) preview.removeChild(video);
  };

  return new Promise<ScanResult | null>((resolve, reject) => {
    let raf = 0;
    let cancelled = false;
    let abortHandler: (() => void) | null = null;

    if (signal) {
      abortHandler = () => {
        cancelled = true;
        cancelAnimationFrame(raf);
        stop();
        resolve(null);
      };
      // If the caller aborts (e.g. user closes the dialog), tear down the
      // camera stream immediately so the OS indicator goes off and the
      // browser tab stops draining battery.
      if (signal.aborted) {
        abortHandler();
        return;
      }
      signal.addEventListener("abort", abortHandler, { once: true });
    }

    const tick = async () => {
      if (cancelled) return;
      try {
        const results = await detector.detect(video);
        if (results[0]) {
          cancelAnimationFrame(raf);
          if (abortHandler) signal?.removeEventListener("abort", abortHandler);
          stop();
          resolve({ value: results[0].rawValue, format: results[0].format });
          return;
        }
      } catch (err) {
        cancelAnimationFrame(raf);
        if (abortHandler) signal?.removeEventListener("abort", abortHandler);
        stop();
        reject(err);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      cancelAnimationFrame(raf);
      if (abortHandler) signal?.removeEventListener("abort", abortHandler);
      stop();
      resolve(null);
    }, 30_000);
  });
}
