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
        // Sign up creates tenant with 'suspended' status - requires admin approval
        const { error } = await signUp(email, password, {
          full_name: fullName,
          company_name: companyName,
          role: "admin"
        });
        
        if (error) {
          setError(error.message);
        } else {
          setError(null);
          // Show success message
          setError("Account created! Your account is pending approval. You'll receive an email once activated.");
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
            Track jobs, manage operations, and monitor your shop floor in real-time. Sign in to access your manufacturing dashboard.
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
                    required
                    placeholder={t("auth.fullNamePlaceholder")}
                    className="bg-input-background border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-medium">
                    {t("auth.companyName")}
                  </Label>
                  <Input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={t("auth.companyNamePlaceholder")}
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

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full cta-button"
                disabled={loading}
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
                }}
                className="text-sm text-primary hover:underline"
              >
                {isLogin ? t("auth.noAccount") : t("auth.haveAccount")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
