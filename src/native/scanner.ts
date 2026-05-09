/**
 * Barcode/QR scanner abstraction.
 *
 * Native: ML Kit barcode scanner — fast, accurate, supports CODE_128/CODE_39/QR/DATA_MATRIX
 *         used for parts, jobs, batches, CNC programs.
 * Web:    falls back to BarcodeDetector API (Chromium ≥ 88) which works in dev on
 *         desktop with a webcam, and on Android Chrome. If neither is available
 *         the caller can prompt for manual entry via the UI.
 *
 * The web path holds an active `getUserMedia` stream for the duration of the
 * scan; callers MUST pass an AbortSignal (or be okay with the 30s timeout) so
 * the camera is released the moment the user dismisses the dialog.
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
  /** Web-only: element to mount the live preview into. */
  previewTarget?: HTMLElement | null;
  /** Cancel the scan early — releases the camera and resolves null. */
  signal?: AbortSignal;
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
    if (!ok) throw new Error("Camera permission denied");
    const mod = (await import(
      "@capacitor-mlkit/barcode-scanning"
    )) as unknown as CapacitorBarcodeScannerModule;
    const { barcodes } = await mod.BarcodeScanner.scan({ formats });
    const first = barcodes?.[0];
    return first ? { value: first.rawValue, format: first.format } : null;
  }

  return scanWithBarcodeDetector(formats, opts.previewTarget ?? null, opts.signal);
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
  signal: AbortSignal | undefined
): Promise<ScanResult | null> {
  const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector;
  if (!Ctor) throw new Error("Scanner unavailable on this platform");

  if (signal?.aborted) return null;

  const detector = new Ctor({
    formats: formats.map((f) => f.toLowerCase()),
  });

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
  });

  // If we got the permission prompt resolved AFTER the caller already aborted,
  // release the tracks immediately rather than leaving the indicator on.
  if (signal?.aborted) {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }

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
  await video.play().catch((): undefined => undefined);

  return new Promise<ScanResult | null>((resolve, reject) => {
    let raf = 0;
    let cleaned = false;
    // Declared up-front rather than const-at-the-bottom so that an early
    // signal.aborted path that calls cleanup() before the timeout is scheduled
    // doesn't trip TDZ. clearTimeout(undefined) is a safe no-op.
    let timeoutId: number | undefined = undefined;

    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      cancelAnimationFrame(raf);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      try {
        video.pause();
        video.srcObject = null;
      } catch {
        /* ignore — video is being torn down anyway */
      }
      stream.getTracks().forEach((t) => t.stop());
      if (preview && video.parentNode === preview) {
        preview.removeChild(video);
      }
      signal?.removeEventListener("abort", onAbort);
    }

    function onAbort() {
      cleanup();
      resolve(null);
    }

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    const tick = async () => {
      if (cleaned) return;
      try {
        const results = await detector.detect(video);
        if (cleaned) return;
        if (results[0]) {
          cleanup();
          resolve({ value: results[0].rawValue, format: results[0].format });
          return;
        }
      } catch (err) {
        cleanup();
        reject(err);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    timeoutId = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, 30_000);
  });
}
