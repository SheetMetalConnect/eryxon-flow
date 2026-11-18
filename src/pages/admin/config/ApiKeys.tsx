import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DOCS_URL, FUNCTIONS_URL } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table/DataTable";

interface ApiKey { id: string; name: string; key_prefix: string; created_at: string; last_used_at: string | null; active: boolean }

// Keys are hashed by the Edge Function; the browser never writes api_keys directly.
async function keyApi<T>(method: "GET" | "POST" | "DELETE", body?: unknown, id?: string): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${FUNCTIONS_URL}/api-key-generate${id ? `?id=${id}` : ""}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error?.message ?? response.statusText);
  return result.data as T;
}

export default function ConfigApiKeys() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setKeys((await keyApi<{ api_keys: ApiKey[] }>("GET")).api_keys);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("apiKeys.failedToFetch"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  const generate = async () => {
    try {
      const key = await keyApi<{ api_key: string }>("POST", { name: name.trim() });
      setGenerated(key.api_key);
      setName("");
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("apiKeys.failedToGenerate"));
    }
  };

  const revoke = async (id: string) => {
    try {
      await keyApi("DELETE", undefined, id);
      toast.success(t("apiKeys.revokedToast"));
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("apiKeys.failedToRevoke"));
    }
  };

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(t("apiKeys.copied"));
  };

  const columns = useMemo<ColumnDef<ApiKey>[]>(() => [
    { accessorKey: "name", header: t("apiKeys.name"), cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "key_prefix", header: t("apiKeys.keyPrefix"), cell: ({ row }) => <code className="text-sm">{row.original.key_prefix}…</code> },
    { accessorKey: "created_at", header: t("apiKeys.created"), cell: ({ row }) => format(new Date(row.original.created_at), "d MMM yyyy") },
    { accessorKey: "last_used_at", header: t("apiKeys.lastUsed"), cell: ({ row }) => row.original.last_used_at ? format(new Date(row.original.last_used_at), "d MMM yyyy HH:mm") : t("apiKeys.never") },
    { accessorKey: "active", header: t("apiKeys.status"), cell: ({ row }) => <Badge variant={row.original.active ? "default" : "secondary"}>{row.original.active ? t("apiKeys.active") : t("apiKeys.revoked")}</Badge> },
    { id: "actions", header: "", cell: ({ row }) => row.original.active ? (
      <Button variant="ghost" size="sm" title={t("apiKeys.revoke")} onClick={() => void revoke(row.original.id)}><Trash2 className="h-4 w-4" /></Button>
    ) : null },
  ], [t]);

  const curl = `curl ${FUNCTIONS_URL}/api-jobs?status=in_progress \\\n  -H "Authorization: Bearer ery_live_…"`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("apiKeys.title")}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">{t("apiKeys.subtitle")}</p>
        </div>
        <Button onClick={() => { setGenerated(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />{t("apiKeys.generate")}</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={keys} loading={loading} emptyMessage={t("apiKeys.noKeys")} showToolbar={false} pageSize={10} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("apiKeys.usage")}</CardTitle>
          <CardDescription>{t("apiKeys.usageHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <code className="truncate text-sm">{FUNCTIONS_URL}</code>
            <Button variant="ghost" size="sm" onClick={() => copy(FUNCTIONS_URL)}><Copy className="h-4 w-4" /></Button>
          </div>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{curl}</pre>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`${DOCS_URL}/api/rest-api-reference/`} target="_blank" rel="noopener noreferrer">{t("apiKeys.reference")}<ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/openapi.json" target="_blank" rel="noopener noreferrer">{t("apiKeys.spec")}<ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("apiKeys.generate")}</DialogTitle>
            <DialogDescription>{generated ? t("apiKeys.saveKeyNow") : t("apiKeys.nameHint")}</DialogDescription>
          </DialogHeader>
          {generated ? (
            <div className="space-y-3">
              <code className="block break-all rounded-md bg-muted p-3 text-sm">{generated}</code>
              <Button className="w-full" onClick={() => copy(generated)}><Copy className="mr-2 h-4 w-4" />{t("apiKeys.copy")}</Button>
              <Button className="w-full" variant="outline" onClick={() => setDialogOpen(false)}>{t("apiKeys.done")}</Button>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void generate(); }}>
              <Label htmlFor="key-name">{t("apiKeys.name")}</Label>
              <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("apiKeys.namePlaceholder")} required />
              <Button type="submit" className="w-full">{t("apiKeys.generate")}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
