/**
 * Native bridge layer — web-only implementation.
 *
 * The Community build is a pure web PWA. This module keeps the historical
 * "@/native" API surface (so its importers keep compiling) but implements
 * every symbol with web primitives only: no Capacitor, no native device
 * plugins. Platform fingerprints always resolve to "web"; device-only
 * features (barcode scanner, biometrics, push) report themselves unavailable
 * and the callers fall back to their web paths.
 */

import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ *
 * Platform detection
 * ------------------------------------------------------------------ */

export type PlatformId = "ios" | "ipados" | "android" | "web";

let cachedPlatform: PlatformId | null = null;

/** Web build is never a native app. */
export function isNativeApp(): boolean {
  return false;
}

/** Alias kept for files migrated from the iOS-only bridge. */
export const isNative = isNativeApp;

export function isAndroidNative(): boolean {
  return false;
}

export function isNativeIOS(): boolean {
  return false;
}

/**
 * Detect iPad reliably across iPadOS 13+ where Safari masquerades as
 * Mac Safari. Combines the explicit `iPad` token (older devices) with the
 * touch-points heuristic that Apple recommends.
 */
export function isIPad(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad/.test(ua)) return true;
  return (
    /Macintosh/.test(ua) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  );
}

/** True for any handheld iOS form factor. */
export function isIPhone(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPod/.test(navigator.userAgent) && !isIPad();
}

/**
 * Approximate "is this a tablet-class screen?" — short side ≥ 600 CSS px.
 *
 * NOT cached: viewport changes when the user rotates the device or splits the
 * screen. Callers that need reactive updates subscribe via `useNative()`.
 */
export function isTabletViewport(): boolean {
  if (typeof window === "undefined") return false;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  return shortSide >= 600;
}

/** Best-effort runtime platform fingerprint, cached per session. */
export function getPlatform(): PlatformId {
  if (cachedPlatform) return cachedPlatform;
  if (typeof navigator === "undefined") {
    cachedPlatform = "web";
    return cachedPlatform;
  }
  const ua = navigator.userAgent || "";
  if (/iPhone|iPod/.test(ua)) cachedPlatform = "ios";
  else if (isIPad()) cachedPlatform = "ipados";
  else if (/Android/.test(ua)) cachedPlatform = "android";
  else cachedPlatform = "web";
  return cachedPlatform;
}

/** Whether the device should render the touch-first mobile shell. */
export function shouldUseMobileShell(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

/** Coarse pointer detection for hover-vs-tap branches. */
export function hasFinePointer(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(pointer: fine)").matches;
}

/** Reset cached detections (testing only). */
export function __resetPlatformCache(): void {
  cachedPlatform = null;
}

/* ------------------------------------------------------------------ *
 * App shell (status bar / splash / hardware back / auth callback)
 * ------------------------------------------------------------------ */

import type { NavigateFunction } from "react-router-dom";

/** No native shell to initialise on the web. */
export async function initNativeShell(): Promise<void> {}

/** No hardware back button on the web. */
export async function wireHardwareBack(_navigate: NavigateFunction): Promise<void> {}

/* ------------------------------------------------------------------ *
 * Haptics
 * ------------------------------------------------------------------ */

type HapticStyle = "light" | "medium" | "heavy";

function webVibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  const n = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  n.vibrate?.(pattern);
}

export const haptics = {
  async select(): Promise<void> {
    webVibrate(10);
  },
  async tap(style: HapticStyle = "light"): Promise<void> {
    webVibrate(style === "heavy" ? 30 : style === "medium" ? 20 : 10);
  },
  async success(): Promise<void> {
    webVibrate([15, 50, 15]);
  },
  async warning(): Promise<void> {
    webVibrate([30, 30, 30]);
  },
  async error(): Promise<void> {
    webVibrate([60, 40, 60]);
  },
};

/* ------------------------------------------------------------------ *
 * Barcode / QR scanner
 * ------------------------------------------------------------------ */

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
  /** Reserved for a future web live-preview path. No-op today. */
  previewTarget?: HTMLElement | null;
  /** Reserved abort handle. No-op today. */
  signal?: AbortSignal;
}

/**
 * Thrown when the caller invokes `scanOnce()`. The web/PWA build has no live
 * scanner (hosted deployments block the camera via `Permissions-Policy`), so
 * the mobile scanner page catches this and shows a manual-entry fallback.
 */
export class ScannerUnavailableError extends Error {
  constructor() {
    super("Camera scanner is only available in the native iOS / Android app.");
    this.name = "ScannerUnavailableError";
  }
}

/** Thrown when camera permission is declined. */
export class ScannerPermissionError extends Error {
  constructor() {
    super("Camera permission denied.");
    this.name = "ScannerPermissionError";
  }
}

/** Web/PWA never has a live scanner: callers fall back to manual entry. */
export async function isScannerAvailable(): Promise<boolean> {
  return false;
}

