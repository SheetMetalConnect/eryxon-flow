/**
 * Barcode / QR scanner wrapper. The shop floor encodes job numbers, part
 * numbers and CNC programs as QR codes — operators scan them with the iPad
 * rear camera to jump straight into the right detail view.
 *
 * On the web we surface a clear "not supported" error so the calling screen
 * can fall back to manual entry instead of silently doing nothing.
 */

import { isNative } from "./platform";

export interface ScanResult {
  /** Decoded payload (e.g. "JOB-1042" or "CNC:PRG/441"). */
  text: string;
  /** Format like "QR_CODE", "CODE_128", etc. — useful for routing. */
  format: string;
}

export class ScannerUnavailableError extends Error {
  constructor() {
    super("Camera scanner is only available in the native iOS app.");
    this.name = "ScannerUnavailableError";
  }
}

export class ScannerPermissionError extends Error {
  constructor() {
    super("Camera permission denied.");
    this.name = "ScannerPermissionError";
  }
}

/**
 * Show the native ML Kit barcode scanner and resolve with the first detected
 * code. The plugin handles its own UI (live preview + cancel button) so the
 * caller just awaits the result.
 */
export async function scanOnce(): Promise<ScanResult> {
  if (!isNative()) throw new ScannerUnavailableError();

  const mod = await import("@capacitor-mlkit/barcode-scanning");
  const { BarcodeScanner, BarcodeFormat } = mod;

  // ML Kit needs an explicit permission grant — request it eagerly so the
  // user sees the system prompt with a meaningful "for scanning jobs" string
  // (configured in Info.plist via the docs script).
  const { camera } = await BarcodeScanner.checkPermissions();
  if (camera !== "granted") {
    const requested = await BarcodeScanner.requestPermissions();
    if (requested.camera !== "granted") throw new ScannerPermissionError();
  }

  // Restrict to the formats we actually print on the shop floor — keeps
  // detection latency low and avoids false positives off random labels.
  const result = await BarcodeScanner.scan({
    formats: [
      BarcodeFormat.QrCode,
      BarcodeFormat.Code128,
      BarcodeFormat.Code39,
      BarcodeFormat.DataMatrix,
      BarcodeFormat.Ean13,
    ],
  });

  const first = result.barcodes?.[0];
  if (!first) throw new Error("Scan cancelled.");
  return { text: first.rawValue, format: String(first.format) };
}

/**
 * Whether ML Kit's bundled scanner module is installed on this device.
 * On iOS it ships with the app, but the call gives us a runtime guarantee
 * before we render the scanner button.
 */
export async function isScannerAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const mod = await import("@capacitor-mlkit/barcode-scanning");
    const { available } = await mod.BarcodeScanner.isSupported();
    return available;
  } catch {
    return false;
  }
}
