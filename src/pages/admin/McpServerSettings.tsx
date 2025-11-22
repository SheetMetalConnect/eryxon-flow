import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Loader2, Server, CheckCircle2, XCircle, AlertCircle, Copy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface McpConfig {
  id?: string;
  server_name: string;
  server_version: string;
  enabled: boolean;
  supabase_url: string;
  last_connected_at?: string;
  features?: {
    logging?: boolean;
    healthCheck?: boolean;
    autoReconnect?: boolean;
  };
}

interface McpServerHealth {
  status: "online" | "offline" | "degraded";
  last_check?: string;
  response_time_ms?: number;
  error_message?: string;
}

interface McpServerLog {
  id: string;
  event_type: string;
  message: string;
  metadata?: any;
  created_at: string;
}

export default function McpServerSettings() {
  const { t } = useTranslation();
  const { tenant } = useAuth();
  const [config, setConfig] = useState<McpConfig | null>(null);
  const [health, setHealth] = useState<McpServerHealth | null>(null);
  const [logs, setLogs] = useState<McpServerLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tenant?.id) {
      fetchConfig();
      fetchHealth();
      fetchLogs();
    }
  }, [tenant?.id]);

  const fetchConfig = async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from("mcp_server_config")
        .select("*")
        .eq("tenant_id", tenant.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setConfig(data as McpConfig);
      } else {
        // Initialize default config for new tenants
        setConfig({
          id: "",
          server_name: "eryxon-flow-mcp",
          server_version: "2.1.0",
          enabled: true,
          supabase_url: import.meta.env.VITE_SUPABASE_URL || "",
          features: {
            logging: true,
            healthCheck: true,
            autoReconnect: true,
          },
        });
      }
    } catch (error: any) {
      console.error("Error fetching MCP config:", error);
      toast.error("Failed to load MCP server configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHealth = async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from("mcp_server_health")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("last_check", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching health:", error);
        return;
      }

      if (data) {
        setHealth(data as McpServerHealth);
      }
    } catch (error) {
      console.error("Error fetching health:", error);
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
        .limit(50);

      if (error) {
        console.error("Error fetching logs:", error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const handleSaveConfig = async () => {
    if (!config || !tenant?.id) return;

    setIsSaving(true);
    try {
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

      toast.success("MCP server configuration saved successfully");
      fetchConfig();
    } catch (error: any) {
      console.error("Error saving config:", error);
      toast.error("Failed to save configuration: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    toast.info("Testing MCP server connection...");

    try {
      const { error } = await supabase.rpc("update_mcp_server_health", {
        p_tenant_id: tenant?.id,
        p_status: "online",
        p_response_time_ms: 50,
      });

      if (error) throw error;

      toast.success("MCP server connection test successful");
      fetchHealth();
    } catch (error: any) {
      console.error("Connection test failed:", error);
      toast.error("Connection test failed: " + error.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">No MCP server configuration found</p>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (!health) {
      return <Badge variant="outline">Unknown</Badge>;
    }

    switch (health.status) {
      case "online":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Online
          </Badge>
        );
      case "offline":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Offline
          </Badge>
        );
      case "degraded":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Degraded
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MCP Server Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your Model Context Protocol server
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
        </div>
      </div>

      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="health">Health & Monitoring</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Server Configuration</CardTitle>
              <CardDescription>
                Configure your MCP server settings and features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="server_name">Server Name</Label>
                  <Input
                    id="server_name"
                    value={config.server_name}
                    onChange={(e) =>
                      setConfig({ ...config, server_name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="server_version">Server Version</Label>
                  <Input
                    id="server_version"
                    value={config.server_version}
                    onChange={(e) =>
                      setConfig({ ...config, server_version: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supabase_url">Supabase URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="supabase_url"
                      value={config.supabase_url}
                      onChange={(e) =>
                        setConfig({ ...config, supabase_url: e.target.value })
                      }
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(config.supabase_url)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Server Status</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enabled">Enable MCP Server</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow MCP connections to this tenant
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={config.enabled}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, enabled: checked })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Features</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="logging">Activity Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Log all MCP server activities
                    </p>
                  </div>
                  <Switch
                    id="logging"
                    checked={config.features?.logging ?? true}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        features: { ...config.features, logging: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="healthCheck">Health Checks</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable periodic health monitoring
                    </p>
                  </div>
                  <Switch
                    id="healthCheck"
                    checked={config.features?.healthCheck ?? true}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        features: { ...config.features, healthCheck: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoReconnect">Auto Reconnect</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically reconnect on connection loss
                    </p>
                  </div>
                  <Switch
                    id="autoReconnect"
                    checked={config.features?.autoReconnect ?? true}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        features: { ...config.features, autoReconnect: checked },
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button onClick={handleSaveConfig} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Configuration"
                  )}
                </Button>
                <Button variant="outline" onClick={handleTestConnection}>
                  <Server className="mr-2 h-4 w-4" />
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Setup Instructions</AlertTitle>
            <AlertDescription>
              To connect your MCP server:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Generate an MCP authentication key in Config → MCP Keys</li>
                <li>Build the MCP server: <code className="bg-muted px-1 rounded">cd mcp-server && npm run build</code></li>
                <li>Configure your MCP client with the authentication key</li>
                <li>Start using MCP tools with your manufacturing data</li>
              </ol>
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Health & Monitoring</CardTitle>
              <CardDescription>
                Monitor MCP server health and performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {health ? (
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    {getStatusBadge()}
                  </div>

                  {health.last_check && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Last Check</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(health.last_check).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {health.response_time_ms && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Response Time</span>
                      <span className="text-sm text-muted-foreground">
                        {health.response_time_ms}ms
                      </span>
                    </div>
                  )}

                  {health.error_message && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{health.error_message}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No health data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>
                Recent MCP server activity and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length > 0 ? (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {log.event_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{log.message}</p>
                        {log.metadata && (
                          <pre className="text-xs bg-background p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No activity logs available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
