import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Loader2, 
  ArrowRight, 
  Factory, 
  CheckCircle2, 
  Info, 
  Monitor, 
  Globe,
  BookOpen,
  Rocket,
  Github,
  ExternalLink
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AlphaBanner } from "@/components/AlphaBanner";
import AnimatedBackground from "@/components/AnimatedBackground";
import { ROUTES } from "@/routes";

const DOCS_URL = "https://docs.eryxon.io";
const GITHUB_URL = "https://github.com/eryxon-io";

export default function Auth() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signIn, signUp, profile } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
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
        }
      }
    } catch (err) {
      setError(t("auth.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed Auth Header */}
      <header className="auth-header">
        <div className="alpha-banner">
          <AlphaBanner />
        </div>
        <div className="auth-header-controls">
          {/* Quick Links */}
          <nav className="hidden sm:flex items-center gap-4 mr-4">
            <a 
              href={DOCS_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Docs
            </a>
            <a 
              href={`${DOCS_URL}/getting-started`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Rocket className="h-3.5 w-3.5" />
              Get Started
            </a>
            <a 
              href={GITHUB_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="icon" />
            <div className="language-switcher-wrapper">
              <Globe className="language-switcher-icon" />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <AnimatedBackground />

      <div className="landing-container flex-1">
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

          {/* Shop Floor Terminal Info */}
          {isLogin && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <Link 
                to={ROUTES.OPERATOR.TERMINAL_LOGIN}
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Monitor className="h-4 w-4" />
                <span>{t("auth.shopFloorTerminal")}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
              <p className="text-xs text-muted-foreground/60 text-center mt-2 leading-relaxed">
                {t("auth.shopFloorTerminalHint")}
              </p>
            </div>
          )}

          {/* Coming Soon Notice */}
          {!isLogin && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-muted-foreground text-center">
                {t("auth.comingSoonNotice")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 px-6 border-t border-white/5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Link to={ROUTES.COMMON.PRIVACY_POLICY} className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to={ROUTES.COMMON.TERMS_OF_SERVICE} className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1">
              Docs <ExternalLink className="h-2.5 w-2.5" />
            </a>
            <a href={`${DOCS_URL}/support`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1">
              Support <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
          <p>© {new Date().getFullYear()} Eryxon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
