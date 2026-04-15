import { useEffect, useRef, useState, useCallback } from "react";
import { logger } from "@/lib/logger";

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
const SCRIPT_SELECTOR = `script[src^="https://challenges.cloudflare.com/turnstile"]`;

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
    const script = existing ?? document.createElement("script");

    const handleError = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error("Turnstile script failed to load"));
    };

    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existing) {
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return scriptPromise;
}

// ── Hook ────────────────────────────────────────────────────────────────────

/**
 * Owns captcha token state + a reset counter that forces the widget to
 * re-render with a fresh challenge.  Tokens are single-use — callers must
 * invoke `reset()` after every submission attempt.
 */
export function useTurnstile() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const reset = useCallback(() => {
    setCaptchaToken(null);
    setResetKey((k) => k + 1);
  }, []);

  return { captchaToken, setCaptchaToken, resetKey, reset };
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

  // Callback refs are read inside Turnstile's own callbacks, which are
  // registered once with the widget.  Keeping refs fresh lets the parent pass
  // inline closures without re-rendering the widget on every parent render.
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
  }, [onToken, onError, onExpire]);

  useEffect(() => {
    let cancelled = false;

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) return;

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
            logger.debug("TurnstileWidget", "Token received");
            onTokenRef.current(token);
          },
          "error-callback": () => {
            logger.warn("TurnstileWidget", "Challenge error");
            onErrorRef.current?.();
          },
          "expired-callback": () => {
            logger.debug("TurnstileWidget", "Token expired, re-rendering");
            onExpireRef.current?.();
            if (widgetIdRef.current && window.turnstile) {
              try {
                window.turnstile.reset(widgetIdRef.current);
              } catch {
                // Ignore reset errors
              }
            }
          },
        });
        logger.debug("TurnstileWidget", "Widget rendered", { widgetId: widgetIdRef.current });
      } catch (err) {
        logger.warn("TurnstileWidget", "Failed to render widget", err);
      }
    };

    loadTurnstileScript()
      .then(() => {
        if (!cancelled) renderWidget();
      })
      .catch((err) => {
        logger.warn("TurnstileWidget", "Script load failed", err);
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
  }, [siteKey, theme, size, resetKey]);

  return <div ref={containerRef} />;
}
