"use client";

import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  List,
  Settings,
  Clock,
  AlertTriangle,
  ClipboardCheck,
  FileText,
  Briefcase,
  Package,
  LogOut,
  Sun,
  Moon,
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

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface AppHeaderProps {
  className?: string;
}

export function AppHeader({ className }: AppHeaderProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = React.useState(false);

  // Detect scroll for shadow effect
  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  // Admin navigation items
  const adminNavItems: NavItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { path: "/work-queue", label: "Work Queue", icon: <List className="h-4 w-4" /> },
    { path: "/admin/jobs", label: "Jobs", icon: <Briefcase className="h-4 w-4" /> },
    { path: "/admin/parts", label: "Parts", icon: <Package className="h-4 w-4" /> },
    { path: "/admin/issues", label: "Issues", icon: <AlertTriangle className="h-4 w-4" /> },
    { path: "/admin/assignments", label: "Assignments", icon: <ClipboardCheck className="h-4 w-4" /> },
    { path: "/admin/config/api-keys", label: "API", icon: <Settings className="h-4 w-4" /> },
    { path: "/api-docs", label: "API Docs", icon: <FileText className="h-4 w-4" /> },
  ];

  // Operator navigation items
  const operatorNavItems: NavItem[] = [
    { path: "/work-queue", label: "Work Queue", icon: <List className="h-4 w-4" /> },
    { path: "/my-activity", label: "My Activity", icon: <Clock className="h-4 w-4" /> },
    { path: "/my-issues", label: "My Issues", icon: <AlertTriangle className="h-4 w-4" /> },
    { path: "/api-docs", label: "API Docs", icon: <FileText className="h-4 w-4" /> },
  ];

  const navItems = profile?.role === "admin" ? adminNavItems : operatorNavItems;

  if (!profile) {
    return null;
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        "bg-gradient-to-r from-[#3a4656] to-[#0080ff]",
        scrolled && "shadow-lg shadow-black/20",
        className
      )}
    >
      <div className="flex h-16 items-center px-4 md:px-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 mr-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-lg">
            SM
          </div>
          <span className="hidden md:block text-lg font-bold text-white tracking-tight">
            Sheet Metal Connect
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              asChild
              className={cn(
                "text-white/90 hover:text-white hover:bg-white/20",
                "transition-colors duration-200",
                isActive(item.path) && "bg-white/15 text-white"
              )}
            >
              <Link to={item.path} className="flex items-center gap-2">
                {item.icon}
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            </Button>
          ))}
        </nav>

        {/* User Profile Section */}
        <div className="flex items-center gap-3">
          {/* User Info and Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 hover:bg-white/15 text-white"
              >
                <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-sm font-semibold">{profile.full_name}</span>
                  <Badge
                    variant="secondary"
                    className="h-4 text-[10px] bg-white/20 text-white border-0 capitalize"
                  >
                    {profile.role}
                  </Badge>
                </div>
                <Avatar className="h-9 w-9 bg-white/30 text-white">
                  <AvatarFallback className="bg-transparent text-white font-semibold">
                    {profile.full_name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-card">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold">{profile.full_name}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {profile.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
