import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
import { isNativeApp } from "@/native";

export function PwaUpdatePrompt() {
  if (import.meta.env.VITE_ENABLE_PWA !== "true" || isNativeApp()) {
    return null;
  }
  return <PwaUpdatePromptInner />;
}

// How often to ask the browser to check for a newer service worker. Shop-floor
// terminals stay open for hours, so without a poll they'd never see an update.
const UPDATE_CHECK_INTERVAL_MS = 20 * 60 * 1000;

function PwaUpdatePromptInner(): null {
  const { t } = useTranslation();
  const timer = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => () => clearInterval(timer.current), []);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      clearInterval(timer.current);
      timer.current = setInterval(() => {
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

  useEffect(() => {
    if (!needRefresh) return;
    toast(t("pwa.updateAvailable"), {
      id: "pwa-update",
      description: t("pwa.updateDescription"),
      duration: Infinity,
      action: { label: t("pwa.reload"), onClick: () => void updateServiceWorker(true) },
      cancel: { label: t("pwa.later"), onClick: () => undefined },
    });
  }, [needRefresh, updateServiceWorker, t]);

  return null;
}
