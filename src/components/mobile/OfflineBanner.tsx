import { useTranslation } from "react-i18next";
import { CloudOff } from "lucide-react";
import { useNetworkStatus } from "@/native";
import { cn } from "@/lib/utils";

/**
 * Persistent offline indicator for the mobile shell. Shop floor WiFi can drop
 * mid-shift; operators need an unambiguous signal that writes will fail before
 * they bother completing an operation. Slides in below the status bar.
 */
export function OfflineBanner({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { online } = useNetworkStatus();
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2 bg-amber-500/95 px-3 py-1.5 text-[12px] font-semibold text-amber-950 shadow-sm",
        className
      )}
    >
      <CloudOff className="h-3.5 w-3.5" />
      <span>{t("mobile.offline", "You're offline — changes won't save")}</span>
    </div>
  );
}
