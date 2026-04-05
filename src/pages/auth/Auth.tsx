import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight, CheckCircle2, Info, Monitor } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AuthCardHeader, AuthShell } from "@/components/auth/AuthShell";
import { Link } from "react-router-dom";
import { ROUTES } from "@/routes";

export default function Auth() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signIn, signUp, profile } = useAuth();
  const navigate = useNavigate();

  if (profile) {
    if (profile.role === "admin") {
      navigate(ROUTES.ADMIN.DASHBOARD);
    } else {
      navigate(ROUTES.OPERATOR.WORK_QUEUE);
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        }
      } else {
        if (!fullName.trim()) {
          setError(t("auth.fullNameRequired"));
          setLoading(false);
          return;
        }

        if (!companyName.trim()) {
          setError(t("auth.companyNameRequired"));
          setLoading(false);
          return;
        }

        if (!termsAgreed) {
          setError(t("auth.mustAgreeToTerms"));
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, {
          full_name: fullName,
          company_name: companyName,
          role: "admin"
        });

        if (error) {
          setError(error.message);
        } else {
          setSuccess(t("auth.pendingApprovalMessage"));
          setEmail("");
          setPassword("");
          setFullName("");
          setCompanyName("");
          setTermsAgreed(false);
          setEmailConsent(false);
        }
      }
    } catch (err) {
      setError(t("auth.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell topRight={<LanguageSwitcher />}>
      <AuthCardHeader
        logoSrc="/favicon.svg"
        appName={t("auth.appName")}
        badge={t("auth.subtitle")}
        title={isLogin ? t("auth.signIn") : t("auth.signUp")}
      />

      {success && (
        <Alert className="mb-4 border-green-500/50 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-200">
            {success}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {!isLogin && (
          <>
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">
                {t("auth.fullName")} <span className="text-red-400">*</span>
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder={t("auth.fullNamePlaceholder")}
                className="bg-input-background border-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-medium">
                {t("auth.companyNameLabel")} <span className="text-red-400">*</span>
              </Label>
              <Input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                placeholder={t("auth.companyNamePlaceholder")}
                className="bg-input-background border-input"
              />
            </div>
          </>
        )}

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

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            {t("auth.password")} <span className="text-red-400">*</span>
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder={t("auth.passwordPlaceholder")}
            className="bg-input-background border-input"
          />
          {isLogin && (
            <div className="text-right">
              <Link
                to={ROUTES.FORGOT_PASSWORD}
                className="text-xs text-primary hover:underline"
              >
                {t("auth.forgotPassword")}
              </Link>
            </div>
          )}
        </div>

        {!isLogin && (
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="termsAgreed"
                checked={termsAgreed}
                onCheckedChange={(checked) => setTermsAgreed(checked === true)}
                className="mt-1"
              />
              <Label
                htmlFor="termsAgreed"
                className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
              >
                    {t("auth.agreeToTerms")}{" "}
                    <Link
                      to={ROUTES.COMMON.PRIVACY_POLICY}
                      className="text-primary hover:underline"
                      target="_blank"
                    >
                      {t("auth.privacyPolicy")}
                    </Link>{" "}
                    {t("auth.and")}{" "}
                    <Link
                      to={ROUTES.COMMON.TERMS_OF_SERVICE}
                      className="text-primary hover:underline"
                      target="_blank"
                    >
                      {t("auth.termsOfService")}
                    </Link>
                    {t("auth.emailConsent")}
                    <span className="text-red-400"> *</span>
              </Label>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("auth.gdprNotice")}
              </p>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full cta-button"
            disabled={loading || (!isLogin && !termsAgreed)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLogin ? t("auth.signIn") : t("auth.signUp")}
            <ArrowRight className="ml-2 h-4 w-4 arrow-icon" />
          </Button>
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccess(null);
            }}
            className="text-sm text-primary hover:underline"
          >
            {isLogin ? t("auth.noAccount") : t("auth.haveAccount")}
          </button>
        </div>
      </form>

      {isLogin && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Monitor className="h-4 w-4" />
            <span>{t("auth.shopFloorTerminal")}</span>
          </div>
          <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground/60">
            {t("auth.shopFloorTerminalHint")}
          </p>
        </div>
      )}
    </AuthShell>
  );
}
