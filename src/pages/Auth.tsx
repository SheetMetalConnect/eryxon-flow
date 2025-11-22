import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight, Factory, Activity, Users, BarChart3, Shield } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Link } from "react-router-dom";

export default function Auth() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
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
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        }
      } else {
        if (!fullName || !companyName) {
          setError(t("auth.fillAllFields"));
          setLoading(false);
          return;
        }

        if (!agreedToTerms) {
          setError(t("auth.mustAgreeToTerms"));
          setLoading(false);
          return;
        }

        const { error, data } = await signUp(email, password, {
          full_name: fullName,
          role: "operator",
          company_name: companyName,
        });

        if (error) {
          setError(error.message);
        } else {
          setError(t("auth.checkEmail"));
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
            Welcome to
          </p>

          {/* Title Container with Preview Pill */}
          <div className="title-container">
            <h1 className="main-title">Eryxon Flow</h1>
            <p className="preview-pill">Manufacturing Execution System</p>
          </div>

          {/* Divider */}
          <hr className="title-divider" />

          {/* Hero Section Title */}
          <h2 className="hero-title">
            {isLogin ? t("auth.signIn") : t("auth.signUp")}
          </h2>

          {/* Informational Text */}
          <p className="informational-text">
            {isLogin
              ? "Track jobs, manage operations, and monitor your shop floor in real-time. Sign in to access your manufacturing dashboard."
              : "Create your account to start managing your manufacturing operations. Simple, beautiful, and powerful."}
          </p>

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">
                    {t("auth.fullName")}
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    placeholder={t("auth.fullNamePlaceholder")}
                    className="bg-input-background border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-medium">
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required={!isLogin}
                    placeholder="Acme Manufacturing"
                    className="bg-input-background border-input"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {t("auth.email")}
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
                {t("auth.password")}
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

            {!isLogin && (
              <div className="space-y-3 p-4 bg-muted/30 border border-border rounded-lg">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                    required={!isLogin}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="terms"
                      className="text-sm font-normal leading-relaxed cursor-pointer"
                    >
                      {t("auth.agreeToTerms")}{" "}
                      <a
                        href="/privacy-policy"
                        target="_blank"
                        className="text-primary underline hover:text-primary/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t("auth.privacyPolicy")}
                      </a>{" "}
                      {t("auth.and")}{" "}
                      <a
                        href="/terms-of-service"
                        target="_blank"
                        className="text-primary underline hover:text-primary/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t("auth.termsOfService")}
                      </a>
                      {t("auth.emailConsent")}
                    </Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pl-7">
                  {t("auth.gdprNotice")}
                </p>
              </div>
            )}

            {error && (
              <Alert variant={error.includes(t("auth.checkEmail")) ? "default" : "destructive"}>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full cta-button"
                disabled={loading || (!isLogin && !agreedToTerms)}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? t("auth.signIn") : t("auth.signUp")}
                <ArrowRight className="ml-2 h-4 w-4 arrow-icon" />
              </Button>
            </div>

            {/* Toggle Login/Signup */}
            <div className="pt-4 border-t border-border-subtle">
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-base"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
              >
                {isLogin
                  ? t("auth.noAccount")
                  : t("auth.haveAccount")}
              </button>
            </div>
          </form>

          {/* Features Section - Show on Signup */}
          {!isLogin && (
            <div className="use-cases-section">
              <h3 className="section-heading">Why Choose Eryxon Flow?</h3>
              <div className="use-cases-grid">
                <div className="use-case-card">
                  <Activity className="use-case-icon icon-blue" />
                  <span className="use-case-text">Real-time job and operation tracking</span>
                </div>
                <div className="use-case-card">
                  <Users className="use-case-icon icon-green" />
                  <span className="use-case-text">Operator-friendly touch interface</span>
                </div>
                <div className="use-case-card">
                  <BarChart3 className="use-case-icon icon-yellow" />
                  <span className="use-case-text">Quick Response Manufacturing metrics</span>
                </div>
                <div className="use-case-card">
                  <Shield className="use-case-icon icon-red" />
                  <span className="use-case-text">Secure multi-tenant architecture</span>
                </div>
              </div>
            </div>
          )}

          {/* Workflow Section - Show on Login */}
          {isLogin && (
            <div className="workflow-section">
              <p className="workflow-description">
                New to Eryxon Flow? Create an account to get started with our simple MES platform.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
