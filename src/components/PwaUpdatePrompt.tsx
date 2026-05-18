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

function PwaUpdatePromptInner(): null {
  const { t } = useTranslation("common");
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (offlineReady) {
      toast.success(t("pwa.offlineReady"));
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady, t]);

  useEffect(() => {
    if (!needRefresh) return;
    const id = toast(t("pwa.updateAvailable"), {
      description: t("pwa.updateDescription"),
      duration: Infinity,
      action: {
        label: t("pwa.reload"),
        onClick: () => {
          void updateServiceWorker(true);
        },
      },
      cancel: {
        label: t("pwa.later"),
        onClick: () => setNeedRefresh(false),
      },
    });
    return () => {
      toast.dismiss(id);
    };
  }, [needRefresh, setNeedRefresh, updateServiceWorker, t]);

  return null;
}
