import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  LogOut,
  LayoutDashboard,
  ListChecks,
  Settings,
  AlertCircle,
  UserCheck,
  BookOpen,
  Briefcase,
  Package,
  Plug,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  Store,
  Clock,
  Layers,
  Database,
  Wrench,
  FileText,
  DollarSign,
  Users,
  Key,
  Webhook,
  FileDown,
  HelpCircle,
  CreditCard,
  Code,
  Eye,
  ListTodo,
  Activity,
  Flag,
  Info,
  Factory,
  Truck,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePendingIssuesCount } from "@/hooks/usePendingIssuesCount";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ROUTES } from "@/routes";
import { useTranslation } from "react-i18next";
import AnimatedBackground from "@/components/AnimatedBackground";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation();
  const { profile, tenant, signOut } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [operatorViewsOpen, setOperatorViewsOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { count: pendingIssuesCount } = usePendingIssuesCount();

  const isActive = (path: string) => location.pathname === path;
  const isActiveGroup = (...paths: string[]) => paths.some(path => location.pathname.startsWith(path));

  // Main navigation - Daily operations (always visible)
  const mainNavItems = [
    {
      path: ROUTES.ADMIN.DASHBOARD,
      label: t("navigation.dashboard"),
      icon: LayoutDashboard,
      exact: true,
    },
    {
      path: ROUTES.ADMIN.JOBS,
      label: t("navigation.jobs"),
      icon: Briefcase,
      activePaths: [ROUTES.ADMIN.JOBS],
    },
    {
      path: ROUTES.ADMIN.PARTS,
      label: t("navigation.parts"),
      icon: Package,
      exact: true,
    },
    {
      path: ROUTES.ADMIN.OPERATIONS,
      label: t("navigation.operations"),
      icon: Layers,
      exact: true,
    },
    {
      path: ROUTES.ADMIN.ASSIGNMENTS,
      label: t("navigation.assignments"),
      icon: UserCheck,
      exact: true,
    },
    {
      path: ROUTES.ADMIN.ISSUES,
      label: t("navigation.issues"),
      icon: AlertCircle,
      exact: true,
      badge: pendingIssuesCount,
    },
    {
      path: ROUTES.ADMIN.ACTIVITY,
      label: t("navigation.activityMonitor"),
      icon: Clock,
      exact: true,
    },
    {
      path: ROUTES.ADMIN.SHIPPING,
      label: t("navigation.shipping"),
      icon: Truck,
      exact: true,
    },
  ];

  // Operator views - Admin can see what operators see
  const operatorViewItems = [
    {
      path: ROUTES.OPERATOR.WORK_QUEUE,
      label: t("navigation.workQueue"),
      icon: ListTodo,
      exact: true,
    },
    {
      path: ROUTES.OPERATOR.VIEW,
      label: t("navigation.operatorView"),
      icon: Eye,
      exact: true,
    },
    {
      path: ROUTES.OPERATOR.MY_ACTIVITY,
      label: t("navigation.myActivity"),
      icon: Activity,
      exact: true,
    },
    {
      path: ROUTES.OPERATOR.MY_ISSUES,
      label: t("navigation.myIssues"),
      icon: Flag,
      exact: true,
    },
  ];

  // Configuration - Setup tasks (rarely changed)
  const configNavItems = [
    {
      path: ROUTES.ADMIN.CONFIG.STAGES,
      label: t("navigation.stages"),
      icon: Database,
      exact: true,
    },
    {
      path: ROUTES.ADMIN.CONFIG.MATERIALS,
      label: t("navigation.materials"),
      icon: Wrench,
      exact: true,
    },
    {
      path: ROUTES.ADMIN.CONFIG.RESOURCES,
      label: t("navigation.resources"),
      icon: Wrench,
      exact: true,
    },
    {
      path: ROUTES.ADMIN.CONFIG.USERS,
      label: t("navigation.users"),
      icon: Users,
      exact: true,
    },
    {
      path: ROUTES.ADMIN.CONFIG.STEPS_TEMPLATES,
      label: t("navigation.templates"),
      icon: FileText,
      exact: true,
    },
    {
      path: ROUTES.ADMIN.CONFIG.API_KEYS,
      label: t("navigation.apiKeys"),
      icon: Key,
      exact: true,
    },
    {
      path: ROUTES.ADMIN.CONFIG.WEBHOOKS,
      label: t("navigation.webhooks"),
      icon: Webhook,
      exact: true,
    },
  ];

  // Integrations - Developer tools
  const integrationsNavItems = [
    {
      path: ROUTES.ADMIN.INTEGRATIONS,
      label: t("navigation.integrations"),
      icon: Store,
      exact: true,
    },
    {
      path: ROUTES.ADMIN.DATA_EXPORT,
      label: t("navigation.dataExport"),
      icon: FileDown,
      exact: true,
    },
    {
      path: ROUTES.COMMON.API_DOCS,
      label: t("apiDocumentation"),
      icon: FileText,
      exact: true,
    },
  ];

  // Account & Support
  const accountNavItems = [
    {
      path: ROUTES.COMMON.MY_PLAN,
      label: t("myPlan"),
      icon: CreditCard,
      exact: true,
    },
    {
      path: ROUTES.COMMON.PRICING,
      label: t("navigation.pricing"),
      icon: DollarSign,
      exact: true,
    },
    {
      path: ROUTES.ADMIN.SETTINGS,
      label: t("navigation.settings"),
      icon: Settings,
      exact: true,
    },
    {
      path: ROUTES.COMMON.HELP,
      label: t("help"),
      icon: HelpCircle,
      exact: true,
    },
    {
      path: ROUTES.COMMON.ABOUT,
      label: t("about"),
      icon: Info,
      exact: true,
    },
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <Factory className="h-8 w-8 text-primary" strokeWidth={1.5} />
          {!collapsed && (
            <span className="text-lg font-bold hero-title">
              Eryxon Flow
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        {/* Main Navigation - Daily Operations */}
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const isItemActive = item.exact
              ? isActive(item.path)
              : item.activePaths
                ? isActiveGroup(...item.activePaths)
                : location.pathname.startsWith(item.path);

            return (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 nav-item-hover",
                    collapsed && "justify-center px-2",
                    isItemActive && "nav-item-active"
                  )}
                  size="sm"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                  {collapsed && item.badge !== undefined && item.badge > 0 && (
                    <div className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
                  )}
                </Button>
              </Link>
            );
          })}
        </div>

        {!collapsed && <Separator className="my-4" />}

        {/* Operator Views Section - Collapsible */}
        {!collapsed && (
          <Collapsible open={operatorViewsOpen} onOpenChange={setOperatorViewsOpen} className="space-y-1">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 font-semibold text-muted-foreground"
              >
                <Eye className="h-4 w-4" />
                <span className="flex-1 text-left">{t("navigation.operatorViews")}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    operatorViewsOpen && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pl-4">
              {operatorViewItems.map((item) => {
                const isItemActive = item.exact
                  ? isActive(item.path)
                  : location.pathname.startsWith(item.path);

                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 nav-item-hover",
                        isItemActive && "nav-item-active"
                      )}
                      size="sm"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {!collapsed && <Separator className="my-4" />}

        {/* Configuration Section - Collapsible */}
        {!collapsed && (
          <Collapsible open={configOpen} onOpenChange={setConfigOpen} className="space-y-1">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 font-semibold text-muted-foreground"
              >
                <Settings className="h-4 w-4" />
                <span className="flex-1 text-left">{t("navigation.configuration")}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    configOpen && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pl-4">
              {configNavItems.map((item) => {
                const isItemActive = item.exact
                  ? isActive(item.path)
                  : location.pathname.startsWith(item.path);

                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 nav-item-hover",
                        isItemActive && "nav-item-active"
                      )}
                      size="sm"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {!collapsed && <Separator className="my-4" />}

        {/* Integrations Section - Collapsible */}
        {!collapsed && (
          <Collapsible open={integrationsOpen} onOpenChange={setIntegrationsOpen} className="space-y-1">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 font-semibold text-muted-foreground"
              >
                <Plug className="h-4 w-4" />
                <span className="flex-1 text-left">{t("navigation.integrations")}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    integrationsOpen && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pl-4">
              {integrationsNavItems.map((item) => {
                const isItemActive = item.exact
                  ? isActive(item.path)
                  : location.pathname.startsWith(item.path);

                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 nav-item-hover",
                        isItemActive && "nav-item-active"
                      )}
                      size="sm"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {!collapsed && <Separator className="my-4" />}

        {/* Account & Support Section - Collapsible */}
        {!collapsed && (
          <Collapsible open={accountOpen} onOpenChange={setAccountOpen} className="space-y-1">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 font-semibold text-muted-foreground"
              >
                <CreditCard className="h-4 w-4" />
                <span className="flex-1 text-left">{t("navigation.accountAndSupport")}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    accountOpen && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pl-4">
              {accountNavItems.map((item) => {
                const isItemActive = item.exact
                  ? isActive(item.path)
                  : location.pathname.startsWith(item.path);

                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 nav-item-hover",
                        isItemActive && "nav-item-active"
                      )}
                      size="sm"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}
      </ScrollArea>

      {/* User Profile & Sign Out */}
      <div className="border-t p-3">
        {!collapsed && tenant && (
          <div className="mb-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
            <div className="text-xs text-muted-foreground mb-1">Tenant</div>
            <div className="text-sm font-medium truncate">{tenant.company_name || tenant.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs capitalize">
                {tenant.plan}
              </Badge>
              <Badge
                variant={tenant.status === 'active' ? 'default' : 'outline'}
                className="text-xs capitalize"
              >
                {tenant.status}
              </Badge>
            </div>
          </div>
        )}
        {!collapsed && profile && (
          <div className="mb-2 rounded-lg bg-muted p-3">
            <div className="text-sm font-medium truncate">{profile.full_name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {profile.role}
            </div>
          </div>
        )}
        <div className={cn("mb-2 flex", collapsed ? "justify-center" : "justify-start")}>
          <LanguageSwitcher />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={signOut}
          className={cn(
            "w-full gap-2",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && t("auth.signOut")}
        </Button>
      </div>

      {/* Collapse Toggle (Desktop) */}
      {!mobileOpen && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 hidden h-6 w-6 rounded-full border bg-background p-0 lg:flex"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );

  return (
    <>
      <AnimatedBackground />
      <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r sidebar-glass transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          "hidden border-r sidebar-glass transition-all lg:block",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="relative h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 pt-16 lg:p-6 lg:pt-6">
          {children}
        </div>
      </main>
      </div>
    </>
  );
}
