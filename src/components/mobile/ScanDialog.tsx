import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Keyboard, Loader2, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { haptics, isNativeApp, isScannerAvailable, scanOnce } from "@/native";

interface ScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (value: string) => void;
  title?: string;
  hint?: string;
}

/**
 * Touch-friendly scan dialog used by the operator queue + issue capture.
 * Native: opens ML Kit camera scanner immediately (no in-dialog preview, the
 * plugin presents its own full-screen UI). Web: shows an in-dialog camera
 * preview if BarcodeDetector is available, otherwise falls back to manual entry.
 */
export function ScanDialog({
  open,
  onOpenChange,
  onResult,
  title,
  hint,
}: ScanDialogProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [scannerSupported, setScannerSupported] = useState<boolean | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);
  const previewRef = useRef<HTMLDivElement>(null);

  // Reset transient state on the open=false → open=true edge using the
  // React-recommended derived-state-from-props pattern (vs. setState-in-effect
  // which the react-hooks lint flags as a cascading render).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setError(null);
      setManual("");
      setBusy(false);
      setScannerSupported(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void isScannerAvailable().then((supported) => {
      if (!cancelled) setScannerSupported(supported);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || scannerSupported === null) return;
    if (!scannerSupported) return;

    // AbortController lets the cleanup tell scanOnce to release the camera
    // immediately. Without it the web BarcodeDetector path would keep the
    // getUserMedia stream and indicator on until its 30s timeout.
    const controller = new AbortController();
    let cancelled = false;
    // Loading flag for an async camera handshake — react-hooks lint flags
    // any setState-in-effect, but this is the canonical "kick off a request
    // when conditions become true" pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const result = await scanOnce({
          previewTarget: isNativeApp() ? null : previewRef.current,
          signal: controller.signal,
        });
        if (cancelled) return;
        if (result?.value) {
          await haptics.success();
          onResult(result.value);
          onOpenChange(false);
        } else if (!controller.signal.aborted) {
          setError(t("mobile.scanNoResult", "No code detected. Try again or enter it manually."));
        }
      } catch (e) {
        if (cancelled || controller.signal.aborted) return;
        await haptics.error();
        setError(
          e instanceof Error
            ? e.message
            : t("mobile.scanFailed", "Scanner failed. Enter the code manually.")
        );
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, scannerSupported, onOpenChange, onResult, t]);

  const submitManual = () => {
    const v = manual.trim();
    if (!v) return;
    void haptics.tap("medium");
    onResult(v);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md overflow-hidden p-0 sm:max-w-lg"
        aria-describedby="scan-hint"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <h2 className="truncate text-sm font-semibold">
              {title ?? t("mobile.scanTitle", "Scan barcode or QR")}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
            aria-label={t("common.close", "Close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 p-4">
          {!isNativeApp() && (
            <div
              ref={previewRef}
              className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-black/90"
            >
              {busy && (
                <div className="absolute inset-0 flex items-center justify-center text-white/80">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
              {!busy && scannerSupported === false && (
                <div className="absolute inset-0 flex items-center justify-center text-center text-xs text-white/70 px-4">
                  {t(
                    "mobile.scannerUnavailable",
                    "Live scanner not supported in this browser. Enter the code below."
                  )}
                </div>
              )}
            </div>
          )}

          <p
            id="scan-hint"
            className="text-xs text-muted-foreground"
          >
            {hint ?? t("mobile.scanHint", "Hold the device steady and centre the code in view.")}
          </p>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="scan-manual"
              className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              <Keyboard className="h-3 w-3" />
              {t("mobile.enterManually", "Or enter manually")}
            </label>
            <div className="flex gap-2">
              <Input
                id="scan-manual"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitManual();
                }}
                placeholder={t("mobile.codePlaceholder", "Job, part, or batch code")}
                className="h-11"
              />
              <Button
                onClick={submitManual}
                disabled={!manual.trim()}
                className="h-11 min-w-[80px]"
              >
                {t("common.submit", "Go")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
