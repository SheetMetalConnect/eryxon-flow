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

  return scanWithBarcodeDetector(formats, opts.previewTarget ?? null);
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
  preview: HTMLElement | null
): Promise<ScanResult | null> {
  const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector;
  if (!Ctor) throw new Error("Scanner unavailable on this platform");

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

  const stop = () => stream.getTracks().forEach((t) => t.stop());

  return new Promise<ScanResult | null>((resolve, reject) => {
    let raf = 0;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const results = await detector.detect(video);
        if (results[0]) {
          cancelAnimationFrame(raf);
          stop();
          if (preview) preview.removeChild(video);
          resolve({ value: results[0].rawValue, format: results[0].format });
          return;
        }
      } catch (err) {
        cancelAnimationFrame(raf);
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
      stop();
      if (preview && video.parentNode === preview) preview.removeChild(video);
      resolve(null);
    }, 30_000);
  });
}
