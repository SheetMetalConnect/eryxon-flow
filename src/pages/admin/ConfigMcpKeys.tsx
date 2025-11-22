import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Key, Copy, Trash2, Plus, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

interface McpKey {
  id: string;
  name: string;
  description?: string;
  key_prefix: string;
  environment: "live" | "test";
  allowed_tools: string[];
  rate_limit: number;
  enabled: boolean;
  created_at: string;
  last_used_at?: string;
  usage_count: number;
}

export default function ConfigMcpKeys() {
  const { profile, tenant } = useAuth();
  const [mcpKeys, setMcpKeys] = useState<McpKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // Form state
  const [keyName, setKeyName] = useState("");
  const [keyDescription, setKeyDescription] = useState("");
  const [keyEnvironment, setKeyEnvironment] = useState<"live" | "test">("live");
  const [allowAllTools, setAllowAllTools] = useState(true);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  // Available tools list
  const availableTools = [
    "fetch_jobs", "update_job", "create_job", "start_job", "stop_job", "complete_job", "resume_job",
    "fetch_parts", "update_part",
    "fetch_tasks", "update_task",
    "fetch_issues",
    "fetch_ncrs", "create_ncr",
    "start_operation", "pause_operation", "complete_operation", "add_substep", "complete_substep",
    "get_dashboard_stats",
  ];

  useEffect(() => {
    if (tenant?.id) {
      fetchMcpKeys();
    }
  }, [tenant?.id]);

  const fetchMcpKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("mcp_authentication_keys")
        .select("*")
        .eq("tenant_id", tenant?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setMcpKeys((data || []).map((key) => ({
        ...key,
        allowed_tools: Array.isArray(key.allowed_tools) ? key.allowed_tools : ["*"],
      })));
    } catch (error: any) {
      console.error("Error fetching MCP keys:", error);
      toast.error("Failed to fetch MCP keys");
    } finally {
      setLoading(false);
    }
  };

  const generateMcpKey = async () => {
    if (!keyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }

    setIsGenerating(true);

    try {
      const allowedTools = allowAllTools ? ["*"] : selectedTools;

      const { data, error } = await supabase.rpc("generate_mcp_key", {
        p_tenant_id: tenant?.id,
        p_name: keyName.trim(),
        p_description: keyDescription.trim() || null,
        p_environment: keyEnvironment,
        p_allowed_tools: allowedTools,
        p_created_by: profile?.id,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("No key generated");
      }

      const keyData = Array.isArray(data) ? data[0] : data;
      setGeneratedKey(keyData.api_key);

      // Reset form
      setKeyName("");
      setKeyDescription("");
      setKeyEnvironment("live");
      setAllowAllTools(true);
      setSelectedTools([]);

      // Refresh keys list
      await fetchMcpKeys();

      toast.success("MCP key generated successfully");
    } catch (error: any) {
      console.error("Error generating MCP key:", error);
      toast.error(error.message || "Failed to generate MCP key");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleKeyStatus = async (keyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("mcp_authentication_keys")
        .update({ enabled: !currentStatus })
        .eq("id", keyId);

      if (error) throw error;

      toast.success(`Key ${!currentStatus ? "enabled" : "disabled"}`);
      await fetchMcpKeys();
    } catch (error: any) {
      console.error("Error toggling key status:", error);
      toast.error("Failed to update key status");
    }
  };

  const deleteKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this MCP key? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("mcp_authentication_keys")
        .delete()
        .eq("id", keyId);

      if (error) throw error;

      toast.success("MCP key deleted");
      await fetchMcpKeys();
    } catch (error: any) {
      console.error("Error deleting MCP key:", error);
      toast.error("Failed to delete MCP key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const columns: ColumnDef<McpKey>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            {row.original.description && (
              <div className="text-sm text-muted-foreground">{row.original.description}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "key_prefix",
        header: "Key Prefix",
        cell: ({ row }) => (
          <code className="text-xs bg-muted px-2 py-1 rounded">{row.original.key_prefix}...</code>
        ),
      },
      {
        accessorKey: "environment",
        header: "Environment",
        cell: ({ row }) => (
          <Badge variant={row.original.environment === "live" ? "default" : "secondary"}>
            {row.original.environment}
          </Badge>
        ),
      },
      {
        accessorKey: "allowed_tools",
        header: "Tools",
        cell: ({ row }) => {
          const tools = row.original.allowed_tools;
          if (tools.includes("*")) {
            return <Badge variant="outline">All Tools</Badge>;
          }
          return <Badge variant="outline">{tools.length} tools</Badge>;
        },
      },
      {
        accessorKey: "usage_count",
        header: "Usage",
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.usage_count.toLocaleString()} requests
          </div>
        ),
      },
      {
        accessorKey: "enabled",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.enabled ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm">
              {row.original.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "last_used_at",
        header: "Last Used",
        cell: ({ row }) =>
          row.original.last_used_at
            ? format(new Date(row.original.last_used_at), "MMM d, yyyy HH:mm")
            : "Never",
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.original.enabled}
              onCheckedChange={() => toggleKeyStatus(row.original.id, row.original.enabled)}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteKey(row.original.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">MCP Keys</h1>
        <p className="text-muted-foreground mt-2">
          Manage Model Context Protocol (MCP) authentication keys for AI assistant integration
        </p>
      </div>

      <Alert>
        <Activity className="h-4 w-4" />
        <AlertTitle>Per-Tenant Authentication</AlertTitle>
        <AlertDescription>
          MCP keys provide secure, per-tenant access to your manufacturing data through AI assistants like Claude.
          Each key can be configured with specific tool permissions and rate limits.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active MCP Keys</CardTitle>
              <CardDescription>
                Generate and manage MCP authentication keys for your tenant
              </CardDescription>
            </div>
            <Dialog open={newKeyDialog} onOpenChange={setNewKeyDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate New Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Generate New MCP Key</DialogTitle>
                  <DialogDescription>
                    Create a new authentication key for MCP server access
                  </DialogDescription>
                </DialogHeader>

                {generatedKey ? (
                  <div className="space-y-4">
                    <Alert>
                      <Key className="h-4 w-4" />
                      <AlertTitle>Key Generated!</AlertTitle>
                      <AlertDescription>
                        Save this key now - you won't be able to see it again.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label>Your MCP Key</Label>
                      <div className="flex gap-2">
                        <Input value={generatedKey} readOnly className="font-mono text-sm" />
                        <Button onClick={() => copyToClipboard(generatedKey)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Usage in Claude Desktop</Label>
                      <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "MCP_API_KEY": "${generatedKey}"
      }
    }
  }
}`}
                      </pre>
                    </div>

                    <Button
                      onClick={() => {
                        setGeneratedKey(null);
                        setNewKeyDialog(false);
                      }}
                      className="w-full"
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="keyName">Key Name *</Label>
                      <Input
                        id="keyName"
                        placeholder="Production Claude Integration"
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="keyDescription">Description</Label>
                      <Textarea
                        id="keyDescription"
                        placeholder="Used for Claude Desktop integration in production"
                        value={keyDescription}
                        onChange={(e) => setKeyDescription(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="environment">Environment *</Label>
                      <Select value={keyEnvironment} onValueChange={(v: "live" | "test") => setKeyEnvironment(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="live">Live (Production)</SelectItem>
                          <SelectItem value="test">Test (Development)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Tool Permissions</Label>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="allowAll" className="text-sm font-normal">
                            Allow all tools
                          </Label>
                          <Switch
                            id="allowAll"
                            checked={allowAllTools}
                            onCheckedChange={setAllowAllTools}
                          />
                        </div>
                      </div>

                      {!allowAllTools && (
                        <div className="border rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                          {availableTools.map((tool) => (
                            <div key={tool} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={tool}
                                checked={selectedTools.includes(tool)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTools([...selectedTools, tool]);
                                  } else {
                                    setSelectedTools(selectedTools.filter((t) => t !== tool));
                                  }
                                }}
                              />
                              <Label htmlFor={tool} className="text-sm font-mono">
                                {tool}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={generateMcpKey}
                        disabled={isGenerating}
                        className="flex-1"
                      >
                        {isGenerating ? "Generating..." : "Generate Key"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setNewKeyDialog(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={mcpKeys} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}
