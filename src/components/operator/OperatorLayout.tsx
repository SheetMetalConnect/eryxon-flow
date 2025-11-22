import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ListChecks,
  Clock,
  Flag,
  LogOut,
  HelpCircle,
  Building2,
  Gauge,
  Factory,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import CurrentlyTimingWidget from './CurrentlyTimingWidget';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AppTour } from '@/components/onboarding';
import AnimatedBackground from '@/components/AnimatedBackground';
import { cn } from '@/lib/utils';

interface OperatorLayoutProps {
  children: React.ReactNode;
}

export const OperatorLayout = ({ children }: OperatorLayoutProps) => {
  const { t } = useTranslation();
  const { profile, tenant, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/operator/work-queue', label: t('navigation.workQueue'), icon: ListChecks },
    { path: '/operator/view', label: 'Operator View', icon: Gauge },
    { path: '/operator/my-activity', label: t('navigation.myActivity'), icon: Clock },
    { path: '/operator/my-issues', label: t('navigation.myIssues'), icon: Flag },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <AnimatedBackground />
      <div className="relative flex flex-col min-h-screen bg-background">
        {/* Top Header - Glass Morphism */}
        <header className="sticky top-0 z-50 w-full glass-card border-b border-border-subtle">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3">
              <Factory className="h-8 w-8 text-primary" strokeWidth={1.5} />
              <span className="hidden sm:block text-lg font-bold hero-title">
                {t('app.name')}
              </span>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
                        {profile?.full_name?.charAt(0).toUpperCase() || 'O'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 glass-card" align="end">
                  {/* Tenant Info */}
                  {tenant && (
                    <>
                      <div className="px-3 py-2 bg-primary/5 border-b border-border-subtle">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="text-sm font-bold text-primary truncate">
                            {tenant.company_name || tenant.name}
                          </span>
                        </div>
                      </div>
                      <DropdownMenuSeparator className="bg-border-subtle" />
                    </>
                  )}

                  {/* User Info */}
                  <div className="px-3 py-2">
                    <div className="text-sm font-semibold">{profile?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{profile?.email}</div>
                    <div className="inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-semibold uppercase bg-gradient-to-r from-primary to-primary/60 text-primary-foreground">
                      {t('app.operator')}
                    </div>
                  </div>

                  <DropdownMenuSeparator className="bg-border-subtle" />

                  <DropdownMenuItem
                    onClick={() => navigate('/help')}
                    className="gap-2 cursor-pointer focus:bg-white/5"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Help & Docs
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={signOut}
                    className="gap-2 cursor-pointer focus:bg-white/5 text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('auth.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Currently Timing Widget - Sticky */}
        <div className="sticky top-16 z-40 border-b border-border-subtle glass-card">
          <div className="px-4 sm:px-6 py-3">
            <CurrentlyTimingWidget />
          </div>
        </div>

        {/* Desktop Navigation Tabs - Hidden on mobile */}
        <div className="hidden sm:block sticky top-[calc(4rem+theme(spacing.16))] z-30 border-b border-border-subtle glass-card">
          <div className="flex gap-1 px-6 py-2">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.path)}
                className={cn(
                  "gap-2 transition-base",
                  isActive(item.path)
                    ? "nav-item-active"
                    : "nav-item-hover"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6 pb-20 sm:pb-6">
          {children}
        </main>

        {/* Mobile Bottom Navigation - Fixed */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border-subtle glass-card">
          <div className="grid grid-cols-4 h-16">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-base",
                  isActive(item.path)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive(item.path) && "text-primary")} />
                <span className={cn(
                  "text-xs",
                  isActive(item.path) ? "font-semibold" : "font-medium"
                )}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </nav>

        {/* Onboarding Tour - only show if not completed */}
        {profile && !(profile as any).tour_completed && <AppTour userRole="operator" />}
      </div>
    </>
  );
};
