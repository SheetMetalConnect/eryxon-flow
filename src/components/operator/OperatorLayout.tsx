import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "react-i18next";
import { DOCS_GUIDES_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ListChecks,
  Clock,
  Flag,
  LogOut,
  HelpCircle,
  Building2,
  Gauge,
  Factory,
  RefreshCw,
  UserCheck,
  ScanLine,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useOperator } from "@/contexts/OperatorContext";
import { OperatorSwitcher } from "./OperatorSwitcher";
import { OperatorStatusBar } from "./OperatorStatusBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AppTour } from "@/components/onboarding";
import { cn } from "@/lib/utils";
import { GlobalSearch, SearchTriggerButton } from "@/components/GlobalSearch";
import { NavigationButtons } from "@/components/NavigationButtons";
import { TrialStatusBanner } from "@/components/admin/TrialStatusBanner";
import { ROUTES } from "@/routes/constants";

interface OperatorLayoutProps {
  children: React.ReactNode;
  showBackToAdmin?: boolean;
}

export const OperatorLayout = ({
  children,
  showBackToAdmin = false,
}: OperatorLayoutProps) => {
  const { t } = useTranslation();
  const profile = useProfile();
  const { tenant } = useTenant();
  const { signOut } = useAuthActions();
  const { activeOperator } = useOperator();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  const navItems = [
    { path: "/operator/work-queue", label: t("navigation.workQueue"), icon: ListChecks },
    { path: "/operator/view", label: t("navigation.terminalView", "Terminal View"), icon: Gauge },
    { path: "/operator/my-activity", label: t("navigation.myActivity"), icon: Clock },
    { path: "/operator/my-issues", label: t("navigation.myIssues"), icon: Flag },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div className="relative flex min-h-dvh min-w-0 flex-col bg-background text-foreground">
        {/* Compact Header */}
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <div className="flex min-h-12 flex-wrap items-center justify-between gap-y-2 px-3 py-2 sm:px-4">
            {/* Left: Back to Admin or Tenant Name */}
            <div className="flex min-w-0 items-center gap-2">
              <div className="hidden sm:block"><NavigationButtons /></div>
              {showBackToAdmin ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/admin/dashboard")}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Factory className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {t("navigation.backToAdmin", "Back to Admin")}
                  </span>
                </Button>
              ) : (
                <>
                  <Building2 className="h-5 w-5 shrink-0 text-primary" />
                  <span className="max-w-[120px] truncate text-sm font-bold sm:max-w-[200px]">
                    {tenant?.company_name || tenant?.name || t("app.name")}
                  </span>
                </>
              )}
            </div>

            {/* Center: Cell selector slot + operator switcher */}
            <div className="order-3 flex w-full flex-wrap items-center justify-between gap-2 lg:order-none lg:w-auto lg:gap-3">
              <div id="terminal-header-slot" className="min-w-0" />
              {!activeOperator && (
                <OperatorSwitcher variant="button" className="h-8" />
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" aria-label={t("mobile.scanTitle", "Scan barcode or QR")}
                onClick={() => navigate("/operator/work-queue?scan=1")}><ScanLine className="h-4 w-4" /></Button>
              <SearchTriggerButton onClick={() => setSearchOpen(true)} compact />
              <ThemeToggle variant="dropdown" />
              <LanguageSwitcher />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
                    <Avatar className="h-7 w-7 border border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {profile?.full_name?.charAt(0).toUpperCase() || "O"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 border-border/80 bg-popover" align="end">
                  <div className="px-2 py-1.5">
                    <div className="text-xs font-semibold">{profile?.full_name}</div>
                    <div className="text-[10px] text-muted-foreground">{profile?.email}</div>
                  </div>
                  <DropdownMenuSeparator />
                  {activeOperator ? (
                    <>
                      <div className="border-b border-green-500/20 bg-green-500/5 px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-green-500" />
                          <div>
                            <span className="block text-xs font-bold text-green-500">
                              {activeOperator.full_name}
                            </span>
                            <span className="font-mono text-[10px] text-green-500/70">
                              {activeOperator.employee_id}
                            </span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                    </>
                  ) : null}
                  <DropdownMenuItem
                    onClick={() => navigate(ROUTES.OPERATOR.LOGIN)}
                    className="gap-1.5 text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t("operator.switchOperator")}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="gap-1.5 text-xs">
                    <a href={DOCS_GUIDES_URL} target="_blank" rel="noopener noreferrer">
                      <HelpCircle className="h-3.5 w-3.5" />
                      {t("common.helpAndDocs")}
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={signOut}
                    className="gap-1.5 text-xs text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {t("auth.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <OperatorStatusBar />

        <TrialStatusBanner />

        {/* Main Content */}
        <main className="min-w-0 flex-1 px-3 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-4 sm:pt-4">
          {children}
        </main>

        {/* Bottom Navigation — single nav, compact */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/98 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
          <div className="mx-auto grid h-14 max-w-lg grid-cols-4">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 transition-colors",
                  isActive(item.path)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span
                  className={cn(
                    "text-[10px] sm:text-xs",
                    isActive(item.path) ? "font-semibold" : "font-medium",
                  )}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </nav>

        {profile &&
        (profile as { tour_completed?: boolean }).tour_completed === false ? (
          <AppTour userRole="operator" />
        ) : null}
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
