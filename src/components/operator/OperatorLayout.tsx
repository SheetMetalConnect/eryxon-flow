import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DOCS_GUIDES_URL } from '@/lib/config';
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
  Search,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOperator } from '@/contexts/OperatorContext';
import CurrentlyTimingWidget from './CurrentlyTimingWidget';
import { OperatorSwitcher, ActiveOperatorBadge } from './OperatorSwitcher';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AppTour } from '@/components/onboarding';
import AnimatedBackground from '@/components/AnimatedBackground';
import { cn } from '@/lib/utils';
import { GlobalSearch, SearchTriggerButton } from '@/components/GlobalSearch';
import { TrialStatusBanner } from '@/components/admin/TrialStatusBanner';
import { ROUTES } from '@/routes';

interface OperatorLayoutProps {
  children: React.ReactNode;
  showBackToAdmin?: boolean;
}

export const OperatorLayout = ({ children, showBackToAdmin = false }: OperatorLayoutProps) => {
  const { t } = useTranslation();
  const { profile, tenant, signOut } = useAuth();
  const { activeOperator } = useOperator();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  const navItems = [
    { path: '/operator/work-queue', label: t('navigation.workQueue'), icon: ListChecks },
    { path: '/operator/view', label: t('navigation.terminalView', 'Terminal View'), icon: Gauge },
    { path: '/operator/my-activity', label: t('navigation.myActivity'), icon: Clock },
    { path: '/operator/my-issues', label: t('navigation.myIssues'), icon: Flag },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <AnimatedBackground />
      <div className="relative flex flex-col min-h-screen bg-background">
        {/* Top Header - Glass Morphism - Compact */}
        <header className="sticky top-0 z-50 w-full glass-card border-b border-border-subtle">
          <div className="flex items-center justify-between h-12 px-3 sm:px-4">
            {/* Left: Back to Admin or Tenant/Company Name */}
            <div className="flex items-center gap-2 min-w-0">
              {showBackToAdmin ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin/dashboard')}
                  className="gap-1.5 text-xs h-8"
                >
                  <Factory className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('navigation.backToAdmin', 'Back to Admin')}</span>
                </Button>
              ) : (
                <>
                  <Building2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm font-bold truncate max-w-[120px] sm:max-w-[200px]">
                    {tenant?.company_name || tenant?.name || t('app.name')}
                  </span>
                </>
              )}
            </div>

            {/* Center: Active Operator - Always visible and prominent */}
            <div className="flex items-center gap-2">
              {activeOperator ? (
                <div className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                  <UserCheck className="h-3.5 w-3.5 text-green-500 shrink-0 hidden sm:block" />
                  <span className="text-xs font-bold text-green-500 truncate max-w-[80px] sm:max-w-[120px]">
                    {activeOperator.full_name}
                  </span>
                  <span className="text-[10px] text-green-500/70 font-mono hidden sm:block">
                    {activeOperator.employee_id}
                  </span>
                </div>
              ) : (
                <OperatorSwitcher variant="button" className="h-8" />
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-1.5">
              {/* Search Button */}
              <SearchTriggerButton onClick={() => setSearchOpen(true)} compact />

              {/* Theme & Language Switchers */}
              <ThemeToggle variant="dropdown" />
              <LanguageSwitcher />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
                    <Avatar className="h-7 w-7 border border-primary/20">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold text-xs">
                        {profile?.full_name?.charAt(0).toUpperCase() || 'O'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 glass-card" align="end">
                  {/* Tenant Info - Compact */}
                  {tenant && (
                    <>
                      <div className="px-2 py-1.5 bg-primary/5 border-b border-border-subtle">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-bold text-primary truncate">
                            {tenant.company_name || tenant.name}
                          </span>
                        </div>
                      </div>
                      <DropdownMenuSeparator className="bg-border-subtle" />
                    </>
                  )}

                  {/* Active Operator Info */}
                  {activeOperator && (
                    <>
                      <div className="px-2 py-1.5 bg-green-500/5 border-b border-green-500/20">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-green-500" />
                          <div>
                            <span className="text-xs font-bold text-green-500 block">
                              {activeOperator.full_name}
                            </span>
                            <span className="text-[10px] text-green-500/70 font-mono">
                              {activeOperator.employee_id}
                            </span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenuSeparator className="bg-border-subtle" />
                    </>
                  )}

                  {/* User Info - Compact */}
                  <div className="px-2 py-1.5">
                    <div className="text-xs font-semibold">{profile?.full_name}</div>
                    <div className="text-[10px] text-muted-foreground">{profile?.email}</div>
                    <div className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-gradient-to-r from-primary to-primary/60 text-primary-foreground">
                      {t('app.operator')}
                    </div>
                  </div>

                  <DropdownMenuSeparator className="bg-border-subtle" />

                  {/* Quick Switch Operator */}
                  <DropdownMenuItem
                    onClick={() => navigate(ROUTES.OPERATOR.LOGIN)}
                    className="gap-1.5 cursor-pointer focus:bg-white/5 text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t('operator.switchOperator')}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    asChild
                    className="gap-1.5 cursor-pointer focus:bg-white/5 text-xs"
                  >
                    <a href={DOCS_GUIDES_URL} target="_blank" rel="noopener noreferrer">
                      <HelpCircle className="h-3.5 w-3.5" />
                      {t('common.helpAndDocs')}
                    </a>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={signOut}
                    className="gap-1.5 cursor-pointer focus:bg-white/5 text-destructive focus:text-destructive text-xs"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {t('auth.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Trial Status Banner */}
        <TrialStatusBanner />

        {/* Currently Timing Widget - Sticky - Compact */}
        <div className="sticky top-12 z-40 border-b border-border-subtle glass-card">
          <div className="px-3 sm:px-4 py-2">
            <CurrentlyTimingWidget />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 px-3 sm:px-4 py-3 sm:py-4 pb-20">
          {children}
        </main>

        {/* Bottom Navigation - Fixed for all screen sizes */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-subtle glass-card">
          <div className="grid grid-cols-4 h-14 max-w-lg mx-auto">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 transition-base",
                  isActive(item.path)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive(item.path) && "text-primary")} />
                <span className={cn(
                  "text-[10px] sm:text-xs",
                  isActive(item.path) ? "font-semibold" : "font-medium"
                )}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </nav>

        {/* Onboarding Tour - only show if not completed and tour_completed is explicitly false */}
        {profile && (profile as any).tour_completed === false && <AppTour userRole="operator" />}
      </div>

      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
