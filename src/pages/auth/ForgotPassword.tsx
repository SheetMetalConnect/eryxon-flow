import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Factory, CheckCircle2, Mail } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AuthCardHeader, AuthShell } from "@/components/auth/AuthShell";
import { TurnstileWidget, useTurnstile } from "@/components/auth/TurnstileWidget";
import { ROUTES } from "@/routes";
import { logger } from "@/lib/logger";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { captchaToken, setCaptchaToken, resetKey, reset: resetTurnstile } = useTurnstile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${ROUTES.RESET_PASSWORD}`,
        captchaToken: captchaToken || undefined,
      });

      if (error) {
        logger.error('ForgotPassword', 'Password reset error', error.message);
        setError(t("auth.unexpectedError"));
      } else {
        setSuccess(true);
      }
    } catch (err) {
      logger.error('ForgotPassword', 'Password reset error', err);
      setError(t("auth.unexpectedError"));
    } finally {
      resetTurnstile();
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

          {TURNSTILE_SITE_KEY && (
            <div className="flex justify-center">
              <TurnstileWidget
                siteKey={TURNSTILE_SITE_KEY}
                onToken={setCaptchaToken}
                onError={() => setCaptchaToken(null)}
                onExpire={() => setCaptchaToken(null)}
                theme="dark"
                size="normal"
                resetKey={resetKey}
              />
            </div>
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
