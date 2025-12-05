import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/routes";

/**
 * Terminal Login Page
 *
 * Factory-friendly login experience for operators using employee ID and PIN.
 * Designed for:
 * - Touch screen terminals on the shop floor
 * - Quick operator authentication without email/password
 * - Multiple shifts with fast user switching
 */
export default function TerminalLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showKeypad, setShowKeypad] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (profile) {
      if (profile.role === "admin") {
        navigate(ROUTES.ADMIN.DASHBOARD);
      } else {
        navigate(ROUTES.OPERATOR.WORK_QUEUE);
      }
    }
  }, [profile, navigate]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    }
  };

  const handlePinSubmit = async () => {
    if (!employeeId.trim() || pin.length < 4) return;

    setLoading(true);
    setError(null);

    try {
      // Call the verify_operator_pin RPC function
      const { data, error: rpcError } = await supabase.rpc(
        "verify_operator_pin",
        {
          p_employee_id: employeeId.trim(),
          p_pin: pin,
        }
      );

      if (rpcError) {
        console.error("PIN verification error:", rpcError);
        setError(t("terminalLogin.invalidCredentials"));
        setPin("");
        return;
      }

      if (!data || !data.success) {
        setError(t("terminalLogin.invalidCredentials"));
        setPin("");
        return;
      }

      // PIN verified - sign in with the returned session token
      if (data.access_token && data.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError(t("terminalLogin.loginFailed"));
          setPin("");
          return;
        }

        // Navigate to operator work queue
        navigate(ROUTES.OPERATOR.WORK_QUEUE);
      } else {
        // Fallback: if no token returned, show success message
        setError(t("terminalLogin.loginFailed"));
        setPin("");
      }
    } catch (err) {
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
  };

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

          {/* Language & Admin Link */}
          <div className="flex items-center gap-3">
            <Link to={ROUTES.AUTH}>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Monitor className="h-4 w-4 mr-2" />
                {t("terminalLogin.adminLogin")}
              </Button>
            </Link>
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

          {!showKeypad ? (
            /* Employee ID Entry */
            <form onSubmit={handleEmployeeIdSubmit} className="space-y-6">
              <div className="text-center mb-4">
                <User className="h-12 w-12 mx-auto text-primary/60 mb-2" />
                <h2 className="hero-title text-lg">
                  {t("terminalLogin.enterEmployeeId")}
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

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">
                    {t("terminalLogin.verifying")}
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
