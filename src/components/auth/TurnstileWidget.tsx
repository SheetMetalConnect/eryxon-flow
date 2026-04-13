import { useEffect, useRef, useCallback } from "react";

/**
 * Cloudflare Turnstile widget — uses the explicit rendering API directly.
 *
 * Key design choice: this widget is **non-blocking**.  If the script fails to
 * load, or the challenge never completes, the parent form can still submit.
 * The parent owns the `captchaToken` state and decides whether to require it.
 */

// ── Cloudflare Turnstile type declarations ──────────────────────────────────

interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact";
  action?: string;
}

interface TurnstileAPI {
  render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

// ── Script loader (singleton — idempotent across multiple mounts) ───────────

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();

  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    // Check if script tag already exists (e.g. from a previous mount)
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="https://challenges.cloudflare.com/turnstile"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Turnstile script failed to load")));
      if (window.turnstile) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => {
      scriptPromise = null; // allow retry
      reject(new Error("Turnstile script failed to load"));
    });
    document.head.appendChild(script);
  });

  return scriptPromise;
}

// ── Component ───────────────────────────────────────────────────────────────

interface TurnstileWidgetProps {
  siteKey: string;
  onToken: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact";
  /** Bump this value to force a widget reset (e.g. after form submission). */
  resetKey?: number;
}

export function TurnstileWidget({
  siteKey,
  onToken,
  onError,
  onExpire,
  theme = "dark",
  size = "normal",
  resetKey = 0,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Keep callback refs fresh without re-rendering the widget
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;
  onExpireRef.current = onExpire;

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;

    // Clean up any existing widget in this container
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Widget may already be removed
      }
      widgetIdRef.current = null;
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size,
        callback: (token: string) => {
          console.debug("[Turnstile] Token received");
          onTokenRef.current(token);
        },
        "error-callback": () => {
          console.warn("[Turnstile] Challenge error");
          onErrorRef.current?.();
        },
        "expired-callback": () => {
          console.debug("[Turnstile] Token expired, re-rendering");
          onExpireRef.current?.();
          // Auto-reset on expiry so a fresh challenge appears
          if (widgetIdRef.current && window.turnstile) {
            try {
              window.turnstile.reset(widgetIdRef.current);
            } catch {
              // Ignore reset errors
            }
          }
        },
      });
      console.debug("[Turnstile] Widget rendered", widgetIdRef.current);
    } catch (err) {
      console.warn("[Turnstile] Failed to render widget:", err);
    }
  }, [siteKey, theme, size]);

  // Load script & render on mount; re-render when resetKey changes
  useEffect(() => {
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (!cancelled) renderWidget();
      })
      .catch((err) => {
        console.warn("[Turnstile] Script load failed:", err);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore removal errors during unmount
        }
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget, resetKey]);

  return <div ref={containerRef} />;
}
