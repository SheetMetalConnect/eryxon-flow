import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useOperator } from "@/contexts/OperatorContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PinKeypad } from "@/components/terminal/PinKeypad";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import AnimatedBackground from "@/components/AnimatedBackground";
import {
  Factory,
  Loader2,
  Clock,
  User,
  KeyRound,
  Monitor,
  ArrowLeft,
  AlertTriangle,
  Lock,
  UserCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/routes";

/**
 * Terminal Login / Operator Switch Page
 *
 * Factory-friendly login experience for operators using employee ID and PIN.
 * Designed for:
 * - Touch screen terminals on the shop floor
 * - Quick operator authentication without email/password
 * - Multiple shifts with fast user switching
 *
 * Requires: User must already be logged in with a base account (admin/operator)
 */
export default function TerminalLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, user, loading: authLoading } = useAuth();
  const { activeOperator, verifyAndSwitchOperator, clearActiveOperator } = useOperator();

  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showKeypad, setShowKeypad] = useState(false);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate remaining lockout time
  const getLockoutRemaining = () => {
    if (!lockedUntil) return null;
    const remaining = Math.max(0, Math.ceil((lockedUntil.getTime() - currentTime.getTime()) / 1000 / 60));
    return remaining > 0 ? remaining : null;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleEmployeeIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeId.trim()) {
      setShowKeypad(true);
      setError(null);
      setErrorCode(null);
      setAttemptsRemaining(null);
      setLockedUntil(null);
    }
  };

  const handlePinSubmit = async () => {
    if (!employeeId.trim() || pin.length < 4) return;

    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const result = await verifyAndSwitchOperator(employeeId.trim(), pin);

      if (result.success) {
        // Successfully switched operator - go to work queue
        navigate(ROUTES.OPERATOR.WORK_QUEUE);
      } else {
        setErrorCode(result.error_code || null);
        setError(result.error_message || t("terminalLogin.invalidCredentials"));
        setAttemptsRemaining(result.attempts_remaining ?? null);
        setLockedUntil(result.locked_until || null);
        setPin("");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(t("terminalLogin.unexpectedError"));
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowKeypad(false);
    setPin("");
    setError(null);
    setErrorCode(null);
    setAttemptsRemaining(null);
    setLockedUntil(null);
  };

  const handleContinueAsCurrentOperator = () => {
    navigate(ROUTES.OPERATOR.WORK_QUEUE);
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in - redirect to auth
  if (!user || !profile) {
    return (
      <>
        <AnimatedBackground />
        <div className="landing-container min-h-screen">
          <div className="onboarding-card mt-16" style={{ maxWidth: "420px" }}>
            <div className="icon-container">
              <Lock className="w-20 h-20 text-primary browser-icon" strokeWidth={1.5} />
            </div>
            <div className="title-container">
              <h1 className="main-title">{t("terminalLogin.authRequired")}</h1>
              <p className="text-muted-foreground mt-2">
                {t("terminalLogin.authRequiredDesc")}
              </p>
            </div>
            <hr className="title-divider" />
            <Link to={ROUTES.AUTH}>
              <Button className="w-full h-12 cta-button">
                <Monitor className="h-5 w-5 mr-2" />
                {t("terminalLogin.goToLogin")}
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const lockoutRemaining = getLockoutRemaining();

  return (
    <>
      <AnimatedBackground />

      <div className="landing-container min-h-screen">
        {/* Header Bar with Time and Language */}
        <div className="fixed top-0 left-0 right-0 z-20 p-4 flex justify-between items-center">
          {/* Clock Display */}
          <div className="glass-card px-4 py-2 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xl font-bold tabular-nums">
                {formatTime(currentTime)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(currentTime)}
              </div>
            </div>
          </div>

          {/* Language & Navigation */}
          <div className="flex items-center gap-3">
            {profile?.role === "admin" && (
              <Link to={ROUTES.ADMIN.DASHBOARD}>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Monitor className="h-4 w-4 mr-2" />
                  {t("terminalLogin.adminDashboard")}
                </Button>
              </Link>
            )}
            <LanguageSwitcher />
          </div>
        </div>

        {/* Main Login Card */}
        <div className="onboarding-card mt-16" style={{ maxWidth: "420px" }}>
          {/* Factory Logo/Icon */}
          <div className="icon-container">
            <Factory
              className="w-24 h-24 text-primary browser-icon"
              strokeWidth={1.5}
            />
          </div>

          {/* Title */}
          <div className="title-container">
            <p className="welcome-text">{t("terminalLogin.welcome")}</p>
            <h1 className="main-title">{t("terminalLogin.terminalAccess")}</h1>
          </div>

          <hr className="title-divider" />

          {/* Show current operator if already selected */}
          {activeOperator && !showKeypad && (
            <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("terminalLogin.currentOperator")}</p>
                  <p className="font-bold">{activeOperator.full_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{activeOperator.employee_id}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleContinueAsCurrentOperator}
                  className="flex-1 cta-button"
                >
                  {t("terminalLogin.continueAs")} {activeOperator.full_name.split(' ')[0]}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => clearActiveOperator()}
                  className="flex-1"
                >
                  {t("terminalLogin.switchOperator")}
                </Button>
              </div>
            </div>
          )}

          {!showKeypad ? (
            /* Employee ID Entry */
            <form onSubmit={handleEmployeeIdSubmit} className="space-y-6">
              <div className="text-center mb-4">
                <User className="h-12 w-12 mx-auto text-primary/60 mb-2" />
                <h2 className="hero-title text-lg">
                  {activeOperator
                    ? t("terminalLogin.switchToAnother")
                    : t("terminalLogin.enterEmployeeId")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("terminalLogin.employeeIdHint")}
                </p>
              </div>

              <div className="space-y-2 text-left">
                <Label htmlFor="employeeId" className="text-sm font-medium">
                  {t("terminalLogin.employeeId")}
                </Label>
                <Input
                  id="employeeId"
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                  required
                  placeholder={t("terminalLogin.employeeIdPlaceholder")}
                  className="bg-input-background border-input text-center text-xl font-mono tracking-wider h-14"
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-lg font-semibold cta-button"
                disabled={!employeeId.trim()}
              >
                {t("terminalLogin.continue")}
              </Button>
            </form>
          ) : (
            /* PIN Entry with Keypad */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {t("terminalLogin.back")}
                </Button>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-bold">{employeeId}</span>
                </div>
              </div>

              <div className="text-center mb-4">
                <KeyRound className="h-10 w-10 mx-auto text-primary/60 mb-2" />
                <h2 className="hero-title text-lg">
                  {t("terminalLogin.enterPin")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("terminalLogin.pinHint")}
                </p>
              </div>

              {/* Error Messages */}
              {error && (
                <Alert
                  variant={errorCode === "LOCKED" ? "destructive" : "default"}
                  className={`mb-4 ${errorCode === "LOCKED" ? "border-red-500 bg-red-500/10" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {errorCode === "LOCKED" ? (
                      <Lock className="h-4 w-4 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                    )}
                    <div>
                      <AlertDescription>{error}</AlertDescription>
                      {lockoutRemaining && lockoutRemaining > 0 && (
                        <p className="text-xs mt-1 opacity-80">
                          {t("terminalLogin.tryAgainIn", { minutes: lockoutRemaining })}
                        </p>
                      )}
                      {attemptsRemaining !== null && attemptsRemaining > 0 && errorCode === "INVALID_PIN" && (
                        <p className="text-xs mt-1 opacity-80">
                          {t("terminalLogin.attemptsRemaining", { count: attemptsRemaining })}
                        </p>
                      )}
                    </div>
                  </div>
                </Alert>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">
                    {t("terminalLogin.verifying")}
                  </p>
                </div>
              ) : errorCode === "LOCKED" && lockoutRemaining && lockoutRemaining > 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Lock className="h-16 w-16 text-destructive mb-4" />
                  <p className="text-destructive font-semibold">
                    {t("terminalLogin.accountLocked")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("terminalLogin.tryAgainIn", { minutes: lockoutRemaining })}
                  </p>
                </div>
              ) : (
                <PinKeypad
                  value={pin}
                  onChange={setPin}
                  onSubmit={handlePinSubmit}
                  maxLength={6}
                  disabled={loading}
                />
              )}
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-xs text-muted-foreground text-center">
              {t("terminalLogin.helpText")}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="fixed bottom-4 left-0 right-0 text-center">
          <p className="text-xs text-muted-foreground/50">
            {t("terminalLogin.footerText")}
          </p>
        </div>
      </div>
    </>
  );
}
