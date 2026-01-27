import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowRight, Factory, CheckCircle2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import AnimatedBackground from "@/components/AnimatedBackground";
import { ROUTES } from "@/routes";

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoverySession(true);
      }
    });

    // Also check if there's already a session (user may have arrived and the event already fired)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsRecoverySession(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError(t("auth.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatedBackground />

      <div className="landing-container">
        <div className="absolute top-4 right-4 z-10">
          <LanguageSwitcher />
        </div>

        <div className="onboarding-card">
          <div className="icon-container">
            <Factory className="w-20 h-20 text-primary browser-icon" strokeWidth={1.5} />
          </div>

          <div className="title-container">
            <h1 className="main-title">{t("auth.appName")}</h1>
          </div>

          <hr className="title-divider" />

          {success ? (
            <div className="space-y-4">
              <h2 className="hero-title">{t("auth.passwordUpdated")}</h2>

              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-200">
                  {t("auth.passwordUpdatedDescription")}
                </AlertDescription>
              </Alert>

              <div className="pt-2">
                <Button
                  onClick={() => navigate(ROUTES.AUTH)}
                  className="w-full cta-button"
                >
                  {t("auth.signIn")}
                  <ArrowRight className="ml-2 h-4 w-4 arrow-icon" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="hero-title">{t("auth.forgotPasswordTitle")}</h2>

              <p className="informational-text">
                {t("auth.resetPasswordDescription")}
              </p>

              {!isRecoverySession && (
                <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
                  <AlertDescription className="text-yellow-200">
                    <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                    {t("auth.forgotPasswordDescription")}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    {t("auth.newPassword")} <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder={t("auth.newPasswordPlaceholder")}
                    className="bg-input-background border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    {t("auth.confirmNewPassword")} <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder={t("auth.confirmNewPasswordPlaceholder")}
                    className="bg-input-background border-input"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full cta-button"
                    disabled={loading || !isRecoverySession}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("auth.updatePassword")}
                    <ArrowRight className="ml-2 h-4 w-4 arrow-icon" />
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
