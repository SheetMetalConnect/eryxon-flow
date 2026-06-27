import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
import { isNativeApp } from "@/native";

/**
 * Update-available toast for the PWA. **Do not render this inside a
 * Capacitor WebView.** Mounting it calls `navigator.serviceWorker
 * .register()`, which on Android (Chrome-based WebView) would install a
 * service worker for the app's origin and start intercepting Supabase
 * calls under `CAPACITOR_SERVER_URL=https://...`. iOS (WKWebView) doesn't
 * support SWs at all, so there it's just dead weight.
 *
 * Callers should gate the mount on `!isNativeApp()` (App.tsx does this).
 * The component itself also bails out as a belt-and-suspenders safety net.
 */
export function PwaUpdatePrompt(): null {
  if (isNativeApp()) {
    // The hook below would still register if reached. Bail before it runs.
    return null;
  }
  return <PwaUpdatePromptInner />;
}

// How often to ask the browser to check for a newer service worker. Shop-floor
// terminals stay open for hours, so without a poll they'd never see an update.
const UPDATE_CHECK_INTERVAL_MS = 20 * 60 * 1000;

function PwaUpdatePromptInner(): null {
  const { t } = useTranslation("common");
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        void registration.update();
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast.success(t("pwa.offlineReady"));
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady, t]);

  // Auto-apply updates: when a new version is ready, activate it and reload so
  // the UI is always current — no manual "Reload" tap, no stale cached bundle.
  useEffect(() => {
    if (!needRefresh) return;
    toast.loading(t("pwa.updating"), { id: "pwa-update", duration: Infinity });
    void updateServiceWorker(true);
  }, [needRefresh, updateServiceWorker, t]);

  return null;
}
