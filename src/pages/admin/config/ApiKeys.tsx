import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Key, Copy, Trash2, Plus, BookOpen, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "@/components/ui/data-table/DataTableColumnHeader";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  active: boolean;
}

export default function ConfigApiKeys() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
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
        title: t('apiKeys.error'),
        description: t('apiKeys.failedToFetch'),
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
        title: t('apiKeys.error'),
        description: t('apiKeys.enterKeyName'),
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `https://vatgianzotsurljznsry.supabase.co/functions/v1/api-key-generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ name: keyName.trim() }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to generate API key');
      }

      setGeneratedKey(result.data.api_key);
      setKeyName("");
      fetchApiKeys();

      toast({
        title: t('apiKeys.success'),
        description: t('apiKeys.generated'),
      });
    } catch (error) {
      console.error('Error generating API key:', error);
      toast({
        title: t('apiKeys.error'),
        description: error instanceof Error ? error.message : t('apiKeys.failedToGenerate'),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('apiKeys.copied'),
      description: t('apiKeys.copiedToClipboard'),
    });
  };

  const revokeKey = async (keyId: string) => {
    const { error } = await supabase
      .from('api_keys')
      .update({ active: false })
      .eq('id', keyId);

    if (error) {
      toast({
        title: t('apiKeys.error'),
        description: t('apiKeys.failedToRevoke'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('apiKeys.success'),
        description: t('apiKeys.revoked'),
      });
      fetchApiKeys();
    }
  };

  const closeKeyDialog = () => {
    setNewKeyDialog(false);
    setGeneratedKey(null);
  };

  const columns: ColumnDef<ApiKey>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('apiKeys.name')} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "key_prefix",
      header: t('apiKeys.keyPrefix'),
      cell: ({ row }) => (
        <code className="text-sm">{row.getValue("key_prefix")}****</code>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('apiKeys.created')} />
      ),
      cell: ({ row }) => format(new Date(row.getValue("created_at")), 'MMM d, yyyy'),
    },
    {
      accessorKey: "last_used_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('apiKeys.lastUsed')} />
      ),
      cell: ({ row }) => {
        const lastUsed = row.getValue("last_used_at") as string | null;
        return lastUsed
          ? format(new Date(lastUsed), 'MMM d, yyyy HH:mm')
          : t('apiKeys.never');
      },
    },
    {
      accessorKey: "active",
      header: t('apiKeys.status'),
      cell: ({ row }) => {
        const active = row.getValue("active") as boolean;
        return (
          <Badge variant={active ? "default" : "secondary"}>
            {active ? t('apiKeys.active') : t('apiKeys.revoked')}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: t('apiKeys.actions'),
      cell: ({ row }) => {
        const key = row.original;
        return key.active ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => revokeKey(key.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null;
      },
    },
  ], [t]);

  return (
    <div className="p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
            {t('apiKeys.title')}
          </h1>
          <p className="text-muted-foreground text-lg">{t('apiKeys.description')}</p>
        </div>

        <hr className="title-divider" />

        <div className="flex justify-end">
          <Dialog open={newKeyDialog} onOpenChange={setNewKeyDialog}>
            <DialogTrigger asChild>
              <Button className="cta-button">
                <Plus className="mr-2 h-4 w-4" />
                {t('apiKeys.generateNewKey')}
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('apiKeys.generateApiKey')}</DialogTitle>
                <DialogDescription>
                  {generatedKey
                    ? t('apiKeys.saveKeyNow')
                    : t('apiKeys.createNewKey')}
                </DialogDescription>
              </DialogHeader>

              {generatedKey ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-md">
                    <code className="text-sm break-all">{generatedKey}</code>
                  </div>
                  <Button onClick={() => copyToClipboard(generatedKey)} className="w-full">
                    <Copy className="mr-2 h-4 w-4" />
                    {t('apiKeys.copyKey')}
                  </Button>
                  <Button onClick={closeKeyDialog} variant="outline" className="w-full">
                    {t('apiKeys.done')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">{t('apiKeys.keyName')}</Label>
                    <Input
                      id="key-name"
                      placeholder={t('apiKeys.keyNamePlaceholder')}
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={generateApiKey}
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? t('apiKeys.generating') : t('apiKeys.generateKey')}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card className="glass-card border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t('apiKeys.gettingStarted')}
            </CardTitle>
            <CardDescription>
              {t('apiKeys.gettingStartedDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm">
                {t('apiKeys.exploreDocumentation')}
              </p>
              <Button asChild className="w-full sm:w-auto">
                <a href="/api-docs" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {t('apiKeys.openDocumentation')}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t('apiKeys.activeKeys')}</CardTitle>
            <CardDescription>
              {t('apiKeys.activeKeysDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={apiKeys}
              loading={loading}
              searchPlaceholder={t('apiKeys.searchKeys') || "Search keys..."}
              pageSize={10}
              emptyMessage={t('apiKeys.noKeys')}
              showToolbar={false}
            />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Quick Reference</CardTitle>
            <CardDescription>
              Quick overview of available endpoints.
              <a href="/api-docs" className="text-primary hover:underline ml-2 inline-flex items-center gap-1">
                View full interactive documentation
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    Jobs Management
                  </h3>
                  <p className="text-xs text-muted-foreground">Create, list, and update jobs with parts and tasks</p>
                </div>
                <div className="p-3 border rounded-lg space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Parts & Tasks
                  </h3>
                  <p className="text-xs text-muted-foreground">Track individual parts and task progress</p>
                </div>
                <div className="p-3 border rounded-lg space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                    File Uploads
                  </h3>
                  <p className="text-xs text-muted-foreground">Upload CAD files, drawings, and images securely</p>
                </div>
                <div className="p-3 border rounded-lg space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                    Reference Data
                  </h3>
                  <p className="text-xs text-muted-foreground">Query stages, materials, and system data</p>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex items-start gap-2">
                  <Key className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">Authentication</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                      Authorization: Bearer ery_live_your_api_key
                    </code>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Base URL</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                      https://vatgianzotsurljznsry.supabase.co/functions/v1
                    </code>
                  </div>
                </div>
              </div>

              <Button asChild variant="outline" className="w-full">
                <a href="/api-docs" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Explore Full API Documentation & Try It Out
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
