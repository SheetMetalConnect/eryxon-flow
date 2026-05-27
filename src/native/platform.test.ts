import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetPlatformCache,
  getPlatform,
  isAndroidNative,
  isIPad,
  isIPhone,
  isNativeApp,
  isNativeIOS,
  isStandalone,
  isTabletViewport,
  shouldUseMobileShell,
} from "./platform";

const ORIGINAL_UA = navigator.userAgent;
const ORIGINAL_TOUCHPOINTS = navigator.maxTouchPoints;

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    get: () => ua,
  });
}

function setMaxTouchPoints(value: number) {
  Object.defineProperty(navigator, "maxTouchPoints", {
    configurable: true,
    get: () => value,
  });
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    get: () => width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    get: () => height,
  });
}

afterEach(() => {
  setUserAgent(ORIGINAL_UA);
  setMaxTouchPoints(ORIGINAL_TOUCHPOINTS);
  // jsdom defaults: 1024x768
  setViewport(1024, 768);
  delete (window as { Capacitor?: unknown }).Capacitor;
  __resetPlatformCache();
  vi.unstubAllGlobals();
});

describe("isNativeApp / isNativeIOS / isAndroidNative", () => {
  it("returns false everywhere when Capacitor isn't injected", () => {
    expect(isNativeApp()).toBe(false);
    expect(isNativeIOS()).toBe(false);
    expect(isAndroidNative()).toBe(false);
  });

  it("detects Capacitor iOS correctly", () => {
    (window as unknown as { Capacitor: unknown }).Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
    };
    __resetPlatformCache();
    expect(isNativeApp()).toBe(true);
    expect(isNativeIOS()).toBe(true);
    expect(isAndroidNative()).toBe(false);
  });

  it("detects Capacitor Android correctly", () => {
    (window as unknown as { Capacitor: unknown }).Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "android",
    };
    __resetPlatformCache();
    expect(isAndroidNative()).toBe(true);
    expect(isNativeIOS()).toBe(false);
  });
});

describe("isIPad / isIPhone (UA + touch heuristics)", () => {
  it("recognises iPhone Safari", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",
    );
    expect(isIPhone()).toBe(true);
    expect(isIPad()).toBe(false);
  });

  it("recognises legacy iPad UA", () => {
    setUserAgent(
      "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15",
    );
    expect(isIPad()).toBe(true);
    expect(isIPhone()).toBe(false);
  });

  it("recognises iPadOS 13+ desktop-class Safari via touch points", () => {
    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
    );
    setMaxTouchPoints(5);
    expect(isIPad()).toBe(true);
  });

  it("does not flag a real Mac as iPad when touch points = 0", () => {
    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
    );
    setMaxTouchPoints(0);
    expect(isIPad()).toBe(false);
  });
});

describe("isTabletViewport — must not lie after rotation", () => {
  it("returns true at tablet width", () => {
    setViewport(900, 1200);
    expect(isTabletViewport()).toBe(true);
  });

  it("returns false at phone width", () => {
    setViewport(390, 844);
    expect(isTabletViewport()).toBe(false);
  });

  it("re-evaluates on viewport change (no caching)", () => {
    setViewport(390, 844);
    expect(isTabletViewport()).toBe(false);
    // Simulate rotating the same device into a tablet-sized window. If we
    // were caching, this would still report false from the first call.
    setViewport(1180, 820);
    expect(isTabletViewport()).toBe(true);
  });
});

describe("isStandalone", () => {
  it("returns false when display-mode is browser", () => {
    expect(isStandalone()).toBe(false);
  });

  it("returns true when display-mode is standalone", () => {
    const originalMatch = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    try {
      expect(isStandalone()).toBe(true);
    } finally {
      window.matchMedia = originalMatch;
    }
  });

  it("returns true when navigator.standalone is set (iOS <16.4)", () => {
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      get: () => true,
    });
    try {
      expect(isStandalone()).toBe(true);
    } finally {
      delete (navigator as Record<string, unknown>).standalone;
    }
  });
});

describe("getPlatform / shouldUseMobileShell", () => {
  it("falls back to web fingerprint without Capacitor", () => {
    setUserAgent("Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/127.0");
    expect(getPlatform()).toBe("web");
  });

  it("respects the small-viewport heuristic on the web", () => {
    // jsdom's matchMedia is stubbed to return matches=false, so we override
    // with one that actually evaluates max-width against the current
    // window.innerWidth.
    const originalMatch = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      const max = /max-width:\s*(\d+)px/.exec(query);
      const matches = max ? window.innerWidth <= parseInt(max[1], 10) : false;
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList;
    }) as unknown as typeof window.matchMedia;
    try {
      setViewport(800, 1200);
      expect(shouldUseMobileShell()).toBe(true);
      setViewport(1440, 900);
      expect(shouldUseMobileShell()).toBe(false);
    } finally {
      window.matchMedia = originalMatch;
    }
  });
});
