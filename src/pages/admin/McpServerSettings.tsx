/**
 * MCP Server Settings Page
 * Configure and monitor MCP server
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Settings, FileText, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface McpConfig {
  id: string;
  server_name: string;
  server_version: string;
  enabled: boolean;
  supabase_url: string;
  features: {
    logging: boolean;
    healthCheck: boolean;
    autoReconnect: boolean;
  };
  last_connected_at?: string;
}

interface McpHealth {
  status: string;
  last_check_at?: string;
  response_time_ms?: number;
  tools_count?: number;
  database_healthy?: boolean;
  consecutive_failures?: number;
}

interface McpLog {
  id: string;
  level: string;
  message: string;
  tool_name?: string;
  tool_duration_ms?: number;
  tool_success?: boolean;
  created_at: string;
}

export default function McpServerSettings() {
  const { t } = useTranslation();
  const { tenant } = useAuth();

  const [config, setConfig] = useState<McpConfig | null>(null);
  const [health, setHealth] = useState<McpHealth[]>([]);
  const [logs, setLogs] = useState<McpLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchConfig = async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from("mcp_server_config")
        .select("*")
        .eq("tenant_id", tenant.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching MCP config:", error);
        return;
      }

      if (data) {
        setConfig(data as McpConfig);
      } else {
        // Initialize default config for new tenants
        setConfig({
          id: "",
          server_name: "eryxon-flow-mcp",
          server_version: "2.0.0",
          enabled: true,
          supabase_url: import.meta.env.VITE_SUPABASE_URL || "",
          features: {
            logging: true,
            healthCheck: true,
            autoReconnect: true,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching MCP config:", error);
    }
  };

  const fetchHealth = async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from("mcp_server_health")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("last_check_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching MCP health:", error);
        return;
      }

      setHealth((data || []) as McpHealth[]);
    } catch (error) {
      console.error("Error fetching MCP health:", error);
    }
  };

  const fetchLogs = async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from("mcp_server_logs")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching MCP logs:", error);
        return;
      }

      setLogs((data || []) as McpLog[]);
    } catch (error) {
      console.error("Error fetching MCP logs:", error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchConfig(), fetchHealth(), fetchLogs()]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    // Real-time subscriptions
    const healthChannel = supabase
      .channel("mcp_health_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mcp_server_health",
          filter: `tenant_id=eq.${tenant?.id}`,
        },
        () => fetchHealth()
      )
      .subscribe();

    const logsChannel = supabase
      .channel("mcp_logs_updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mcp_server_logs",
          filter: `tenant_id=eq.${tenant?.id}`,
        },
        () => fetchLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(healthChannel);
      supabase.removeChannel(logsChannel);
    };
  }, [tenant?.id]);

  const handleSaveConfig = async () => {
    if (!config || !tenant?.id) return;

    setIsSaving(true);

    try {
      // Prepare data for upsert, removing id if it's empty (new config)
      const configData = {
        ...config,
        tenant_id: tenant.id,
        updated_at: new Date().toISOString(),
      };

      // Remove empty id for new configs to let database generate it
      if (!configData.id) {
        delete (configData as any).id;
      }

      const { error } = await supabase
        .from("mcp_server_config")
        .upsert(configData);

      if (error) throw error;

      toast.success("MCP server configuration saved");
      await fetchConfig();
    } catch (error) {
      console.error("Error saving MCP config:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      online: "default",
      offline: "destructive",
      degraded: "secondary",
      unknown: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status === "online" && <CheckCircle2 className="h-3 w-3 mr-1" />}
        {status === "offline" && <XCircle className="h-3 w-3 mr-1" />}
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      DEBUG: "text-gray-500",
      INFO: "text-blue-500",
      WARN: "text-yellow-500",
      ERROR: "text-red-500",
    };

    return <span className={`text-xs font-mono ${colors[level] || "text-gray-500"}`}>{level}</span>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MCP Server</h1>
          <p className="text-muted-foreground">
            Configure and monitor your Model Context Protocol server
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="h-4 w-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Server Status</CardTitle>
                <CardDescription>Current MCP server health</CardDescription>
              </CardHeader>
              <CardContent>
                {health.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      {getStatusBadge(health[0].status)}
                    </div>
                    {health[0].response_time_ms && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Response Time</span>
                        <span className="text-sm">{health[0].response_time_ms}ms</span>
                      </div>
                    )}
                    {health[0].tools_count !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Tools Available</span>
                        <span className="text-sm">{health[0].tools_count}</span>
                      </div>
                    )}
                    {health[0].database_healthy !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Database</span>
                        <Badge variant={health[0].database_healthy ? "default" : "destructive"}>
                          {health[0].database_healthy ? "Healthy" : "Unhealthy"}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No health data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Health History</CardTitle>
                <CardDescription>Recent health checks</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {health.map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {new Date(h.last_check_at || "").toLocaleString()}
                        </span>
                        {getStatusBadge(h.status)}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Server Configuration</CardTitle>
              <CardDescription>Configure MCP server settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="server_name">Server Name</Label>
                <Input
                  id="server_name"
                  value={config?.server_name || ""}
                  onChange={(e) =>
                    setConfig((prev) => (prev ? { ...prev, server_name: e.target.value } : null))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supabase_url">Supabase URL</Label>
                <Input
                  id="supabase_url"
                  value={config?.supabase_url || ""}
                  onChange={(e) =>
                    setConfig((prev) => (prev ? { ...prev, supabase_url: e.target.value } : null))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">Server Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable the MCP server
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={config?.enabled || false}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => (prev ? { ...prev, enabled: checked } : null))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Logging</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable detailed logging
                  </p>
                </div>
                <Switch
                  checked={config?.features?.logging || false}
                  onCheckedChange={(checked) =>
                    setConfig((prev) =>
                      prev
                        ? { ...prev, features: { ...prev.features, logging: checked } }
                        : null
                    )
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Health Checks</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable automatic health monitoring
                  </p>
                </div>
                <Switch
                  checked={config?.features?.healthCheck || false}
                  onCheckedChange={(checked) =>
                    setConfig((prev) =>
                      prev
                        ? { ...prev, features: { ...prev.features, healthCheck: checked } }
                        : null
                    )
                  }
                />
              </div>

              <Button onClick={handleSaveConfig} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Configuration"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Server Logs</CardTitle>
              <CardDescription>Recent MCP server activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2 font-mono text-xs">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-2 rounded hover:bg-surface-hover">
                      <span className="text-muted-foreground shrink-0">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                      {getLevelBadge(log.level)}
                      <span className="flex-1">{log.message}</span>
                      {log.tool_name && (
                        <Badge variant="outline" className="shrink-0">
                          {log.tool_name}
                        </Badge>
                      )}
                      {log.tool_duration_ms && (
                        <span className="text-muted-foreground shrink-0">
                          {log.tool_duration_ms}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
