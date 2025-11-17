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
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePendingIssuesCount } from "@/hooks/usePendingIssuesCount";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { profile, tenant, signOut } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(true);
  const { count: pendingIssuesCount } = usePendingIssuesCount();

  const isActive = (path: string) => location.pathname === path;
  const isActiveGroup = (...paths: string[]) => paths.some(path => location.pathname.startsWith(path));

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
      path: "/admin/config/webhooks",
      label: "Webhooks",
      icon: Webhook,
      exact: true,
    },
  ];

  const bottomNavItems = [
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
      path: "/admin/pricing",
      label: "Pricing",
      icon: DollarSign,
      exact: true,
    },
    {
      path: "/admin/my-plan",
      label: "My Plan",
      icon: DollarSign,
      exact: true,
    },
    {
      path: "/admin/api-docs",
      label: "API Docs",
      icon: BookOpen,
      exact: true,
    },
    {
      path: "/admin/help",
      label: "Help",
      icon: BookOpen,
      exact: true,
    },
    {
      path: "/admin/settings",
      label: "Settings",
      icon: Settings,
      exact: true,
    },
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary" />
          {!collapsed && <span className="text-lg font-bold">Eryxon MES</span>}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        {/* Main Navigation */}
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
                  variant={isItemActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    collapsed && "justify-center px-2"
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
                      variant={isItemActive ? "default" : "ghost"}
                      className="w-full justify-start gap-3"
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

        {/* Bottom Navigation */}
        <div className="space-y-1">
          {bottomNavItems.map((item) => {
            const isItemActive = item.exact
              ? isActive(item.path)
              : location.pathname.startsWith(item.path);

            return (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                <Button
                  variant={isItemActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    collapsed && "justify-center px-2"
                  )}
                  size="sm"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            );
          })}
        </div>
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
    <div className="flex h-screen overflow-hidden bg-background">
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
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-card transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          "hidden border-r bg-card transition-all lg:block",
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
  );
}
