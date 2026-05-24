import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Fingerprint, KeyRound, Loader2, ScanFace } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOperator } from "@/contexts/OperatorContext";
import { useHaptics } from "@/hooks/useHaptics";
import { PinKeypad } from "@/components/terminal/PinKeypad";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { getBiometricAvailability, verifyIdentity } from "@/native";
import { ROUTES } from "@/routes";

const STORED_LAST_BADGE_KEY = "eryxon-flow:last-employee-id";

/**
 * Mobile-first operator login. Captures the employee badge first, then a
 * PIN via the existing keypad. Offers Face ID / Touch ID as a one-tap
 * unlock once an employee is set as the device's "remembered" operator.
 */
export default function MobileLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const haptics = useHaptics();
  const { verifyAndSwitchOperator } = useOperator();
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"badge" | "pin">("badge");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometric, setBiometric] = useState<"face" | "touch" | null>(null);
  const [rememberedBadge, setRememberedBadge] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getBiometricAvailability().then((info) => {
      if (cancelled) return;
      if (info.available && info.kind !== "none") setBiometric(info.kind);
    });
    // Defer the localStorage read so the synchronous setState doesn't run
    // inside the mount effect.
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const stored = window.localStorage.getItem(STORED_LAST_BADGE_KEY);
        if (stored) setRememberedBadge(stored);
      } catch {
        // localStorage may be locked down — proceed without remembered badge.
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const submitPin = async (badge: string, pinValue: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await verifyAndSwitchOperator(badge, pinValue);
      if (result.success) {
        // Pilot-critical operator lifecycle event (ERY-51).
        logger.info("Operator login", {
          component: "MobileLogin",
          service: "client",
          eventType: "operator.login",
          entityType: "operator",
          entityId: badge,
        });
        await haptics.success();
        try {
          window.localStorage.setItem(STORED_LAST_BADGE_KEY, badge);
        } catch {
          /* ignore */
        }
        navigate(ROUTES.OPERATOR.WORK_QUEUE, { replace: true });
      } else {
        logger.warn("Operator login rejected", {
          component: "MobileLogin",
          service: "client",
          eventType: "operator.login",
          failureReason: result.error_code || "operator_login_rejected",
          entityType: "operator",
          entityId: badge,
        });
        await haptics.error();
        setError(result.error_message || t("terminalLogin.invalidCredentials"));
        setPin("");
      }
    } catch (err) {
      await haptics.error();
      logger.error("Login failed", err, {
        component: "MobileLogin",
        service: "client",
        eventType: "operator.login",
        failureReason: "operator_login_error",
      });
      setError(t("terminalLogin.unexpectedError"));
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  const onPinSubmit = () => {
    if (pin.length < 4) return;
    void submitPin(employeeId.trim(), pin);
  };

  const onBadgeSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!employeeId.trim()) return;
    void haptics.light();
    setError(null);
    setStep("pin");
  };

  const tryBiometric = async () => {
    if (!rememberedBadge) return;
    void haptics.light();
    const ok = await verifyIdentity(
      t(
        "mobile.biometricReason",
        "Confirm operator to unlock the work queue.",
      ),
    );
    if (!ok) return;
    // Biometric just proves the device owner — we still need the operator's
    // PIN to satisfy server-side auth, so prefill the badge and pop the
    // keypad. The user only types the PIN, never the badge.
    setEmployeeId(rememberedBadge);
    setStep("pin");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div
        className="px-6 pt-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Eryxon Flow
          </span>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-6 px-6 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            {step === "badge"
              ? t("mobile.signIn", "Sign in to your terminal")
              : t("mobile.enterPin", "Enter PIN")}
          </h1>
          <p className="mx-auto mt-1 max-w-[300px] text-sm text-muted-foreground">
            {step === "badge"
              ? t(
                  "mobile.signInBody",
                  "Tap your employee badge or type it in to load your work queue.",
                )
              : `${t("mobile.signedInAs", "Signing in as")} ${employeeId}`}
          </p>
        </div>

        {step === "badge" ? (
          <form onSubmit={onBadgeSubmit} className="mx-auto w-full max-w-sm space-y-3">
            <Input
              autoFocus
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              placeholder={t("mobile.badgePlaceholder", "Employee badge")}
              className="h-14 rounded-2xl text-center text-lg font-semibold tracking-widest"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              enterKeyHint="next"
            />
            <Button
              type="submit"
              disabled={!employeeId.trim()}
              className="h-12 w-full rounded-2xl text-[15px] font-semibold"
            >
              <KeyRound className="mr-2 h-4 w-4" />
              {t("mobile.continue", "Continue")}
            </Button>
            {biometric && rememberedBadge ? (
              <button
                type="button"
                onClick={() => void tryBiometric()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/40 py-3 text-sm font-medium text-primary active:bg-card/70"
              >
                {biometric === "face" ? (
                  <ScanFace className="h-4 w-4" />
                ) : (
                  <Fingerprint className="h-4 w-4" />
                )}
                {biometric === "face"
                  ? t("mobile.unlockFace", "Unlock with Face ID")
                  : t("mobile.unlockTouch", "Unlock with Touch ID")}
              </button>
            ) : null}
          </form>
        ) : (
          <div className="mx-auto w-full max-w-sm space-y-4">
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-3 w-3 rounded-full transition-colors",
                    pin.length > index ? "bg-primary" : "bg-muted",
                  )}
                />
              ))}
            </div>
            <PinKeypad
              value={pin}
              onChange={(next) => {
                if (next.length > pin.length) void haptics.selection();
                setPin(next);
              }}
              onSubmit={onPinSubmit}
              disabled={busy}
            />
            <div className="flex items-center justify-between text-[12px] text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  setStep("badge");
                  setPin("");
                  setError(null);
                }}
                className="font-medium text-primary"
              >
                {t("common.back", "Back")}
              </button>
              {busy ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("mobile.verifying", "Verifying")}
                </span>
              ) : null}
            </div>
          </div>
        )}

        {error ? (
          <p className="text-center text-[13px] font-medium text-red-500">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
