import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Copy, Plus, RefreshCw, Trash2, Key, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

interface McpEndpoint {
  id: string;
  name: string;
  token_prefix: string;
  enabled: boolean;
  created_at: string;
  last_used_at?: string;
  usage_count: number;
}

export default function McpSetup() {
  const { tenant } = useAuth();
  const [endpoints, setEndpoints] = useState<McpEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEndpointName, setNewEndpointName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newToken, setNewToken] = useState<{ name: string; token: string } | null>(null);
  const [showToken, setShowToken] = useState(true);
  const [configTab, setConfigTab] = useState<"claude" | "cursor" | "windsurf">("claude");

  // Get the MCP server URL - this would be the deployed server URL
  const mcpServerPath = typeof window !== 'undefined'
    ? `${window.location.origin}/mcp-server/dist/index.js`
    : '/path/to/eryxon-flow/mcp-server/dist/index.js';

  useEffect(() => {
    if (tenant?.id) {
      fetchEndpoints();
    }
  }, [tenant?.id]);

  const fetchEndpoints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("mcp_endpoints")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEndpoints(data || []);
    } catch (error: any) {
      console.error("Error fetching endpoints:", error);
      // Table might not exist yet - that's okay
      if (error.code !== '42P01') {
        toast.error("Failed to load MCP endpoints");
      }
    } finally {
      setLoading(false);
    }
  };

  const createEndpoint = async () => {
    if (!newEndpointName.trim()) {
      toast.error("Please enter a name for the endpoint");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_mcp_endpoint", {
        p_name: newEndpointName.trim(),
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      setNewToken({
        name: result.endpoint_name,
        token: result.token,
      });
      setCreateDialogOpen(false);
      setNewEndpointName("");
      await fetchEndpoints();
      toast.success("MCP endpoint created successfully");
    } catch (error: any) {
      console.error("Error creating endpoint:", error);
      toast.error(error.message || "Failed to create endpoint");
    } finally {
      setIsCreating(false);
    }
  };

  const regenerateToken = async (endpointId: string, endpointName: string) => {
    if (!confirm(`Regenerate token for "${endpointName}"? The old token will stop working immediately.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc("regenerate_mcp_token", {
        p_endpoint_id: endpointId,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      setNewToken({
        name: result.endpoint_name,
        token: result.token,
      });
      await fetchEndpoints();
      toast.success("Token regenerated successfully");
    } catch (error: any) {
      console.error("Error regenerating token:", error);
      toast.error(error.message || "Failed to regenerate token");
    }
  };

  const toggleEndpoint = async (endpointId: string, currentEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from("mcp_endpoints")
        .update({ enabled: !currentEnabled })
        .eq("id", endpointId);

      if (error) throw error;
      await fetchEndpoints();
      toast.success(`Endpoint ${!currentEnabled ? "enabled" : "disabled"}`);
    } catch (error: any) {
      console.error("Error toggling endpoint:", error);
      toast.error("Failed to update endpoint");
    }
  };

  const deleteEndpoint = async (endpointId: string, endpointName: string) => {
    if (!confirm(`Delete endpoint "${endpointName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("mcp_endpoints")
        .delete()
        .eq("id", endpointId);

      if (error) throw error;
      await fetchEndpoints();
      toast.success("Endpoint deleted");
    } catch (error: any) {
      console.error("Error deleting endpoint:", error);
      toast.error("Failed to delete endpoint");
    }
  };

  const copyToClipboard = (text: string, label: string = "Copied") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} to clipboard`);
  };

  const getConfigJson = (token: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";

    return {
      claude: `{
  "mcpServers": {
    "Eryxon Flow - ${tenant?.name || 'Manufacturing'}": {
      "command": "node",
      "args": ["${mcpServerPath}"],
      "env": {
        "SUPABASE_URL": "${supabaseUrl}",
        "MCP_TOKEN": "${token}"
      }
    }
  }
}`,
      cursor: `{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["${mcpServerPath}"],
      "env": {
        "SUPABASE_URL": "${supabaseUrl}",
        "MCP_TOKEN": "${token}"
      }
    }
  }
}`,
      windsurf: `{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["${mcpServerPath}"],
      "env": {
        "SUPABASE_URL": "${supabaseUrl}",
        "MCP_TOKEN": "${token}"
      }
    }
  }
}`
    };
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MCP Setup</h1>
          <p className="text-muted-foreground mt-1">
            Connect AI assistants to your manufacturing data
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New MCP Endpoint
        </Button>
      </div>

      {/* Token Display Dialog - shown after creating or regenerating */}
      {newToken && (
        <Dialog open={!!newToken} onOpenChange={() => setNewToken(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                MCP Endpoint Created
              </DialogTitle>
              <DialogDescription>
                Save your MCP configuration - the token is only shown once!
              </DialogDescription>
            </DialogHeader>

            <Alert className="bg-amber-500/10 border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-500">
                Copy this configuration now. The token will not be shown again.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Endpoint Name</Label>
                <p className="font-medium">{newToken.name}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-muted-foreground">Token</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-sm font-mono break-all">
                    {showToken ? newToken.token : "••••••••••••••••••••••••••••••••"}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(newToken.token, "Token copied")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Tabs value={configTab} onValueChange={(v) => setConfigTab(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="claude">Claude Desktop</TabsTrigger>
                  <TabsTrigger value="cursor">Cursor</TabsTrigger>
                  <TabsTrigger value="windsurf">Windsurf</TabsTrigger>
                </TabsList>

                <TabsContent value="claude" className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>1. Open Claude Desktop Preferences (⌘+,)</p>
                    <p>2. Under <strong>Develop</strong>, click <strong>Edit Config</strong></p>
                    <p>3. Add this configuration to <code>claude_desktop_config.json</code></p>
                    <p>4. Save and restart Claude Desktop</p>
                  </div>
                </TabsContent>

                <TabsContent value="cursor" className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>1. Open Cursor Settings</p>
                    <p>2. Navigate to MCP Servers configuration</p>
                    <p>3. Add this configuration</p>
                  </div>
                </TabsContent>

                <TabsContent value="windsurf" className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>1. Open Windsurf Settings</p>
                    <p>2. Navigate to MCP configuration</p>
                    <p>3. Add this configuration</p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto max-h-64">
                  {getConfigJson(newToken.token)[configTab]}
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(getConfigJson(newToken.token)[configTab], "Configuration copied")}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setNewToken(null)}>
                I've saved the configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Endpoint Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create MCP Endpoint</DialogTitle>
            <DialogDescription>
              Create a new endpoint to connect AI assistants to your manufacturing data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="endpoint-name">Endpoint Name</Label>
              <Input
                id="endpoint-name"
                placeholder="e.g., Production Assistant, Quality Bot"
                value={newEndpointName}
                onChange={(e) => setNewEndpointName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createEndpoint()}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createEndpoint} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Endpoints List */}
      <Card>
        <CardHeader>
          <CardTitle>MCP Endpoints</CardTitle>
          <CardDescription>
            Manage your Model Context Protocol endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            </div>
          ) : endpoints.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <Key className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div>
                <p className="text-muted-foreground">No MCP endpoints yet</p>
                <p className="text-sm text-muted-foreground">
                  Create an endpoint to connect AI assistants
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Endpoint
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {endpoints.map((endpoint) => (
                <div
                  key={endpoint.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{endpoint.name}</span>
                      <Badge variant={endpoint.enabled ? "default" : "secondary"}>
                        {endpoint.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">
                        {endpoint.token_prefix}...
                      </code>
                      <span>
                        Created {format(new Date(endpoint.created_at), "MMM d, yyyy")}
                      </span>
                      {endpoint.last_used_at && (
                        <span>
                          Last used {format(new Date(endpoint.last_used_at), "MMM d, h:mm a")}
                        </span>
                      )}
                      {endpoint.usage_count > 0 && (
                        <span>{endpoint.usage_count} requests</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={endpoint.enabled}
                      onCheckedChange={() => toggleEndpoint(endpoint.id, endpoint.enabled)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => regenerateToken(endpoint.id, endpoint.name)}
                      title="Regenerate token"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEndpoint(endpoint.id, endpoint.name)}
                      className="text-destructive hover:text-destructive"
                      title="Delete endpoint"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Setup</CardTitle>
          <CardDescription>
            Get started with MCP in 3 simple steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Create Endpoint</p>
                <p className="text-sm text-muted-foreground">
                  Click "New MCP Endpoint" and give it a name
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white font-bold">
                2
              </div>
              <div>
                <p className="font-medium">Copy Configuration</p>
                <p className="text-sm text-muted-foreground">
                  Copy the JSON config for your AI client
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Start Using</p>
                <p className="text-sm text-muted-foreground">
                  Your AI assistant can now access manufacturing data
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
