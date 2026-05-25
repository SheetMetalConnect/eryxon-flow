import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";

/**
 * Cloudflare Turnstile — explicit rendering via the official `onload` callback.
 *
 * Built to the documented pattern:
 * https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
 *
 * The api.js script is loaded once with `?render=explicit&onload=<cb>`. Cloudflare
 * invokes the global callback when the API is ready; only then do we call
 * `turnstile.render()`. We deliberately do NOT call `turnstile.ready()` — that
 * throws when the script tag uses async/defer (which it must, to load off the
 * critical path). The widget is non-blocking: if the script never loads, the
 * parent form can still submit and decide whether a token is required.
 */

// ── Cloudflare Turnstile type declarations ──────────────────────────────────

interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  "error-callback"?: (code?: string) => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "flexible" | "compact";
}

interface TurnstileAPI {
  render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
    onloadTurnstileCallback?: () => void;
  }
}

// ── Script loader (singleton, official onload-callback pattern) ─────────────

const SCRIPT_ID = "cf-turnstile-api";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback";

let readyPromise: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<void>((resolve, reject) => {
    // Cloudflare calls this global once api.js has finished initialising.
    window.onloadTurnstileCallback = () => resolve();

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      if (window.turnstile) resolve();
      return; // script already injected; onload callback will fire
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener(
      "error",
      () => {
        readyPromise = null;
        reject(new Error("Turnstile api.js failed to load"));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return readyPromise;
}

// ── Hook ────────────────────────────────────────────────────────────────────

/**
 * Owns captcha token state + a reset counter that forces the widget to
 * re-render with a fresh challenge. Tokens are single-use — callers must
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
  size?: "normal" | "flexible" | "compact";
  /** Bump this value to force a widget reset (e.g. after form submission). */
  resetKey?: number;
}

export function TurnstileWidget({
  siteKey,
  onToken,
  onError,
  onExpire,
  theme = "auto",
  size = "normal",
  resetKey = 0,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Keep callback refs fresh so the parent can pass inline closures without
  // forcing the widget to re-render (Turnstile registers callbacks once).
  const cbRef = useRef({ onToken, onError, onExpire });
  useEffect(() => {
    cbRef.current = { onToken, onError, onExpire };
  }, [onToken, onError, onExpire]);

  useEffect(() => {
    let cancelled = false;

    loadTurnstile()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;

        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // already gone
          }
          widgetIdRef.current = null;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          callback: (token: string) => {
            logger.debug("TurnstileWidget", "Token received");
            cbRef.current.onToken(token);
          },
          "error-callback": (code?: string) => {
            logger.warn("TurnstileWidget", "Challenge error", { code });
            cbRef.current.onError?.();
          },
          "expired-callback": () => {
            logger.debug("TurnstileWidget", "Token expired");
            cbRef.current.onExpire?.();
          },
        });
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
          // ignore unmount removal errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, size, resetKey]);

  return <div ref={containerRef} />;
}
