import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, ScanLine, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNative } from "@/hooks/useNative";
import { useHaptics } from "@/hooks/useHaptics";
import {
  isScannerAvailable,
  scanOnce,
  ScannerPermissionError,
  ScannerUnavailableError,
  type ScanResult,
} from "@/native";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { MobileTopBar } from "@/components/mobile";

/**
 * QR / barcode entry point. Uses the ML Kit scanner when running in the native
 * iOS or Android shell; falls back to a manual lookup form on the web. Either
 * way the user lands on the matching operation detail screen.
 */
export default function MobileScanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const native = useNative();
  const haptics = useHaptics();
  const profile = useProfile();
  const [scanning, setScanning] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [manual, setManual] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    void isScannerAvailable().then(setAvailable);
  }, []);

  const resolvePayload = useCallback(
    async (payload: string): Promise<string | null> => {
      if (!profile?.tenant_id) return null;
      const trimmed = payload.trim();
      if (!trimmed) return null;

      // 1. Direct operation id (UUID) — used by terminal-printed labels.
      if (/^[0-9a-fA-F-]{36}$/.test(trimmed)) {
        const { data } = await supabase
          .from("operations")
          .select("id")
          .eq("id", trimmed)
          .eq("tenant_id", profile.tenant_id)
          .maybeSingle();
        if (data?.id) return data.id;
      }

      // 2. Job number → first non-completed operation
      const jobMatch = await supabase
        .from("jobs")
        .select("id, parts!inner(operations!inner(id, status, sequence))")
        .eq("tenant_id", profile.tenant_id)
        .eq("job_number", trimmed)
        .maybeSingle();
      if (jobMatch.data) {
        type Op = { id: string; status: string; sequence: number };
        const parts = (jobMatch.data as unknown as {
          parts: { operations: Op[] }[];
        }).parts;
        const ops = parts.flatMap((p) => p.operations);
        const next = ops
          .filter((op) => op.status !== "completed")
          .sort((a, b) => a.sequence - b.sequence)[0];
        if (next) return next.id;
      }

      // 3. Part number → first non-completed operation
      const partMatch = await supabase
        .from("parts")
        .select("id, operations(id, status, sequence)")
        .eq("tenant_id", profile.tenant_id)
        .eq("part_number", trimmed)
        .maybeSingle();
      if (partMatch.data) {
        const ops = (partMatch.data as unknown as {
          operations: { id: string; status: string; sequence: number }[];
        }).operations;
        const next = ops
          .filter((op) => op.status !== "completed")
          .sort((a, b) => a.sequence - b.sequence)[0];
        if (next) return next.id;
      }
      return null;
    },
    [profile?.tenant_id],
  );

  const launchScan = useCallback(async () => {
    setScanning(true);
    try {
      const result: ScanResult | null = await scanOnce();
      if (!result) {
        // User backed out of the scanner without scanning anything.
        return;
      }
      await haptics.success();
      const opId = await resolvePayload(result.value);
      if (opId) {
        navigate(`/m/op/${opId}`);
      } else {
        toast.error(
          t("scanner.notFound", "No operation matched: {{value}}", {
            value: result.value,
          }),
        );
      }
    } catch (error) {
      if (error instanceof ScannerUnavailableError) {
        toast.error(
          t(
            "scanner.unavailable",
            "Camera scanning is only available in the native iOS and Android apps",
          ),
        );
      } else if (error instanceof ScannerPermissionError) {
        await haptics.error();
        toast.error(
          t(
            "scanner.permissionDenied",
            "Enable camera access in your device settings to scan",
          ),
        );
      } else if (error instanceof Error) {
        await haptics.error();
        logger.error("MobileScanner", "Scan failed", error);
        toast.error(error.message);
      }
    } finally {
      setScanning(false);
    }
  }, [haptics, navigate, resolvePayload, t]);

  // On first arrival inside the native shell (iOS or Android), fire the
  // scanner immediately. The user came here to scan — making them tap a
  // "Start scanning" button is friction. Web/PWA stays user-initiated via the
  // camera button below: the route has no live preview target, so an
  // auto-triggered camera prompt would be a surprise UX regression.
  useEffect(() => {
    if (native.isNative && available) {
      void launchScan();
    }
  }, [native.isNative, available, launchScan]);

  const handleManual = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!manual.trim()) return;
    setResolving(true);
    try {
      const opId = await resolvePayload(manual);
      if (opId) {
        await haptics.success();
        navigate(`/m/op/${opId}`);
      } else {
        await haptics.warning();
        toast.error(
          t("scanner.notFound", "No operation matched: {{value}}", {
            value: manual,
          }),
        );
      }
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <MobileTopBar
        title={t("mobile.scan", "Scan")}
        showBack
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8 text-center">
        <div
          aria-hidden
          className="grid h-32 w-32 place-items-center rounded-3xl bg-primary/10 ring-1 ring-primary/30"
        >
          {scanning ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : (
            <ScanLine className="h-12 w-12 text-primary" />
          )}
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">
            {t("scanner.title", "Scan a job, part, or operation")}
          </h1>
          <p className="mx-auto max-w-[280px] text-sm text-muted-foreground">
            {available
              ? t(
                  "scanner.available",
                  "Point the camera at a printed QR or barcode. Eryxon will jump straight to the matching operation.",
                )
              : t(
                  "scanner.fallback",
                  "Camera scanning runs in the native iOS and Android apps. Type a code below to continue.",
                )}
          </p>
        </div>
        {available ? (
          <Button
            onClick={() => void launchScan()}
            disabled={scanning}
            className="h-12 w-full max-w-xs rounded-2xl text-[15px] font-semibold"
          >
            {scanning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ScanLine className="mr-2 h-4 w-4" />
            )}
            {t("scanner.openCamera", "Open camera")}
          </Button>
        ) : null}
        <form onSubmit={handleManual} className="w-full max-w-xs">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={manual}
              onChange={(event) => setManual(event.target.value)}
              placeholder={t(
                "scanner.manualPlaceholder",
                "Job, part, or operation ID",
              )}
              className="h-11 rounded-2xl bg-card/60 pl-9 pr-9 text-base"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
            />
            {manual ? (
              <button
                type="button"
                onClick={() => setManual("")}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-muted text-muted-foreground"
                aria-label="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={resolving || manual.trim() === ""}
            className="mt-3 h-11 w-full rounded-2xl"
          >
            {resolving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {t("scanner.findManual", "Find operation")}
          </Button>
        </form>
      </div>
    </div>
  );
}
