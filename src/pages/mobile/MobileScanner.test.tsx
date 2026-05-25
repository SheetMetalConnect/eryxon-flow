import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/**
 * Route-level coverage for `/m/scan`. The behaviour under test (ERY-85):
 * - Native shells (iOS *and* Android) auto-launch the scanner on entry.
 * - Web/PWA stays user-initiated and shows platform-truthful fallback copy.
 * - Error copy is platform-truthful (no iOS-only wording).
 */

const scanOnceMock = vi.fn();
const isScannerAvailableMock = vi.fn();
const toastErrorMock = vi.fn();
const hapticsMock = {
  success: vi.fn().mockResolvedValue(undefined),
  error: vi.fn().mockResolvedValue(undefined),
  warning: vi.fn().mockResolvedValue(undefined),
};

let nativeContext = {
  isNative: false,
  isNativeIOS: false,
  isAndroidNative: false,
};

// Stable `t` + return object: react-i18next hands back a referentially stable
// `t` in real usage. A fresh closure per render would churn the `launchScan`
// useCallback and spin the auto-launch effect.
const tMock = (_key: string, fallback?: string) => fallback ?? _key;
const useTranslationReturn = { t: tMock };
vi.mock("react-i18next", () => ({
  useTranslation: () => useTranslationReturn,
}));
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastErrorMock(...args) },
}));
vi.mock("@/hooks/useNative", () => ({
  useNative: () => nativeContext,
}));
vi.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => hapticsMock,
}));
vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({ tenant_id: "tenant-1" }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({}) },
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));
vi.mock("@/components/mobile", () => ({
  MobileTopBar: ({ title }: { title: string }) => <div>{title}</div>,
}));
vi.mock("@/native", () => {
  class ScannerUnavailableError extends Error {
    constructor() {
      super("Camera scanner is only available in the native iOS / Android app.");
      this.name = "ScannerUnavailableError";
    }
  }
  class ScannerPermissionError extends Error {
    constructor() {
      super("Camera permission denied.");
      this.name = "ScannerPermissionError";
    }
  }
  return {
    isScannerAvailable: () => isScannerAvailableMock(),
    scanOnce: (...args: unknown[]) => scanOnceMock(...args),
    ScannerUnavailableError,
    ScannerPermissionError,
  };
});

import MobileScanner from "./MobileScanner";
import { ScannerPermissionError, ScannerUnavailableError } from "@/native";

function renderScanner() {
  return render(
    <MemoryRouter initialEntries={["/m/scan"]}>
      <Routes>
        <Route path="/m/scan" element={<MobileScanner />} />
        <Route path="/m/op/:id" element={<div>Operation detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MobileScanner auto-launch decision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scanOnceMock.mockResolvedValue(null);
  });

  it("auto-launches the scanner on Android native entry (parity with iOS)", async () => {
    nativeContext = {
      isNative: true,
      isNativeIOS: false,
      isAndroidNative: true,
    };
    isScannerAvailableMock.mockResolvedValue(true);

    renderScanner();

    await waitFor(() => expect(scanOnceMock).toHaveBeenCalledTimes(1));
  });

  it("auto-launches the scanner on iOS native entry", async () => {
    nativeContext = {
      isNative: true,
      isNativeIOS: true,
      isAndroidNative: false,
    };
    isScannerAvailableMock.mockResolvedValue(true);

    renderScanner();

    await waitFor(() => expect(scanOnceMock).toHaveBeenCalledTimes(1));
  });

  it("does not auto-launch the camera on web/PWA entry", async () => {
    nativeContext = {
      isNative: false,
      isNativeIOS: false,
      isAndroidNative: false,
    };
    isScannerAvailableMock.mockResolvedValue(false);

    renderScanner();

    // Wait for the availability probe to settle, then assert no scan fired.
    await screen.findByText(
      "Camera scanning runs in the native iOS and Android apps. Type a code below to continue.",
    );
    expect(scanOnceMock).not.toHaveBeenCalled();
  });
});

describe("MobileScanner copy states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scanOnceMock.mockResolvedValue(null);
  });

  it("shows platform-truthful fallback copy on web (no iOS-only wording)", async () => {
    nativeContext = {
      isNative: false,
      isNativeIOS: false,
      isAndroidNative: false,
    };
    isScannerAvailableMock.mockResolvedValue(false);

    renderScanner();

    const fallback = await screen.findByText(
      "Camera scanning runs in the native iOS and Android apps. Type a code below to continue.",
    );
    expect(fallback.textContent).not.toMatch(/only available in the native iOS app/i);
    // Camera button is hidden when scanning is unavailable.
    expect(screen.queryByText("Open camera")).toBeNull();
  });

  it("shows the live-scan copy when scanning is available", async () => {
    nativeContext = {
      isNative: true,
      isNativeIOS: false,
      isAndroidNative: true,
    };
    isScannerAvailableMock.mockResolvedValue(true);

    renderScanner();

    await screen.findByText(
      "Point the camera at a printed QR or barcode. Eryxon will jump straight to the matching operation.",
    );
  });

  it("surfaces platform-truthful permission-denied copy", async () => {
    nativeContext = {
      isNative: true,
      isNativeIOS: false,
      isAndroidNative: true,
    };
    isScannerAvailableMock.mockResolvedValue(true);
    scanOnceMock.mockRejectedValue(new ScannerPermissionError());

    renderScanner();

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Enable camera access in your device settings to scan",
      ),
    );
  });

  it("surfaces platform-truthful unavailable copy", async () => {
    nativeContext = {
      isNative: true,
      isNativeIOS: false,
      isAndroidNative: true,
    };
    isScannerAvailableMock.mockResolvedValue(true);
    scanOnceMock.mockRejectedValue(new ScannerUnavailableError());

    renderScanner();

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Camera scanning is only available in the native iOS and Android apps",
      ),
    );
  });
});
