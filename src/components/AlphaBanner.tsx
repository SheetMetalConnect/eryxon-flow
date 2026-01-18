import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Alpha release banner shown at the top of all pages
 * Only displays for cloud-hosted version (not self-hosted)
 * Can be dismissed by the user (persisted in localStorage)
 */
export function AlphaBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => 
    localStorage.getItem("alpha-banner-dismissed") === "true"
  );

  // Check if this is the cloud-hosted version
  // Self-hosted instances should set VITE_SELF_HOSTED=true in their .env
  const isSelfHosted = import.meta.env.VITE_SELF_HOSTED === "true";

  if (isSelfHosted || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem("alpha-banner-dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-sm flex items-center justify-center gap-2 relative">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="text-center font-medium">
        {t("alphaBanner.message")}{" "}
        <a 
          href="https://eryxon.eu"
          target="_blank" 
          rel="noopener noreferrer"
          className="underline hover:no-underline font-semibold"
        >
          {t("alphaBanner.learnMore")}
        </a>
      </span>
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-amber-600/20 rounded transition-colors"
        aria-label={t("common.dismiss")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
