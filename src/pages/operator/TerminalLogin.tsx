import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useOperator } from "@/contexts/OperatorContext";
import { useAttendance, useOperatorsWithAttendance } from "@/hooks/useAttendance";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PinKeypad } from "@/components/terminal/PinKeypad";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Search,
  CheckCircle2,
  LogIn,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/routes";
import { toast } from "sonner";

interface OperatorWithAttendance {
  id: string;
  employee_id: string;
  full_name: string;
  active: boolean;
  last_login_at: string | null;
  is_clocked_in: boolean;
  attendance: {
    clock_in: string;
    target_hours: number;
    shift?: { name: string };
  } | null;
}

/**
 * Terminal Login / Operator Switch Page
 * 
 * Enhanced with:
 * - Operator selection grid (tap to select)
 * - Search/filter by name or ID
 * - Automatic clock-in when logging in
 * - Shows current clock-in status
 */
export default function TerminalLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, user, loading: authLoading } = useAuth();
  const { activeOperator, verifyAndSwitchOperator, clearActiveOperator } = useOperator();
  const { data: operators, isLoading: operatorsLoading } = useOperatorsWithAttendance();
  const { clockIn, isClockingIn } = useAttendance();

  const [selectedOperator, setSelectedOperator] = useState<OperatorWithAttendance | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter operators by search
  const filteredOperators = useMemo(() => {
    if (!operators) return [];
    if (!searchQuery.trim()) return operators;
    
    const query = searchQuery.toLowerCase();
    return operators.filter(
      (op) =>
        op.full_name.toLowerCase().includes(query) ||
        op.employee_id.toLowerCase().includes(query)
    );
  }, [operators, searchQuery]);

  const getLockoutRemaining = () => {
    if (!lockedUntil) return null;
    const remaining = Math.max(0, Math.ceil((lockedUntil.getTime() - currentTime.getTime()) / 1000 / 60));
    return remaining > 0 ? remaining : null;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  const formatClockInTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleOperatorSelect = (operator: OperatorWithAttendance) => {
    setSelectedOperator(operator);
    setShowKeypad(true);
    setError(null);
    setErrorCode(null);
    setAttemptsRemaining(null);
    setLockedUntil(null);
    setPin("");
  };

  const handlePinSubmit = async () => {
    if (!selectedOperator || pin.length < 4) return;

    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const result = await verifyAndSwitchOperator(selectedOperator.employee_id, pin);

      if (result.success) {
        // Clock in if not already clocked in
        if (!selectedOperator.is_clocked_in) {
          try {
            await clockIn({ operatorId: selectedOperator.id });
            toast.success(t("terminalLogin.clockedIn", "Clocked in successfully"));
          } catch (err) {
            console.error("Clock-in error:", err);
            // Don't block login if clock-in fails
          }
        }
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
    setSelectedOperator(null);
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
        {/* Header Bar */}
        <div className="fixed top-0 left-0 right-0 z-20 p-4 flex justify-between items-center">
          <div className="glass-card px-4 py-2 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xl font-bold tabular-nums">{formatTime(currentTime)}</div>
              <div className="text-xs text-muted-foreground">{formatDate(currentTime)}</div>
            </div>
          </div>

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

        {/* Main Content */}
        <div className="pt-24 pb-16 px-4 w-full max-w-4xl mx-auto">
          {!showKeypad ? (
            /* Operator Selection Grid */
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <Factory className="h-16 w-16 mx-auto text-primary mb-4" />
                <h1 className="text-2xl font-bold">{t("terminalLogin.selectOperator", "Select Operator")}</h1>
                <p className="text-muted-foreground">{t("terminalLogin.tapToSelect", "Tap your name or search below")}</p>
              </div>

              {/* Current operator info */}
              {activeOperator && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/20">
                        <UserCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("terminalLogin.currentOperator")}</p>
                        <p className="font-bold">{activeOperator.full_name}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleContinueAsCurrentOperator} className="cta-button">
                        {t("terminalLogin.continue")}
                      </Button>
                      <Button variant="outline" onClick={() => clearActiveOperator()}>
                        {t("terminalLogin.switchOperator")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={t("terminalLogin.searchOperator", "Search by name or ID...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>

              {/* Operators Grid */}
              {operatorsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredOperators.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t("terminalLogin.noOperatorsFound", "No operators found")}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredOperators.map((operator) => (
                      <button
                        key={operator.id}
                        onClick={() => handleOperatorSelect(operator)}
                        className={`
                          p-4 rounded-xl border-2 text-left transition-all
                          hover:scale-105 hover:shadow-lg
                          ${operator.is_clocked_in 
                            ? "border-primary bg-primary/10" 
                            : "border-border/50 bg-card/50 hover:border-primary/50"
                          }
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <User className="h-8 w-8 text-primary/60" />
                          {operator.is_clocked_in && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {t("terminalLogin.clockedIn", "In")}
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold text-sm truncate">{operator.full_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{operator.employee_id}</p>
                        {operator.is_clocked_in && operator.attendance && (
                          <p className="text-xs text-primary mt-1">
                            {t("terminalLogin.since", "Since")} {formatClockInTime(operator.attendance.clock_in)}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          ) : (
            /* PIN Entry */
            <div className="onboarding-card mx-auto" style={{ maxWidth: "420px" }}>
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {t("terminalLogin.back")}
                </Button>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-bold">{selectedOperator?.employee_id}</span>
                </div>
              </div>

              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{selectedOperator?.full_name}</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {selectedOperator?.is_clocked_in
                    ? t("terminalLogin.alreadyClockedIn", "Already clocked in")
                    : t("terminalLogin.willClockIn", "Will clock in on login")
                  }
                </p>
              </div>

              <div className="text-center mb-4">
                <KeyRound className="h-8 w-8 mx-auto text-primary/60 mb-2" />
                <h3 className="font-semibold">{t("terminalLogin.enterPin")}</h3>
                <p className="text-sm text-muted-foreground">{t("terminalLogin.pinHint")}</p>
              </div>

              {/* Error Messages */}
              {error && (
                <Alert
                  variant={errorCode === "LOCKED" ? "destructive" : "default"}
                  className="mb-4"
                >
                  <div className="flex items-start gap-2">
                    {errorCode === "LOCKED" ? <Lock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <div>
                      <AlertDescription>{error}</AlertDescription>
                      {lockoutRemaining && lockoutRemaining > 0 && (
                        <p className="text-xs mt-1">{t("terminalLogin.tryAgainIn", { minutes: lockoutRemaining })}</p>
                      )}
                      {attemptsRemaining !== null && attemptsRemaining > 0 && (
                        <p className="text-xs mt-1">{t("terminalLogin.attemptsRemaining", { count: attemptsRemaining })}</p>
                      )}
                    </div>
                  </div>
                </Alert>
              )}

              {loading || isClockingIn ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">
                    {isClockingIn ? t("terminalLogin.clockingIn", "Clocking in...") : t("terminalLogin.verifying")}
                  </p>
                </div>
              ) : errorCode === "LOCKED" && lockoutRemaining ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Lock className="h-16 w-16 text-destructive mb-4" />
                  <p className="text-destructive font-semibold">{t("terminalLogin.accountLocked")}</p>
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
        </div>

        {/* Footer */}
        <div className="fixed bottom-4 left-0 right-0 text-center">
          <p className="text-xs text-muted-foreground/50">{t("terminalLogin.footerText")}</p>
        </div>
      </div>
    </>
  );
}
