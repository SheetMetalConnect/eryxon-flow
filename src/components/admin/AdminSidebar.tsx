import { 
  LayoutDashboard, 
  Briefcase, 
  Package, 
  UserCheck, 
  AlertCircle, 
  Clock,
  ListChecks,
  Store,
  Settings,
  Key,
  Webhook,
  FileText,
  Download,
  Box,
  Palette,
  Users,
  Home,
  Layers,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePendingIssuesCount } from "@/hooks/usePendingIssuesCount";
import { Badge } from "@/components/ui/badge";

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { count: pendingIssuesCount } = usePendingIssuesCount();
  
  const collapsed = state === "collapsed";
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  const mainItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Work Queue", url: "/work-queue", icon: ListChecks },
    { title: "Jobs", url: "/admin/jobs", icon: Briefcase },
    { title: "Parts", url: "/admin/parts", icon: Package },
    { title: "Operations", url: "/admin/operations", icon: Layers },
    { title: "Assignments", url: "/admin/assignments", icon: UserCheck },
    { 
      title: "Issues", 
      url: "/admin/issues", 
      icon: AlertCircle,
      badge: pendingIssuesCount > 0 ? pendingIssuesCount : undefined,
    },
    { title: "Activity", url: "/admin/activity", icon: Clock },
  ];

  const configItems = [
    { title: "Cells", url: "/admin/config/stages", icon: Box },
    { title: "Materials", url: "/admin/materials", icon: Palette },
    { title: "Resources", url: "/admin/resources", icon: Box },
    { title: "Users", url: "/admin/config/users", icon: Users },
    { title: "Templates", url: "/admin/templates", icon: FileText },
  ];

  const systemItems = [
    { title: "Integrations", url: "/admin/integrations", icon: Store },
    { title: "API Keys", url: "/admin/config/api-keys", icon: Key },
    { title: "Webhooks", url: "/admin/config/webhooks", icon: Webhook },
    { title: "Data Export", url: "/admin/data-export", icon: Download },
    { title: "Settings", url: "/admin/settings", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url} 
                      end 
                      className="flex items-center gap-2"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <Badge variant="destructive" className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configuration */}
        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url} 
                      end 
                      className="flex items-center gap-2"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url} 
                      end 
                      className="flex items-center gap-2"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
