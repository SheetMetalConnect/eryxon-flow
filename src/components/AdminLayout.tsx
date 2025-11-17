import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Menu,
  Store,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const isActiveGroup = (...paths: string[]) => paths.some(path => location.pathname.startsWith(path));

  const navigationItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      path: "/work-queue",
      label: "Work Queue",
      icon: ListChecks,
      exact: true,
    },
    {
      path: "/admin/jobs",
      label: "Jobs",
      icon: Briefcase,
      exact: false,
      activePaths: ["/admin/jobs"],
    },
    {
      path: "/admin/parts",
      label: "Parts",
      icon: Package,
      exact: true,
    },
    {
      path: "/admin/issues",
      label: "Issues",
      icon: AlertCircle,
      exact: true,
    },
    {
      path: "/admin/assignments",
      label: "Assignments",
      icon: UserCheck,
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
      path: "/admin/config/api-keys",
      label: "API Keys",
      icon: Plug,
      activePaths: ["/admin/config/api-keys", "/admin/config/webhooks"],
    },
    {
      path: "/api-docs",
      label: "API Docs",
      icon: BookOpen,
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
        <div className="space-y-1">
          {navigationItems.map((item) => {
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
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            );
          })}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          {bottomNavItems.map((item) => {
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
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      {/* User Profile & Sign Out */}
      <div className="border-t p-3">
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