export async function scanOnce(_opts: ScanOptions = {}): Promise<ScanResult | null> {
  throw new ScannerUnavailableError();
}

/* ------------------------------------------------------------------ *
 * Biometric authentication
 * ------------------------------------------------------------------ */

export type BiometricKind = "face" | "touch" | "none";

export interface BiometricAvailability {
  available: boolean;
  kind: BiometricKind;
  reason?: string;
}

export async function isBiometricAvailable(): Promise<boolean> {
  return false;
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  return { available: false, kind: "none", reason: "web" };
}

export async function verifyBiometric(_opts: {
  reason: string;
  title?: string;
  subtitle?: string;
}): Promise<boolean> {
  return false;
}

/** Compat alias for the operator-shell call site. */
export async function verifyIdentity(_reason: string): Promise<boolean> {
  return false;
}

/* ------------------------------------------------------------------ *
 * Network status
 * ------------------------------------------------------------------ */

export type ConnectionType =
  | "wifi"
  | "cellular"
  | "ethernet"
  | "none"
  | "unknown";

export interface NetworkStatus {
  online: boolean;
  connectionType: ConnectionType;
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  return {
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    connectionType: "unknown",
  };
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    connectionType: "unknown",
  }));

  useEffect(() => {
    const update = () =>
      setStatus({ online: navigator.onLine, connectionType: "unknown" });
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return status;
}

/* ------------------------------------------------------------------ *
 * Camera capture — basic web upload from the device
 * ------------------------------------------------------------------ */

export interface PhotoResult {
  base64: string;
  mimeType: string;
  width?: number;
  height?: number;
}

/**
 * Capture a photo via a hidden `<input type="file" accept="image/*" capture>`.
 * Android Chrome routes this to the camera app; other browsers open the file
 * picker. Returns a downscaled base64 JPEG ready for Supabase storage upload,
 * or null when the user cancels.
 */
export async function capturePhoto(opts: {
  quality?: number;
  maxWidth?: number;
} = {}): Promise<PhotoResult | null> {
  const quality = opts.quality ?? 75;
  const width = opts.maxWidth ?? 1920;
  return capturePhotoWeb(quality, width);
}

function capturePhotoWeb(
  quality: number,
  maxWidth: number,
): Promise<PhotoResult | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.style.display = "none";
    document.body.appendChild(input);

    // Some browsers fire both `cancel` and `change` (with no file) when the
    // sheet is dismissed. Guard so we resolve / remove the node exactly once.
    let settled = false;
    const finish = (cb: () => void) => {
      if (settled) return;
      settled = true;
      if (input.parentNode === document.body) document.body.removeChild(input);
      cb();
    };

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        finish(() => resolve(null));
        return;
      }
      try {
        const result = await downscaleAndEncode(file, quality, maxWidth);
        finish(() => resolve(result));
      } catch (err) {
        finish(() => reject(err));
      }
    };
    input.oncancel = () => finish(() => resolve(null));

    input.click();
  });
}

async function downscaleAndEncode(
  file: File,
  quality: number,
  maxWidth: number,
): Promise<PhotoResult> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob(
        (b) => (b ? res(b) : rej(new Error("Image encode failed"))),
        "image/jpeg",
        quality / 100,
      ),
    );
    const base64 = await blobToBase64(blob);
    return { base64, mimeType: "image/jpeg", width: w, height: h };
  } finally {
    bitmap.close();
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      const idx = r.indexOf(",");
      resolve(idx >= 0 ? r.slice(idx + 1) : r);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/* ------------------------------------------------------------------ *
 * Push notifications
 * ------------------------------------------------------------------ */

export interface PushRegistration {
  /** Apple device token (iOS) or FCM registration token (Android). */
  token: string;
  platform: "ios" | "android";
}

/** No native push on the web build. */
export async function registerPushNotifications(): Promise<PushRegistration | null> {
  return null;
}

/* ------------------------------------------------------------------ *
 * Status bar (native-only chrome — web no-ops)
 * ------------------------------------------------------------------ */

export async function setStatusBarStyle(_theme: "dark" | "light"): Promise<void> {}

export async function setStatusBarOverlay(_overlays: boolean): Promise<void> {}

export async function hideSplash(): Promise<void> {}

/* ------------------------------------------------------------------ *
 * Keyboard
 * ------------------------------------------------------------------ */

export type KeyboardListener = (visible: boolean, height: number) => void;

/** Blur the active element — the web equivalent of dismissing the keyboard. */
export async function dismissKeyboard(): Promise<void> {
  if (typeof document === "undefined") return;
  const active = document.activeElement as HTMLElement | null;
  active?.blur?.();
}

/** No native keyboard show/hide events on the web; returns a no-op unsubscribe. */
export async function subscribeKeyboard(
  _listener: KeyboardListener,
): Promise<() => void> {
  return () => {};
}
