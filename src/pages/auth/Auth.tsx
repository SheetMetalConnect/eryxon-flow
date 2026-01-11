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
  CheckCircle2,
  Info,
  Monitor,
  Globe,
  BookOpen,
  ClipboardList,
  Clock,
  Activity,
  Github,
  Factory
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ROUTES } from "@/routes";
import AnimatedBackground from "@/components/AnimatedBackground";

const SITE_URL = "https://eryxon.eu";
const GITHUB_URL = "https://github.com/SheetMetalConnect/eryxon-flow";
const GITHUB_ISSUES_URL = `${GITHUB_URL}/issues`;

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

  const features = [
    {
      icon: ClipboardList,
      titleKey: "auth.features.analytics.title",
      descKey: "auth.features.analytics.description",
      iconClass: "icon-blue"
    },
    {
      icon: Clock,
      titleKey: "auth.features.aiPowered.title",
      descKey: "auth.features.aiPowered.description",
      iconClass: "icon-yellow"
    },
    {
      icon: Activity,
      titleKey: "auth.features.security.title",
      descKey: "auth.features.security.description",
      iconClass: "icon-green"
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Header - Full Width */}
      <header className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Factory className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              <span className="text-xl sm:text-2xl font-bold tracking-tight">
                <span className="text-foreground">ERYXON</span>
                <span className="text-muted-foreground font-normal ml-1">FLOW</span>
              </span>
            </div>

            {/* Navigation & Controls */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Nav Links - Hidden on mobile */}
              <nav className="hidden md:flex items-center gap-4 mr-4">
                <a
                  href={SITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  {t("auth.nav.docs")}
                </a>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </nav>

              {/* Controls */}
              <div className="flex items-center gap-1 sm:gap-2">
                <ThemeToggle variant="icon" />
                <div className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Centered */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Auth Card */}
          <div className="glass-card p-6 sm:p-8 animate-fade-in-up">
            {/* Card Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {isLogin
                  ? t("auth.signInDescription")
                  : t("auth.signUpDescription")
                }
              </p>
            </div>

            {/* Success Message */}
            {success && (
              <Alert className="mb-4 border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-500">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">
                      {t("auth.fullName")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder={t("auth.fullNamePlaceholder")}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">
                      {t("auth.companyNameLabel")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      placeholder={t("auth.companyNamePlaceholder")}
                      className="h-11"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">
                  {t("auth.email")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t("auth.emailPlaceholder")}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {t("auth.password")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder={t("auth.passwordPlaceholder")}
                  className="h-11"
                />
              </div>

              {/* Terms - Sign Up Only */}
              {!isLogin && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="termsAgreed"
                      checked={termsAgreed}
                      onCheckedChange={(checked) => setTermsAgreed(checked === true)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="termsAgreed"
                      className="text-sm text-muted-foreground leading-relaxed cursor-pointer font-normal"
                    >
                      {t("auth.agreeToTerms")}{" "}
                      <Link to={ROUTES.COMMON.PRIVACY_POLICY} className="text-primary hover:underline" target="_blank">
                        {t("auth.privacyPolicy")}
                      </Link>{" "}
                      {t("auth.and")}{" "}
                      <Link to={ROUTES.COMMON.TERMS_OF_SERVICE} className="text-primary hover:underline" target="_blank">
                        {t("auth.termsOfService")}
                      </Link>
                      <span className="text-destructive"> *</span>
                    </Label>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
                    <Info className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t("auth.gdprNotice")}
                    </p>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="cta-button w-full h-11"
                disabled={loading || (!isLogin && !termsAgreed)}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLogin ? t("auth.signIn") : t("auth.signUp")}
                <ArrowRight className="h-4 w-4" />
              </Button>

              {/* Toggle Auth Mode */}
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

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t("auth.or")}</span>
              </div>
            </div>

            {/* Shop Floor Terminal Link */}
            <div className="text-center space-y-2">
              <Link
                to={ROUTES.OPERATOR.TERMINAL_LOGIN}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                <Monitor className="h-4 w-4" />
                {t("auth.shopFloorTerminal")}
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto">
                {t("auth.shopFloorTerminalHint")}
              </p>
            </div>
          </div>

          {/* Features Section - Below Card */}
          <div className="mt-8 hidden sm:block">
            <div className="grid grid-cols-3 gap-3">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="glass-card p-3 text-center transition-all hover:scale-[1.02]"
                >
                  <div className="inline-flex p-2 rounded-lg bg-primary/10 mb-2">
                    <feature.icon className={`h-4 w-4 ${feature.iconClass}`} />
                  </div>
                  <h3 className="font-medium text-xs mb-0.5">{t(feature.titleKey)}</h3>
                  <p className="text-[10px] text-muted-foreground leading-tight">{t(feature.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Full Width */}
      <footer className="relative z-10 w-full border-t border-border/50 bg-background/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4 text-xs text-muted-foreground">
            {/* Footer Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link to={ROUTES.COMMON.PRIVACY_POLICY} className="hover:text-foreground transition-colors">
                {t("auth.footer.privacy")}
              </Link>
              <Link to={ROUTES.COMMON.TERMS_OF_SERVICE} className="hover:text-foreground transition-colors">
                {t("auth.footer.terms")}
              </Link>
              <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                {t("auth.footer.docs")}
              </a>
              <a href={GITHUB_ISSUES_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                {t("auth.footer.support")}
              </a>
            </div>

            {/* Copyright */}
            <p className="text-center sm:text-right">
              © {new Date().getFullYear()} Sheet Metal Connect e.U. {t("auth.footer.allRightsReserved")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
