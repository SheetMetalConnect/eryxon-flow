import { useState } from "react";
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
  Search,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOperator } from "@/contexts/OperatorContext";
import CurrentlyTimingWidget from "./CurrentlyTimingWidget";
import { OperatorSwitcher } from "./OperatorSwitcher";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AppTour } from "@/components/onboarding";
import { cn } from "@/lib/utils";
import { GlobalSearch, SearchTriggerButton } from "@/components/GlobalSearch";
import { TrialStatusBanner } from "@/components/admin/TrialStatusBanner";
import { ROUTES } from "@/routes";
import { OperatorStatusChip } from "./OperatorStation";

interface OperatorLayoutProps {
  children: React.ReactNode;
  showBackToAdmin?: boolean;
}

export const OperatorLayout = ({
  children,
  showBackToAdmin = false,
}: OperatorLayoutProps) => {
  const { t } = useTranslation();
  const { profile, tenant, signOut } = useAuth();
  const { activeOperator } = useOperator();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  const navItems = [
    {
      path: "/operator/work-queue",
      label: t("navigation.workQueue"),
      icon: ListChecks,
      hint: t("navigation.workQueue", "Work queue"),
    },
    {
      path: "/operator/view",
      label: t("navigation.terminalView", "Terminal View"),
      icon: Gauge,
      hint: t("navigation.terminalView", "Terminal"),
    },
    {
      path: "/operator/my-activity",
      label: t("navigation.myActivity"),
      icon: Clock,
      hint: t("navigation.myActivity", "Activity"),
    },
    {
      path: "/operator/my-issues",
      label: t("navigation.myIssues"),
      icon: Flag,
      hint: t("navigation.myIssues", "Issues"),
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div className="relative flex min-h-screen flex-col bg-background text-foreground">
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-3 px-3 py-3 sm:px-4 lg:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {showBackToAdmin ? (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/admin/dashboard")}
                    className="min-h-11 gap-2 rounded-xl border-border/80 bg-card px-3"
                  >
                    <Factory className="h-4 w-4" />
                    <span>{t("navigation.backToAdmin", "Back to Admin")}</span>
                  </Button>
                ) : (
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted/30">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {t("navigation.terminalView", "Operator workspace")}
                      </div>
                      <div className="truncate text-base font-semibold">
                        {tenant?.company_name || tenant?.name || t("app.name")}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {activeOperator ? (
                  <OperatorStatusChip
                    icon={UserCheck}
                    tone="success"
                    label={`${activeOperator.full_name} • ${activeOperator.employee_id}`}
                    className="max-w-full sm:max-w-[360px]"
                  />
                ) : (
                  <OperatorSwitcher variant="button" className="min-h-11 rounded-xl" />
                )}

                <SearchTriggerButton onClick={() => setSearchOpen(true)} compact />
                <ThemeToggle variant="dropdown" />
                <LanguageSwitcher />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 rounded-full border-border/80 bg-card px-1.5"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {profile?.full_name?.charAt(0).toUpperCase() || "O"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 border-border/80 bg-popover" align="end">
                    <div className="px-3 py-2">
                      <div className="text-sm font-semibold">{profile?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{profile?.email}</div>
                    </div>
                    <DropdownMenuSeparator />
                    {activeOperator ? (
                      <>
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          {t("operator.switchOperator")}
                          <div className="mt-1 font-medium text-foreground">
                            {activeOperator.full_name} • {activeOperator.employee_id}
                          </div>
                        </div>
                        <DropdownMenuSeparator />
                      </>
                    ) : null}
                    <DropdownMenuItem
                      onClick={() => navigate(ROUTES.OPERATOR.LOGIN)}
                      className="min-h-11 gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t("operator.switchOperator")}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="min-h-11 gap-2">
                      <a href={DOCS_GUIDES_URL} target="_blank" rel="noopener noreferrer">
                        <HelpCircle className="h-4 w-4" />
                        {t("common.helpAndDocs")}
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={signOut}
                      className="min-h-11 gap-2 text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("auth.signOut")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="hidden gap-2 lg:grid lg:grid-cols-4">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex min-h-12 items-center justify-between rounded-2xl border px-4 text-left transition-colors",
                    isActive(item.path)
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border/80 bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <div>
                      <div className="text-sm font-semibold">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.hint}</div>
                    </div>
                  </div>
                  <Search className="h-4 w-4 opacity-0" />
                </button>
              ))}
            </div>
          </div>
        </header>

        <TrialStatusBanner />

        <div className="sticky top-[102px] z-40 border-b border-border bg-background/95 backdrop-blur-md lg:top-[154px]">
          <div className="mx-auto w-full max-w-screen-2xl px-3 py-2 sm:px-4 lg:px-6">
            <CurrentlyTimingWidget />
          </div>
        </div>

        <main className="mx-auto flex w-full max-w-screen-2xl flex-1 px-3 py-4 pb-24 sm:px-4 lg:px-6">
          <div className="w-full">{children}</div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/98 backdrop-blur-md">
          <div className="mx-auto grid h-16 max-w-screen-2xl grid-cols-4 px-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl transition-colors",
                  isActive(item.path)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[11px] font-semibold sm:text-xs">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {profile && (profile as { tour_completed?: boolean }).tour_completed === false ? (
          <AppTour userRole="operator" />
        ) : null}
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
