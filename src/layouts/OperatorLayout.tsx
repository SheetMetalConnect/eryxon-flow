"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  List,
  Clock,
  AlertTriangle,
  LogOut,
  Sun,
  Moon,
  HelpCircle,
  Building2,
  Gauge,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeMode } from "@/theme/ThemeProvider";
import CurrentlyTimingWidget from "@/components/operator/CurrentlyTimingWidget";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AppTour } from "@/components/onboarding";
import { ROUTES } from "@/routes";
import { BrandLogo } from "@/components/ui/brand-logo";

interface OperatorLayoutProps {
  children: React.ReactNode;
}

export const OperatorLayout: React.FC<OperatorLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const { profile, tenant, signOut } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: ROUTES.OPERATOR.WORK_QUEUE, label: t("navigation.workQueue"), icon: List },
    { path: ROUTES.OPERATOR.VIEW, label: t("navigation.operatorView"), icon: Gauge },
    { path: ROUTES.OPERATOR.MY_ACTIVITY, label: t("navigation.myActivity"), icon: Clock },
    { path: ROUTES.OPERATOR.MY_ISSUES, label: t("navigation.myIssues"), icon: AlertTriangle },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top App Bar - Glassmorphism Header */}
      <header
        className={cn(
          "sticky top-0 z-50 w-full",
          "bg-[rgba(20,20,20,0.85)] backdrop-blur-xl",
          "border-b border-white/10",
          "shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
        )}
      >
        <div className="flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo/Brand */}
          <BrandLogo size="md" showName={true} />

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-white/10"
            >
              {mode === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* User Avatar and Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-white/10 px-2"
                >
                  <Avatar
                    className={cn(
                      "h-9 w-9",
                      "bg-gradient-to-br from-[#3a4656] to-[#0080ff]"
                    )}
                  >
                    <AvatarFallback className="bg-transparent text-white font-semibold">
                      {profile?.full_name?.charAt(0).toUpperCase() || "O"}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className={cn(
                  "w-56",
                  "bg-[rgba(20,20,20,0.95)] backdrop-blur-xl",
                  "border border-white/10",
                  "shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                )}
              >
                {/* Company/Tenant Section */}
                {tenant && (
                  <>
                    <div className="px-3 py-2 bg-primary/5 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-primary truncate">
                          {tenant.company_name || tenant.name}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-semibold">{profile?.full_name}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {profile?.email}
                    </span>
                    <Badge
                      className={cn(
                        "mt-1 w-fit text-[10px] uppercase",
                        "bg-gradient-to-r from-[#3a4656] to-[#0080ff]",
                        "text-white border-0"
                      )}
                    >
                      {t("app.operator")}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => navigate(ROUTES.COMMON.HELP)}
                  className="cursor-pointer focus:bg-white/10"
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  {t("docsAndHelp")}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={signOut}
                  className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("auth.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Desktop Navigation Tabs - Hidden on mobile */}
      <div
        className={cn(
          "hidden sm:block sticky top-16 z-40",
          "bg-[rgba(20,20,20,0.7)] backdrop-blur-lg",
          "border-b border-white/10"
        )}
      >
        <div className="flex gap-1 px-6 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg",
                  "text-sm font-medium transition-all duration-200",
                  isActive(item.path)
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Currently Timing Widget - Sticky below header */}
      <div
        className={cn(
          "sticky top-14 sm:top-[104px] z-30",
          "bg-background/95 backdrop-blur-sm",
          "border-b border-border"
        )}
      >
        <div className="px-4 sm:px-6 py-3">
          <CurrentlyTimingWidget />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6 pb-20 sm:pb-6">
        {children}
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "sm:hidden",
          "bg-[rgba(20,20,20,0.95)] backdrop-blur-xl",
          "border-t border-white/10",
          "shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
        )}
        data-tour="bottom-nav"
      >
        <div className="flex h-16 items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1",
                  "min-w-[64px] py-2 px-3",
                  "transition-colors duration-200",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-primary")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Onboarding Tour - only show if not completed */}
      {profile && !(profile as any).tour_completed && <AppTour userRole="operator" />}
    </div>
  );
};
