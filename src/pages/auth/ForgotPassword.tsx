import { useState, useRef, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Factory, CheckCircle2, Mail } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AuthCardHeader, AuthShell } from "@/components/auth/AuthShell";
import { ROUTES } from "@/routes";
import { logger } from "@/lib/logger";

const TURNSTILE_ENABLED = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);
const LazyTurnstile = TURNSTILE_ENABLED
  ? lazy(() =>
      import("@marsidev/react-turnstile").then((m) => ({
        default: m.Turnstile,
      })),
    )
  : null;

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const captchaResolveRef = useRef<((token: string) => void) | null>(null);

  // Get a fresh Turnstile token right before submission so it never expires.
  const getFreshCaptchaToken = (): Promise<string | undefined> => {
    if (!TURNSTILE_ENABLED) return Promise.resolve(undefined);
    return new Promise((resolve, reject) => {
      captchaResolveRef.current = resolve;
      turnstileRef.current?.reset();
      turnstileRef.current?.execute();
      const timeout = setTimeout(() => {
        captchaResolveRef.current = null;
        reject(new Error("Captcha verification timed out"));
      }, 30_000);
      const origResolve = resolve;
      captchaResolveRef.current = (token: string) => {
        clearTimeout(timeout);
        origResolve(token);
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let freshToken: string | undefined;
      try {
        freshToken = await getFreshCaptchaToken();
      } catch {
        setError(t("auth.captchaError"));
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${ROUTES.RESET_PASSWORD}`,
        captchaToken: freshToken,
      });

      if (error) {
        logger.error('ForgotPassword', 'Password reset error', error.message);
        setCaptchaToken(null);
        setError(t("auth.unexpectedError"));
      } else {
        setSuccess(true);
      }
    } catch (err) {
      logger.error('ForgotPassword', 'Password reset error', err);
      setCaptchaToken(null);
      setError(t("auth.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell topRight={<LanguageSwitcher />}>
      <AuthCardHeader
        icon={Factory}
        appName={t("auth.appName")}
        title={t("auth.forgotPasswordTitle")}
        description={t("auth.forgotPasswordDescription")}
      />

      {success ? (
        <div className="space-y-4">
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-200">
              {t("auth.resetLinkSent")}
            </AlertDescription>
          </Alert>

          <div className="flex justify-center pt-2">
            <Mail className="h-12 w-12 text-primary opacity-60" />
          </div>

          <div className="pt-2 text-center">
            <Link
              to={ROUTES.AUTH}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-3 w-3" />
              {t("auth.backToSignIn")}
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              {t("auth.email")} <span className="text-red-400">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t("auth.emailPlaceholder")}
              className="bg-input-background border-input"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {TURNSTILE_ENABLED && LazyTurnstile && (
            <Suspense
              fallback={
                <div className="flex justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <div className="flex justify-center">
                <LazyTurnstile
                  ref={turnstileRef}
                  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY!}
                  onSuccess={(token: string) => {
                    setCaptchaToken(token);
                    if (captchaResolveRef.current) {
                      captchaResolveRef.current(token);
                      captchaResolveRef.current = null;
                    }
                  }}
                  onError={() => {
                    setError(t("auth.captchaError"));
                    setCaptchaToken(null);
                  }}
                  onExpire={() => {
                    setCaptchaToken(null);
                  }}
                  options={{
                    theme: "dark",
                    size: "normal",
                    execution: "execute",
                  }}
                />
              </div>
            </Suspense>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full cta-button"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("auth.sendResetLink")}
            </Button>
          </div>

          <div className="pt-2 text-center">
            <Link
              to={ROUTES.AUTH}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-3 w-3" />
              {t("auth.backToSignIn")}
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
