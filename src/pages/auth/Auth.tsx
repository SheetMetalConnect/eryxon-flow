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
  BarChart3,
  Shield,
  Zap,
  ExternalLink,
  Github,
  Play
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ROUTES } from "@/routes";
import { cn } from "@/lib/utils";
import AnimatedBackground from "@/components/AnimatedBackground";

const DOCS_URL = "https://docs.eryxon.eu";
const GITHUB_URL = "https://github.com/SheetMetalConnect/eryxon-flow";
const APP_URL = "https://app.eryxon.eu";

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
    { icon: BarChart3, title: "Real-time Analytics", description: "Track OEE, efficiency, and quality metrics" },
    { icon: Zap, title: "AI-Powered", description: "MCP integration for intelligent automation" },
    { icon: Shield, title: "Enterprise Security", description: "Multi-tenant isolation & GDPR compliant" },
  ];

  return (
    <div className="min-h-screen flex relative">
      {/* Animated Background Orbs */}
      <AnimatedBackground />

      {/* Left Side - Hero/Marketing */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-gradient-to-br from-primary/5 via-transparent to-transparent overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--primary) / 0.15) 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-8 lg:p-12 xl:p-16 w-full">
          {/* Top - Logo & Navigation */}
          <div className="space-y-8">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <Factory className="h-8 w-8 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Eryxon</h1>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Manufacturing Execution</p>
              </div>
            </div>

            {/* Quick Links */}
            <nav className="flex items-center gap-6">
              <a 
                href={DOCS_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                Documentation
              </a>
              <a 
                href={`${DOCS_URL}/getting-started`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Rocket className="h-4 w-4" />
                Getting Started
              </a>
              <a 
                href={GITHUB_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </nav>
          </div>

          {/* Center - Main Marketing */}
          <div className="flex-1 flex flex-col justify-center py-12 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium w-fit mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Now in Public Preview
            </div>

            <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Modern MES for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                Sheet Metal
              </span>
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Track jobs, parts, and operations in real-time. Built for manufacturers who need 
              visibility without complexity.
            </p>

            {/* Feature Pills */}
            <div className="space-y-4">
              {features.map((feature, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 transition-colors hover:bg-card/80"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom - Demo CTA */}
          <div className="flex items-center gap-4">
            <Button variant="outline" size="lg" className="gap-2" asChild>
              <a href={`${DOCS_URL}/demo`} target="_blank" rel="noopener noreferrer">
                <Play className="h-4 w-4" />
                Watch Demo
              </a>
            </Button>
            <span className="text-sm text-muted-foreground">
              No credit card required
            </span>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex flex-col min-h-screen bg-background">
        {/* Header */}
        <header className="flex items-center justify-between p-4 lg:p-6">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <Factory className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <span className="font-semibold">Eryxon</span>
          </div>
          <div className="hidden lg:block" />
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle variant="icon" />
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-md space-y-6">
            {/* Form Header */}
            <div className="space-y-2 text-center lg:text-left">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                {isLogin ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-muted-foreground">
                {isLogin 
                  ? "Sign in to access your manufacturing dashboard" 
                  : "Start your 14-day free trial. No credit card required."
                }
              </p>
            </div>

            {/* Success Message */}
            {success && (
              <Alert className="border-green-500/50 bg-green-500/10">
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
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="John Doe"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">
                      Company Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      placeholder="Acme Manufacturing"
                      className="h-11"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="h-11"
                />
              </div>

              {/* Terms - Sign Up Only */}
              {!isLogin && (
                <div className="space-y-4 pt-2">
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
                      I agree to the{" "}
                      <Link to={ROUTES.COMMON.PRIVACY_POLICY} className="text-primary hover:underline" target="_blank">
                        Privacy Policy
                      </Link>{" "}
                      and{" "}
                      <Link to={ROUTES.COMMON.TERMS_OF_SERVICE} className="text-primary hover:underline" target="_blank">
                        Terms of Service
                      </Link>
                      <span className="text-destructive"> *</span>
                    </Label>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
                    <Info className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your data is stored securely in the EU. We're GDPR compliant and never share your information.
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
                className="w-full h-11 gap-2"
                disabled={loading || (!isLogin && !termsAgreed)}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLogin ? "Sign In" : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </Button>

              {/* Toggle */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Shop Floor Terminal */}
            <div className="text-center space-y-2">
              <Link 
                to={ROUTES.OPERATOR.TERMINAL_LOGIN}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Monitor className="h-4 w-4" />
                Shop Floor Terminal Login
                <ArrowRight className="h-3 w-3" />
              </Link>
              <p className="text-xs text-muted-foreground/60">
                For operators using shared terminals with PIN login
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-4 lg:p-6 border-t border-border/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <Link to={ROUTES.COMMON.PRIVACY_POLICY} className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link to={ROUTES.COMMON.TERMS_OF_SERVICE} className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                Docs
              </a>
              <a href={`${DOCS_URL}/support`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                Support
              </a>
            </div>
            <p>© {new Date().getFullYear()} Sheet Metal Connect e.U. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
