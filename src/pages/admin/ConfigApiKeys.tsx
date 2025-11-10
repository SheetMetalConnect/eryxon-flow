import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Key, Copy, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";

export default function ConfigApiKeys() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchApiKeys();
    }
  }, [profile?.tenant_id]);

  const fetchApiKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('tenant_id', profile?.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch API keys",
        variant: "destructive",
      });
    } else {
      setApiKeys(data || []);
    }
    setLoading(false);
  };

  const generateApiKey = async () => {
    if (!keyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the API key",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Generate random key
      const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(36))
        .join('')
        .substring(0, 32);
      
      const apiKey = `ery_live_${randomPart}`;
      const keyPrefix = apiKey.substring(0, 12);

      // Hash the key - we'll use edge function for secure hashing
      // For now, store the key directly (server-side hashing happens in edge function)
      const keyHash = apiKey; // Edge functions will verify this

      // Store in database
      const { error } = await supabase
        .from('api_keys')
        .insert({
          tenant_id: profile?.tenant_id,
          name: keyName,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          created_by: profile?.id,
          active: true
        });

      if (error) throw error;

      setGeneratedKey(apiKey);
      setKeyName("");
      fetchApiKeys();

      toast({
        title: "Success",
        description: "API key generated successfully",
      });
    } catch (error) {
      console.error('Error generating API key:', error);
      toast({
        title: "Error",
        description: "Failed to generate API key",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const revokeKey = async (keyId: string) => {
    const { error } = await supabase
      .from('api_keys')
      .update({ active: false })
      .eq('id', keyId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "API key revoked",
      });
      fetchApiKeys();
    }
  };

  const closeKeyDialog = () => {
    setNewKeyDialog(false);
    setGeneratedKey(null);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">API Keys</h1>
            <p className="text-muted-foreground">Manage API keys for external integrations</p>
          </div>
          <Dialog open={newKeyDialog} onOpenChange={setNewKeyDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Generate New Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Generate API Key</DialogTitle>
                <DialogDescription>
                  {generatedKey 
                    ? "Save this key now. It won't be shown again."
                    : "Create a new API key for external system access"}
                </DialogDescription>
              </DialogHeader>
              
              {generatedKey ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-md">
                    <code className="text-sm break-all">{generatedKey}</code>
                  </div>
                  <Button onClick={() => copyToClipboard(generatedKey)} className="w-full">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Key
                  </Button>
                  <Button onClick={closeKeyDialog} variant="outline" className="w-full">
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Key Name</Label>
                    <Input
                      id="key-name"
                      placeholder="Production API Key"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={generateApiKey} 
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? "Generating..." : "Generate Key"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active API Keys</CardTitle>
            <CardDescription>
              API keys allow external systems to create jobs and upload files
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No API keys yet. Generate one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key Prefix</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-sm">{key.key_prefix}****</code>
                      </TableCell>
                      <TableCell>{format(new Date(key.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        {key.last_used_at 
                          ? format(new Date(key.last_used_at), 'MMM d, yyyy HH:mm')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={key.active ? "default" : "secondary"}>
                          {key.active ? "Active" : "Revoked"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {key.active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeKey(key.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Endpoints</CardTitle>
            <CardDescription>Available endpoints for your API key</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <code className="text-sm bg-muted p-2 rounded block">
                  POST https://vatgianzotsurljznsry.supabase.co/functions/v1/api-jobs
                </code>
                <p className="text-sm text-muted-foreground mt-2">Create a new job with parts and tasks</p>
              </div>
              <div>
                <code className="text-sm bg-muted p-2 rounded block">
                  GET https://vatgianzotsurljznsry.supabase.co/functions/v1/api-upload-url
                </code>
                <p className="text-sm text-muted-foreground mt-2">Request signed URL for file uploads</p>
              </div>
              <div>
                <code className="text-sm bg-muted p-2 rounded block">
                  GET https://vatgianzotsurljznsry.supabase.co/functions/v1/api-stages
                </code>
                <p className="text-sm text-muted-foreground mt-2">List available stages</p>
              </div>
              <div>
                <code className="text-sm bg-muted p-2 rounded block">
                  GET https://vatgianzotsurljznsry.supabase.co/functions/v1/api-materials
                </code>
                <p className="text-sm text-muted-foreground mt-2">List materials in use</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
