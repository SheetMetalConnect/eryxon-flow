import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isNativeApp, isStandalone } from "@/native";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const DISMISS_STORAGE_KEY = "eryxon_pwa_install_dismissed";

export function PwaInstallPrompt(): null {
  if (isNativeApp() || isStandalone()) return null;
  return <PwaInstallPromptInner />;
}

function PwaInstallPromptInner(): null {
  const { t } = useTranslation("common");
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_STORAGE_KEY)) return;

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPrompt.current = null;
    setVisible(false);

    if (outcome === "accepted") {
      localStorage.setItem(DISMISS_STORAGE_KEY, "true");
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISS_STORAGE_KEY, "true");
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-2xl items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold">{t("pwa.installTitle")}</p>
          <p className="text-muted-foreground text-xs">
            {t("pwa.installDescription")}
          </p>
        </div>
        <Button size="sm" onClick={handleInstall}>
          {t("pwa.install")}
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground -mr-1 rounded p-1"
          aria-label={t("pwa.notNow")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
