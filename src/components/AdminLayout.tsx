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
  FileUp,
  HelpCircle,
  CreditCard,
  Code,
  Eye,
  ListTodo,
  Activity,
  Flag,
  Info,
  Factory,
  CalendarClock,
  Radio,
  Truck,
  Search,
  Building2,
} from "lucide-react";
import { TenantSwitcher } from "@/components/admin/TenantSwitcher";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePendingIssuesCount } from "@/hooks/usePendingIssuesCount";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import AnimatedBackground from "@/components/AnimatedBackground";
import { McpServerStatus } from "@/components/admin/McpServerStatus";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTranslation } from "react-i18next";
import { GlobalSearch, SearchTriggerButton } from "@/components/GlobalSearch";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

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
  const [monitoringOpen, setMonitoringOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tenantSwitcherOpen, setTenantSwitcherOpen] = useState(false);
  const { count: pendingIssuesCount } = usePendingIssuesCount();
  const { flags: featureFlags } = useFeatureFlags();

  const isActive = (path: string) => location.pathname === path;
  const isActiveGroup = (...paths: string[]) => paths.some(path => location.pathname.startsWith(path));

  // Main navigation - Daily operations (always visible)
  const mainNavItems = [
    {
      path: "/admin/dashboard",
      label: t("navigation.dashboard"),
      icon: LayoutDashboard,
      exact: true,
    },
    {
      path: "/admin/jobs",
      label: t("navigation.jobs"),
      icon: Briefcase,
      activePaths: ["/admin/jobs"],
    },
    {
      path: "/admin/parts",
      label: t("navigation.parts"),
      icon: Package,
      exact: true,
    },
    {
      path: "/admin/operations",
      label: t("navigation.operations"),
      icon: Layers,
      exact: true,
    },
    ...(featureFlags.assignments ? [{
      path: "/admin/assignments",
      label: t("navigation.assignments"),
      icon: UserCheck,
      exact: true,
    }] : []),
    ...(featureFlags.issues ? [{
      path: "/admin/issues",
      label: t("navigation.issues"),
      icon: AlertCircle,
      exact: true,
      badge: pendingIssuesCount,
    }] : []),
    ...(featureFlags.capacity ? [{
      path: "/admin/capacity",
      label: t("navigation.capacity"),
      icon: CalendarClock,
      exact: true,
    }] : []),
  ];

  // Monitoring - Activity tracking only
  const monitoringNavItems = [
    {
      path: "/admin/activity",
      label: t("navigation.activity"),
      icon: Clock,
      exact: true,
    },
  ];


  // Operator views - Admin can see what operators see
  const operatorViewItems = [
    {
      path: "/operator/work-queue",
      label: t("navigation.cellOverview", "Cell Overview"),
      icon: ListTodo,
      exact: true,
    },
    {
      path: "/operator/view",
      label: t("navigation.terminalView", "Terminal View"),
      icon: Eye,
      exact: true,
    },
    {
      path: "/operator/my-activity",
      label: t("navigation.myActivity"),
      icon: Activity,
      exact: true,
    },
    {
      path: "/operator/my-issues",
      label: t("navigation.myIssues"),
      icon: Flag,
      exact: true,
    },
  ];

  // Configuration - Setup tasks (rarely changed)
  const configNavItems = [
    {
      path: "/admin/config/stages",
      label: t("navigation.cells"),
      icon: Database,
      exact: true,
    },
    {
      path: "/admin/config/calendar",
      label: t("navigation.calendar"),
      icon: CalendarClock,
      exact: true,
    },
    {
      path: "/admin/config/materials",
      label: t("navigation.materials"),
      icon: Wrench,
      exact: true,
    },
    {
      path: "/admin/config/resources",
      label: t("navigation.resources"),
      icon: Wrench,
      exact: true,
    },
    {
      path: "/admin/config/users",
      label: t("navigation.users"),
      icon: Users,
      exact: true,
    },
    {
      path: "/admin/config/steps-templates",
      label: t("navigation.templates"),
      icon: FileText,
      exact: true,
    },
  ];

  // Integrations - Developer tools, APIs, and external connections
  const integrationsNavItems = [
    {
      path: "/admin/integrations",
      label: t("navigation.appStore"),
      icon: Store,
      exact: true,
    },
    {
      path: "/admin/config/api-keys",
      label: t("navigation.apiKeys"),
      icon: Key,
      exact: true,
    },
    {
      path: "/admin/mcp-setup",
      label: t("navigation.mcpSetup"),
      icon: Code,
      exact: true,
    },
    {
      path: "/admin/config/webhooks",
      label: t("navigation.webhooks"),
      icon: Webhook,
      exact: true,
    },
    {
      path: "/admin/config/mqtt-publishers",
      label: t("navigation.mqttPublishers"),
      icon: Radio,
      exact: true,
    },
    {
      path: "/admin/data-import",
      label: t("navigation.dataImport"),
      icon: FileUp,
      exact: true,
    },
    {
      path: "/admin/data-export",
      label: t("navigation.dataExport"),
      icon: FileDown,
      exact: true,
    },
    {
      path: "/admin/api-docs",
      label: t("navigation.apiDocs"),
      icon: Code,
      exact: true,
    },
  ];

  // Account & Support
  const accountNavItems = [
    {
      path: "/admin/my-plan",
      label: t("navigation.myPlan"),
      icon: CreditCard,
      exact: true,
    },
    {
      path: "/admin/pricing",
      label: t("navigation.pricing"),
      icon: DollarSign,
      exact: true,
    },
    {
      path: "/admin/settings",
      label: t("navigation.settings"),
      icon: Settings,
      exact: true,
    },
    {
      path: "/admin/about",
      label: t("navigation.about"),
      icon: Info,
      exact: true,
    },
  ];

  // External links (open in new tab)
  const externalLinks = [
    {
      href: "https://flow.eryxon.io/guides/",
      label: t("navigation.docsAndHelp"),
      icon: BookOpen,
    },
  ];

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo/Brand - Compact */}
      <div className="flex h-12 items-center border-b border-border-subtle px-3">
        <div className="flex items-center gap-2">
          <Factory className="h-6 w-6 text-foreground/80" strokeWidth={1.5} />
          {!collapsed && (
            <span className="text-sm font-bold text-foreground">
              Eryxon Flow
            </span>
          )}
        </div>
      </div>

      {/* Global Search Button */}
      <div className="px-2 py-2 border-b border-border-subtle">
        {collapsed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="w-full h-8 justify-center p-0"
            title={t("globalSearch.openSearch")}
          >
            <Search className="h-4 w-4" />
          </Button>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className={cn(
              "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md",
              "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20",
              "transition-all duration-150",
              "text-muted-foreground hover:text-foreground",
              "text-xs"
            )}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">{t("globalSearch.openSearch")}</span>
            <div className="flex items-center gap-0.5">
              <kbd className="px-1 py-0.5 text-[9px] font-medium bg-white/10 border border-white/10 rounded">⌘</kbd>
              <kbd className="px-1 py-0.5 text-[9px] font-medium bg-white/10 border border-white/10 rounded">K</kbd>
            </div>
          </button>
        )}
      </div>

      {/* Navigation - Compact */}
      <ScrollArea className="flex-1 px-2 py-2">
        {/* Main Navigation - Daily Operations */}
        <div className="space-y-0.5">
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
                    "w-full justify-start gap-2 nav-item-hover h-8 text-xs",
                    collapsed && "justify-center px-2",
                    isItemActive && "nav-item-active"
                  )}
                  size="sm"
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge variant="destructive" className="ml-auto h-4 px-1 text-[10px]">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                  {collapsed && item.badge !== undefined && item.badge > 0 && (
                    <div className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
                  )}
                </Button>
              </Link>
            );
          })}
        </div>

        {!collapsed && featureFlags.operatorViews && <Separator className="my-2" />}

        {/* Operator Views Section - Collapsible */}
        {!collapsed && featureFlags.operatorViews && (
          <Collapsible open={operatorViewsOpen} onOpenChange={setOperatorViewsOpen} className="space-y-0.5">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 font-medium text-muted-foreground h-7 text-xs"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{t("navigation.operatorViews")}</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    operatorViewsOpen && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 pl-3">
              {operatorViewItems.map((item) => {
                const isItemActive = item.exact
                  ? isActive(item.path)
                  : location.pathname.startsWith(item.path);

                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 nav-item-hover h-7 text-xs",
                        isItemActive && "nav-item-active"
                      )}
                      size="sm"
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {!collapsed && featureFlags.monitoring && <Separator className="my-2" />}

        {/* Monitoring Section - Collapsible */}
        {!collapsed && featureFlags.monitoring && (
          <Collapsible open={monitoringOpen} onOpenChange={setMonitoringOpen} className="space-y-0.5">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 font-medium text-muted-foreground h-7 text-xs"
              >
                <Activity className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{t("navigation.monitoring")}</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    monitoringOpen && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 pl-3">
              {monitoringNavItems.map((item) => {
                const isItemActive = item.exact
                  ? isActive(item.path)
                  : location.pathname.startsWith(item.path);

                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 nav-item-hover h-7 text-xs",
                        isItemActive && "nav-item-active"
                      )}
                      size="sm"
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {!collapsed && <Separator className="my-2" />}

        {/* Configuration Section - Collapsible */}
        {!collapsed && (
          <Collapsible open={configOpen} onOpenChange={setConfigOpen} className="space-y-0.5">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 font-medium text-muted-foreground h-7 text-xs"
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{t("navigation.configuration")}</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    configOpen && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 pl-3">
              {configNavItems.map((item) => {
                const isItemActive = item.exact
                  ? isActive(item.path)
                  : location.pathname.startsWith(item.path);

                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 nav-item-hover h-7 text-xs",
                        isItemActive && "nav-item-active"
                      )}
                      size="sm"
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {!collapsed && featureFlags.integrations && <Separator className="my-2" />}

        {/* Integrations Section - Collapsible */}
        {!collapsed && featureFlags.integrations && (
          <Collapsible open={integrationsOpen} onOpenChange={setIntegrationsOpen} className="space-y-0.5">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 font-medium text-muted-foreground h-7 text-xs"
              >
                <Plug className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{t("navigation.integrations")}</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    integrationsOpen && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 pl-3">
              {integrationsNavItems.map((item) => {
                const isItemActive = item.exact
                  ? isActive(item.path)
                  : location.pathname.startsWith(item.path);

                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 nav-item-hover h-7 text-xs",
                        isItemActive && "nav-item-active"
                      )}
                      size="sm"
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {!collapsed && <Separator className="my-2" />}

        {/* Account & Support Section - Collapsible */}
        {!collapsed && (
          <Collapsible open={accountOpen} onOpenChange={setAccountOpen} className="space-y-0.5">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 font-medium text-muted-foreground h-7 text-xs"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{t("navigation.account")}</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    accountOpen && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 pl-3">
              {accountNavItems.map((item) => {
                const isItemActive = item.exact
                  ? isActive(item.path)
                  : location.pathname.startsWith(item.path);

                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 nav-item-hover h-7 text-xs",
                        isItemActive && "nav-item-active"
                      )}
                      size="sm"
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
              {/* External Links */}
              {externalLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 nav-item-hover h-7 text-xs"
                    size="sm"
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </Button>
                </a>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </ScrollArea>

      {/* User Profile & Sign Out - Compact */}
      <div className="border-t border-border-subtle p-2 space-y-1.5">
        {/* Compact Tenant Info - Clickable for root admins */}
        {!collapsed && tenant && (
          <button
            onClick={() => profile?.is_root_admin && setTenantSwitcherOpen(true)}
            disabled={!profile?.is_root_admin}
            className={cn(
              "tenant-info-compact w-full",
              profile?.is_root_admin && "cursor-pointer hover:bg-white/5 rounded-md transition-colors"
            )}
          >
            <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="tenant-name">{tenant.company_name || tenant.name}</span>
            <Badge variant="secondary" className="tenant-badge capitalize">
              {tenant.plan}
            </Badge>
          </button>
        )}
        {/* Compact User Info */}
        {!collapsed && profile && (
          <div className="flex items-center gap-2 px-1">
            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-[10px] font-medium text-primary">
                {profile.full_name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{profile.full_name}</div>
              <div className="text-[10px] text-muted-foreground capitalize">{profile.role}</div>
            </div>
          </div>
        )}
        {/* MCP Status, Theme & Language - Inline */}
        <div className={cn("flex items-center gap-2", collapsed ? "justify-center flex-col" : "justify-between px-1")}>
          <McpServerStatus />
          <div className="flex items-center gap-1">
            <ThemeToggle variant="dropdown" />
            <LanguageSwitcher />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={signOut}
          className={cn(
            "w-full gap-1.5 h-7 text-xs",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && t("auth.signOut")}
        </Button>
      </div>

      {/* Collapse Toggle (Desktop) */}
      {!mobileOpen && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-14 hidden h-5 w-5 rounded-full border bg-background p-0 lg:flex"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
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
          className="fixed left-3 top-3 z-50 h-8 w-8 p-0 lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Menu className="h-4 w-4" />
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
            "fixed inset-y-0 left-0 z-50 w-56 border-r sidebar-glass transition-transform lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {renderSidebarContent()}
        </aside>

        {/* Sidebar - Desktop (auto-collapse on tablet) */}
        <aside
          className={cn(
            "hidden border-r sidebar-glass transition-all md:block",
            collapsed ? "w-14" : "w-52 xl:w-56"
          )}
        >
          <div className="relative h-full">
            {renderSidebarContent()}
          </div>
        </aside>

        {/* Main Content - Reduced padding */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-3 pt-14 md:p-4 md:pt-4 lg:p-5">
            {children}
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Tenant Switcher Modal (Root Admin Only) */}
      <TenantSwitcher open={tenantSwitcherOpen} onClose={() => setTenantSwitcherOpen(false)} />
    </>
  );
}
