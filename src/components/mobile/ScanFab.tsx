import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScanLine } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScanDialog } from "./ScanDialog";
import { haptics } from "@/native";
import { cn } from "@/lib/utils";

interface ScanFabProps {
  /** Where to navigate with the scan as a query param. Defaults to current page. */
  targetPath?: string;
  /** Query parameter name to populate. Defaults to "q". */
  paramName?: string;
  className?: string;
}

/**
 * Floating action button for "scan barcode/QR" — placed above the bottom nav
 * on the operator pages. On scan, navigates to the target path with the code
 * as a query param so the page filter picks it up. Operators can scan a job
 * traveler from anywhere in the app and land on the queue filtered to that job.
 */
export function ScanFab({
  targetPath,
  paramName = "q",
  className,
}: ScanFabProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const handleResult = (value: string) => {
    const path = targetPath ?? window.location.pathname;
    const next = new URLSearchParams(params);
    next.set(paramName, value);
    navigate(`${path}?${next.toString()}`);
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          void haptics.tap("medium");
          setOpen(true);
        }}
        aria-label={t("mobile.scanFab", "Scan code")}
        className={cn(
          "fixed right-4 z-40 h-14 w-14 rounded-full shadow-lg shadow-primary/30",
          "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95",
          "transition-transform",
          /* Sit above the bottom nav (h-14) + safe-area on phones; on tablets the nav is hidden so we only need the inset. */
          "bottom-[calc(env(safe-area-inset-bottom,0px)+72px)]",
          "lg:bottom-[calc(env(safe-area-inset-bottom,0px)+24px)]",
          className
        )}
      >
        <ScanLine className="h-6 w-6" />
      </Button>
      <ScanDialog open={open} onOpenChange={setOpen} onResult={handleResult} />
    </>
  );
}
