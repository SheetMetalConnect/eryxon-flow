import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight, Factory, CheckCircle2, Info, Monitor } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import AnimatedBackground from "@/components/AnimatedBackground";
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

  // Redirect if already logged in
  if (profile) {
    if (profile.role === "admin") {
      navigate("/dashboard");
    } else {
      navigate("/queue");
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
        // Validate required fields
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

        // Validate terms agreement
        if (!termsAgreed) {
          setError(t("auth.mustAgreeToTerms"));
          setLoading(false);
          return;
        }

        // Sign up creates tenant with 'suspended' status - requires admin approval
        const { error } = await signUp(email, password, {
          full_name: fullName,
          company_name: companyName,
          role: "admin"
        });

        if (error) {
          setError(error.message);
        } else {
          // Show success message
          setSuccess(t("auth.pendingApprovalMessage"));
          // Clear form
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
    <>
      <AnimatedBackground />

      <div className="landing-container">
        {/* Language Switcher - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <LanguageSwitcher />
        </div>

        {/* Main Auth Card */}
        <div className="onboarding-card">
          {/* Icon/Logo */}
          <div className="icon-container">
            <Factory className="w-32 h-32 text-primary browser-icon" strokeWidth={1.5} />
          </div>

          {/* Welcome Text */}
          <p className="welcome-text">
            {t("auth.welcomeTo")}
          </p>

          {/* Title Container with Preview Pill */}
          <div className="title-container">
            <h1 className="main-title">{t("auth.appName")}</h1>
            <p className="preview-pill">{t("auth.subtitle")}</p>
          </div>

          {/* Divider */}
          <hr className="title-divider" />

          {/* Hero Section Title */}
          <h2 className="hero-title">
            {isLogin ? t("auth.signIn") : t("auth.signUp")}
          </h2>

          {/* Informational Text */}
          <p className="informational-text">
            {isLogin ? t("auth.signInDescription") : t("auth.signUpDescription")}
          </p>

          {/* Success Message */}
          {success && (
            <Alert className="mb-4 border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-200">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Auth Form */}
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
            </div>

            {/* GDPR Checkboxes - Only show on Sign Up */}
            {!isLogin && (
              <div className="space-y-4 pt-2">
                {/* Terms and Privacy Policy Agreement */}
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
                      to="/privacy"
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("auth.privacyPolicy")}
                    </Link>{" "}
                    {t("auth.and")}{" "}
                    <Link
                      to="/terms"
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("auth.termsOfService")}
                    </Link>
                    {t("auth.emailConsent")}
                    <span className="text-red-400"> *</span>
                  </Label>
                </div>

                {/* GDPR Notice */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
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

            <div className="text-center pt-2">
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

          {/* Coming Soon Notice */}
          {!isLogin && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-muted-foreground text-center">
                {t("auth.comingSoonNotice")}
              </p>
            </div>
          )}

          {/* Shop Floor Terminal Info */}
          {isLogin && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Monitor className="h-4 w-4" />
                <span>{t("auth.shopFloorTerminal")}</span>
              </div>
              <p className="text-xs text-muted-foreground/60 text-center mt-2 leading-relaxed">
                {t("auth.shopFloorTerminalHint")}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
