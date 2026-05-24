/**
 * Barcode/QR scanner abstraction.
 *
 * Native: ML Kit barcode scanner — fast, accurate, supports CODE_128/CODE_39/QR/DATA_MATRIX
 *         used for parts, jobs, batches, CNC programs. iOS and Android both.
 * Web/PWA: no live scanner. Hosted deployments ship `Permissions-Policy: camera=()`
 *          (see `vercel.json` / `public/_headers`), so any `getUserMedia()` call
 *          is blocked by policy. Rather than promise a camera path that fails the
 *          moment the user grants it, we report the scanner as unavailable on the
 *          web and the caller falls back to manual code entry. This keeps the
 *          in-app affordance truthful for v0.6 (see ERY-70 / ERY-82).
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
  /**
   * Reserved for a future web live-preview path. No-op today: the web has no
   * live scanner (camera blocked by `Permissions-Policy`), and the native ML
   * Kit plugin presents its own full-screen UI, so it never mounts a preview.
   */
  previewTarget?: HTMLElement | null;
  /**
   * Reserved abort handle. No-op today: the native ML Kit scan is a single
   * awaited call with its own cancel UI, and the web path throws immediately
   * without opening a camera stream.
   */
  signal?: AbortSignal;
}

/**
 * Thrown when the caller invokes `scanOnce()` outside the native shell. Hosted
 * web/PWA has no live scanner (camera is blocked by `Permissions-Policy`), so
 * the mobile scanner page catches this and shows a manual-entry fallback rather
 * than failing silently at `getUserMedia()`.
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
  // Web/PWA never has a live scanner: hosted deployments lock the camera via
  // `Permissions-Policy: camera=()`, so reporting availability here would
  // promise a path that fails at `getUserMedia()`. Only the native shells
  // (iOS + Android) run the ML Kit scanner.
  if (!isNativeApp()) return false;
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

  // Web/PWA: no live scanner. The hosted camera policy (`Permissions-Policy:
  // camera=()`) blocks `getUserMedia()`, so we never attempt it — surfacing a
  // camera affordance here would be a false promise. Callers branch on
  // `isScannerAvailable()` (false on web) and fall back to manual entry; this
  // throw is the defensive backstop if one forgets to.
  throw new ScannerUnavailableError();
}
