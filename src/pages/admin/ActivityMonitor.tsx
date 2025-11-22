import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  User,
  Search,
  RefreshCw,
  Download,
  Plus,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Eye,
  Settings,
  CloudDownload,
  CloudUpload,
  Briefcase,
  Package,
  CheckCircle,
  Users,
  Layers,
  Wrench,
  Circle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: string;
  user_email: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  description: string;
  changes: any;
  metadata: any;
  created_at: string;
}

interface ActivityStats {
  total_activities: number;
  unique_users: number;
  activities_by_action: any;
  activities_by_entity: any;
}

export const ActivityMonitor: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntityType, setFilterEntityType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [limit, setLimit] = useState(50);
  const { profile } = useAuth();

  // Load activity data
  const loadData = useCallback(async () => {
    if (!profile) return;

    try {
      // Get activity logs with filters
      const { data: activityData, error: activityError } = await supabase.rpc(
        "get_activity_logs",
        {
          p_limit: limit,
          p_offset: 0,
          p_action: filterAction === "all" ? null : filterAction,
          p_entity_type: filterEntityType === "all" ? null : filterEntityType,
          p_search: searchQuery || null,
        },
      );

      if (activityError) {
        console.error("Error loading activities:", activityError);
      } else {
        setActivities(activityData || []);
      }

      // Get activity statistics
      const { data: statsData, error: statsError } = await supabase.rpc(
        "get_activity_stats",
        {
          p_start_date: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(),
          p_end_date: new Date().toISOString(),
        },
      );

      if (statsError) {
        console.error("Error loading stats:", statsError);
      } else if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error("Error loading activity data:", error);
      setLoading(false);
    }
  }, [profile, filterAction, filterEntityType, searchQuery, limit]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadData();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Real-time subscription
  useEffect(() => {
    if (!profile) return;

    // Subscribe to activity log changes
    const channel = supabase
      .channel("activity_log_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_log",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        (payload) => {
          console.log("Real-time activity update:", payload);
          // Reload data when changes occur
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, loadData]);

  // Get action icon
  const getActionIcon = (action: string) => {
    const iconClass = "h-3.5 w-3.5";
    switch (action) {
      case "create":
        return <Plus className={iconClass} />;
      case "update":
        return <Edit className={iconClass} />;
      case "delete":
        return <Trash2 className={iconClass} />;
      case "login":
        return <LogIn className={iconClass} />;
      case "logout":
        return <LogOut className={iconClass} />;
      case "view":
        return <Eye className={iconClass} />;
      case "configure":
        return <Settings className={iconClass} />;
      case "export":
        return <CloudDownload className={iconClass} />;
      case "import":
        return <CloudUpload className={iconClass} />;
      default:
        return <Circle className={iconClass} />;
    }
  };

  // Get action color using design system tokens
  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-[hsl(var(--color-success))]/10 text-[hsl(var(--color-success))] border-[hsl(var(--color-success))]/20";
      case "update":
        return "bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))]/20";
      case "delete":
        return "bg-[hsl(var(--color-error))]/10 text-[hsl(var(--color-error))] border-[hsl(var(--color-error))]/20";
      case "login":
        return "bg-[hsl(var(--stage-bending))]/10 text-[hsl(var(--stage-bending))] border-[hsl(var(--stage-bending))]/20";
      case "logout":
        return "bg-[hsl(var(--status-pending))]/10 text-[hsl(var(--status-pending))] border-[hsl(var(--status-pending))]/20";
      case "view":
        return "bg-[hsl(var(--color-info))]/10 text-[hsl(var(--color-info))] border-[hsl(var(--color-info))]/20";
      case "configure":
        return "bg-[hsl(var(--stage-welding))]/10 text-[hsl(var(--stage-welding))] border-[hsl(var(--stage-welding))]/20";
      case "export":
      case "import":
        return "bg-[hsl(var(--color-warning))]/10 text-[hsl(var(--color-warning))] border-[hsl(var(--color-warning))]/20";
      default:
        return "bg-[hsl(var(--foreground))]/10 text-[hsl(var(--foreground))]/60 border-[hsl(var(--foreground))]/20";
    }
  };

  // Get entity icon
  const getEntityIcon = (entityType: string | null) => {
    const iconClass = "h-4 w-4";
    switch (entityType) {
      case "job":
        return <Briefcase className={iconClass} />;
      case "part":
        return <Package className={iconClass} />;
      case "operation":
        return <CheckCircle className={iconClass} />;
      case "user":
        return <Users className={iconClass} />;
      case "stage":
        return <Layers className={iconClass} />;
      case "material":
      case "resource":
        return <Wrench className={iconClass} />;
      default:
        return <Activity className={iconClass} />;
    }
  };

  // Get user initials
  const getUserInitials = (name: string | null, email: string | null) => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "??";
  };

  // Export activity log
  const handleExport = () => {
    const csv = [
      [
        "Timestamp",
        "User",
        "Action",
        "Entity Type",
        "Entity",
        "Description",
      ].join(","),
      ...activities.map((a) =>
        [
          new Date(a.created_at).toISOString(),
          a.user_name || a.user_email,
          a.action,
          a.entity_type || "-",
          a.entity_name || "-",
          `"${a.description || "-"}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get unique actions and entity types for filters
  const uniqueActions = Array.from(
    new Set(activities.map((a) => a.action).filter(Boolean)),
  );
  const uniqueEntityTypes = Array.from(
    new Set(activities.map((a) => a.entity_type).filter(Boolean)),
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header Section */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
          Activity Monitor
        </h1>
        <p className="text-muted-foreground text-lg">
          Real-time platform activity feed with comprehensive audit trail
        </p>
      </div>

      <hr className="title-divider" />

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card transition-smooth hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-[hsl(var(--brand-primary))]/10">
                  <Activity className="h-6 w-6 text-[hsl(var(--brand-primary))]" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {stats.total_activities || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Activities (24h)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card transition-smooth hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-[hsl(var(--color-success))]/10">
                  <Users className="h-6 w-6 text-[hsl(var(--color-success))]" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {stats.unique_users || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Active Users (24h)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card transition-smooth hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-[hsl(var(--color-info))]/10">
                  <Plus className="h-6 w-6 text-[hsl(var(--color-info))]" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {stats.activities_by_action?.create || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Created (24h)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card transition-smooth hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-[hsl(var(--color-warning))]/10">
                  <Edit className="h-6 w-6 text-[hsl(var(--color-warning))]" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {stats.activities_by_action?.update || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Updated (24h)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Select value={filterEntityType} onValueChange={setFilterEntityType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Entities" />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="all">All Entities</SelectItem>
                  {uniqueEntityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Select value={limit.toString()} onValueChange={(val) => setLimit(Number(val))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="25">Last 25</SelectItem>
                  <SelectItem value="50">Last 50</SelectItem>
                  <SelectItem value="100">Last 100</SelectItem>
                  <SelectItem value="200">Last 200</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3 flex items-center justify-end gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor="auto-refresh" className="text-sm">
                  Auto-refresh
                </Label>
              </div>
              <Button onClick={loadData} variant="ghost" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={handleExport} variant="ghost" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card className="glass-card">
        <div className="p-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Badge variant="outline" className="bg-white/5">
              {activities.length} events
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {lastUpdate.toLocaleTimeString()}
            {autoRefresh && " (auto-refreshing every 10s)"}
          </p>
        </div>

        <div className="divide-y divide-border-subtle">
          {activities.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground mb-2">No activities found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or search query
              </p>
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 hover:bg-[hsl(var(--surface-elevated))] transition-smooth"
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10 bg-white/10">
                      <AvatarFallback className="bg-white/10 text-foreground font-semibold">
                        {getUserInitials(
                          activity.user_name,
                          activity.user_email,
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1">
                      <div className={cn(
                        "h-5 w-5 rounded-full flex items-center justify-center border-2 border-background",
                        getActionColor(activity.action).split(' ').slice(0, 2).join(' ')
                      )}>
                        {getActionIcon(activity.action)}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold">
                        {activity.user_name || activity.user_email}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 text-xs font-semibold uppercase",
                          getActionColor(activity.action)
                        )}
                      >
                        {activity.action}
                      </Badge>
                      {activity.entity_type && (
                        <Badge
                          variant="outline"
                          className="h-5 text-xs gap-1 bg-white/5"
                        >
                          {getEntityIcon(activity.entity_type)}
                          {activity.entity_type}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-foreground mb-1">
                      {activity.description}
                    </p>

                    {activity.entity_name && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {activity.entity_type}:{" "}
                        <span className="font-medium">{activity.entity_name}</span>
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More */}
        {activities.length >= limit && (
          <div className="p-4 border-t border-border-subtle text-center">
            <Button onClick={() => setLimit(limit + 50)} variant="outline">
              Load More
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
