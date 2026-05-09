import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";

export function PwaUpdatePrompt(): null {
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
