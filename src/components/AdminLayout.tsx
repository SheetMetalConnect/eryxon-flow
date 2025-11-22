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
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePendingIssuesCount } from "@/hooks/usePendingIssuesCount";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import AnimatedBackground from "@/components/AnimatedBackground";
import { McpServerStatus } from "@/components/admin/McpServerStatus";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
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
      path: "/admin/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      path: "/admin/jobs",
      label: "Jobs",
      icon: Briefcase,
      activePaths: ["/admin/jobs"],
    },
    {
      path: "/admin/parts",
      label: "Parts",
      icon: Package,
      exact: true,
    },
    {
      path: "/admin/operations",
      label: "Operations",
      icon: Layers,
      exact: true,
    },
    {
      path: "/admin/assignments",
      label: "Assignments",
      icon: UserCheck,
      exact: true,
    },
    {
      path: "/admin/issues",
      label: "Issues",
      icon: AlertCircle,
      exact: true,
      badge: pendingIssuesCount,
    },
    {
      path: "/admin/activity",
      label: "Activity",
      icon: Clock,
      exact: true,
    },
  ];

  // Operator views - Admin can see what operators see
  const operatorViewItems = [
    {
      path: "/operator/work-queue",
      label: "Work Queue",
      icon: ListTodo,
      exact: true,
    },
    {
      path: "/operator/view",
      label: "Operator View",
      icon: Eye,
      exact: true,
    },
    {
      path: "/operator/my-activity",
      label: "My Activity",
      icon: Activity,
      exact: true,
    },
    {
      path: "/operator/my-issues",
      label: "My Issues",
      icon: Flag,
      exact: true,
    },
  ];

  // Configuration - Setup tasks (rarely changed)
  const configNavItems = [
    {
      path: "/admin/config/stages",
      label: "Cells",
      icon: Database,
      exact: true,
    },
    {
      path: "/admin/config/materials",
      label: "Materials",
      icon: Wrench,
      exact: true,
    },
    {
      path: "/admin/config/resources",
      label: "Resources",
      icon: Wrench,
      exact: true,
    },
    {
      path: "/admin/config/users",
      label: "Users",
      icon: Users,
      exact: true,
    },
    {
      path: "/admin/config/steps-templates",
      label: "Templates",
      icon: FileText,
      exact: true,
    },
    {
      path: "/admin/config/api-keys",
      label: "API Keys",
      icon: Key,
      exact: true,
    },
    {
      path: "/admin/config/mcp-keys",
      label: "MCP Keys",
      icon: Key,
      exact: true,
    },
    {
      path: "/admin/config/webhooks",
      label: "Webhooks",
      icon: Webhook,
      exact: true,
    },
    {
      path: "/admin/config/mcp-server",
      label: "MCP Server",
      icon: Activity,
      exact: true,
    },
  ];

  // Integrations - Developer tools
  const integrationsNavItems = [
    {
      path: "/admin/integrations",
      label: "App Store",
      icon: Store,
      exact: true,
    },
    {
      path: "/admin/data-export",
      label: "Data Export",
      icon: FileDown,
      exact: true,
    },
    {
      path: "/admin/api-docs",
      label: "API Docs",
      icon: Code,
      exact: true,
    },
  ];

  // Account & Support
  const accountNavItems = [
    {
      path: "/admin/my-plan",
      label: "My Plan",
      icon: CreditCard,
      exact: true,
    },
    {
      path: "/admin/pricing",
      label: "Pricing",
      icon: DollarSign,
      exact: true,
    },
    {
      path: "/admin/settings",
      label: "Settings",
      icon: Settings,
      exact: true,
    },
    {
      path: "/admin/help",
      label: "Help",
      icon: HelpCircle,
      exact: true,
    },
    {
      path: "/admin/about",
      label: "About",
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
                <span className="flex-1 text-left">Operator Views</span>
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
                <span className="flex-1 text-left">Configuration</span>
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
                <span className="flex-1 text-left">Integrations</span>
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
                <span className="flex-1 text-left">Account & Support</span>
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
        {/* MCP Server Status */}
        {!collapsed && (
          <div className="mb-2">
            <McpServerStatus />
          </div>
        )}

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
          {!collapsed && "Sign Out"}
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
