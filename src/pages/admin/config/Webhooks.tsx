import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import { Copy, Plus, RefreshCw, RotateCcw, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { productionErrorMessage } from "@/lib/errors";
import { DOCS_URL } from "@/lib/config";
import { WEBHOOK_EVENTS, WEBHOOK_EVENT_GROUPS } from "@/lib/webhookEvents";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table/DataTable";

type Webhook = Omit<Tables<"webhooks">, "secret_key">;
type Delivery = Pick<Tables<"webhook_deliveries">, "id" | "webhook_id" | "event" | "status" | "status_code" | "attempts" | "latency_ms" | "error" | "created_at"> & { webhook: { name: string } | null };

const newSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");

export default function ConfigWebhooks() {
  const { t } = useTranslation();
  const tenantId = useProfile()?.tenant_id;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", events: [] as string[] });
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["webhooks"] });
  const fail = (error: unknown) => toast.error(productionErrorMessage(error, t, "webhooks.failed"));

  const webhooks = useQuery({
    queryKey: ["webhooks", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase.from("webhooks")
        .select("id, tenant_id, name, url, events, active, consecutive_failures, disabled_reason, last_delivery_at, last_status_code, created_at, updated_at")
        .eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Webhook[];
    },
  });

  const deliveries = useQuery({
    queryKey: ["webhooks", "deliveries", tenantId],
    enabled: Boolean(tenantId),
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("webhook_deliveries")
        .select("id, webhook_id, event, status, status_code, attempts, latency_ms, error, created_at, webhook:webhooks(name)")
        .eq("tenant_id", tenantId!).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as Delivery[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const secret = newSecret();
      const { error } = await supabase.from("webhooks").insert({ tenant_id: tenantId!, name: form.name.trim(), url: form.url.trim(), events: form.events, secret_key: secret });
      if (error) throw error;
      return secret;
    },
    onSuccess: (secret) => { setCreatedSecret(secret); setForm({ name: "", url: "", events: [] }); refresh(); },
    onError: fail,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Webhook> & { id: string }) => {
      const { error } = await supabase.from("webhooks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh, onError: fail,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("webhooks").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success(t("webhooks.deleted")); refresh(); }, onError: fail,
  });
  const sendTest = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("webhook_send_test", { p_webhook_id: id }); if (error) throw error; },
    onSuccess: () => { toast.success(t("webhooks.testSent")); setTimeout(() => void deliveries.refetch(), 3000); }, onError: fail,
  });
  const redeliver = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("webhook_redeliver", { p_delivery_id: id }); if (error) throw error; },
    onSuccess: () => { toast.success(t("webhooks.redelivered")); setTimeout(() => void deliveries.refetch(), 3000); }, onError: fail,
  });

  const submit = () => {
    if (!form.name.trim()) return toast.error(t("webhooks.nameRequired"));
    if (!form.url.trim().startsWith("https://")) return toast.error(t("webhooks.mustBeHttps"));
    if (form.events.length === 0) return toast.error(t("webhooks.selectAtLeastOne"));
    create.mutate();
  };

  const webhookColumns = useMemo<ColumnDef<Webhook>[]>(() => [
    { accessorKey: "name", header: t("webhooks.name"), cell: ({ row }) => (
      <div><div className="font-medium">{row.original.name}</div><code className="text-xs text-muted-foreground">{row.original.url}</code></div>
    ) },
    { accessorKey: "events", header: t("webhooks.events"), cell: ({ row }) => (
      <div className="flex max-w-md flex-wrap gap-1">{row.original.events.map((e) => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}</div>
    ) },
    { id: "health", header: t("webhooks.lastDelivery"), cell: ({ row }) => {
      const w = row.original;
      if (!w.last_delivery_at) return <span className="text-sm text-muted-foreground">{t("webhooks.never")}</span>;
      const ok = w.last_status_code != null && w.last_status_code >= 200 && w.last_status_code < 300;
      return (
        <div className="text-sm">
          <Badge variant={ok ? "default" : "destructive"}>{w.last_status_code ?? t("webhooks.noResponse")}</Badge>
          <span className="ml-2 text-muted-foreground">{format(new Date(w.last_delivery_at), "MMM d, HH:mm")}</span>
          {w.consecutive_failures > 0 ? <div className="text-xs text-destructive">{t("webhooks.consecutiveFailures", { count: w.consecutive_failures })}</div> : null}
        </div>
      );
    } },
    { accessorKey: "active", header: t("webhooks.status"), cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Switch checked={row.original.active} onCheckedChange={(active) => update.mutate({ id: row.original.id, active, consecutive_failures: 0, disabled_reason: null })} aria-label={t("webhooks.active")} />
        {row.original.disabled_reason ? <span className="text-xs text-destructive">{row.original.disabled_reason}</span> : null}
      </div>
    ) },
    { id: "actions", header: "", cell: ({ row }) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={() => sendTest.mutate(row.original.id)} title={t("webhooks.sendTest")}><Send className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => { if (window.confirm(t("webhooks.deleteConfirm"))) remove.mutate(row.original.id); }} title={t("webhooks.delete")}><Trash2 className="h-4 w-4" /></Button>
      </div>
    ) },
  ], [t, update, sendTest, remove]);

  const deliveryColumns = useMemo<ColumnDef<Delivery>[]>(() => [
    { accessorKey: "created_at", header: t("webhooks.time"), cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, HH:mm:ss") },
    { accessorKey: "event", header: t("webhooks.event"), cell: ({ row }) => <Badge variant="outline">{row.original.event}</Badge> },
    { id: "webhook", header: t("webhooks.endpoint"), cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.webhook?.name ?? "—"}</span> },
    { accessorKey: "status", header: t("webhooks.status"), cell: ({ row }) => (
      <Badge variant={row.original.status === "delivered" ? "default" : "destructive"}>{row.original.status_code ?? t("webhooks.noResponse")}</Badge>
    ) },
    { id: "timing", header: t("webhooks.attempts"), cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.attempts}× · {row.original.latency_ms ?? "–"} ms</span> },
    { accessorKey: "error", header: t("webhooks.error"), cell: ({ row }) => <span className="line-clamp-2 max-w-xs text-xs text-destructive">{row.original.error}</span> },
    { id: "redeliver", header: "", cell: ({ row }) => (
      <Button variant="ghost" size="sm" onClick={() => redeliver.mutate(row.original.id)} title={t("webhooks.redeliver")}><RotateCcw className="h-4 w-4" /></Button>
    ) },
  ], [t, redeliver]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("webhooks.title")}</h1>
          <p className="text-muted-foreground">{t("webhooks.description")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void deliveries.refetch()}><RefreshCw className="mr-2 h-4 w-4" />{t("webhooks.refresh")}</Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />{t("webhooks.add")}</Button>
        </div>
      </div>

      <Tabs defaultValue="endpoints">
        <TabsList>
          <TabsTrigger value="endpoints">{t("webhooks.endpoints")}</TabsTrigger>
          <TabsTrigger value="deliveries">{t("webhooks.deliveries")}</TabsTrigger>
        </TabsList>
        <TabsContent value="endpoints">
          <Card>
            <CardContent className="pt-6">
              <DataTable columns={webhookColumns} data={webhooks.data ?? []} loading={webhooks.isLoading} showToolbar={false} pageSize={10} emptyMessage={t("webhooks.noWebhooks")} />
              <p className="mt-4 text-sm text-muted-foreground">
                {t("webhooks.docsHint")} <a className="underline" href={`${DOCS_URL}/architecture/connectivity-webhooks/`} target="_blank" rel="noopener noreferrer">{t("webhooks.docsLink")}</a>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="deliveries">
          <Card>
            <CardHeader><CardTitle>{t("webhooks.deliveries")}</CardTitle><CardDescription>{t("webhooks.deliveriesDescription")}</CardDescription></CardHeader>
            <CardContent>
              <DataTable columns={deliveryColumns} data={deliveries.data ?? []} loading={deliveries.isLoading} searchPlaceholder={t("webhooks.searchDeliveries")} pageSize={25} emptyMessage={t("webhooks.noDeliveries")} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setCreatedSecret(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {createdSecret ? (
            <>
              <DialogHeader><DialogTitle>{t("webhooks.secretTitle")}</DialogTitle><DialogDescription>{t("webhooks.secretOnce")}</DialogDescription></DialogHeader>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-muted p-2 text-xs">{createdSecret}</code>
                <Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(createdSecret); toast.success(t("webhooks.copied")); }}><Copy className="h-4 w-4" /></Button>
              </div>
              <Button onClick={() => setDialogOpen(false)}>{t("common.done")}</Button>
            </>
          ) : (
            <>
              <DialogHeader><DialogTitle>{t("webhooks.add")}</DialogTitle><DialogDescription>{t("webhooks.addDescription")}</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="webhook-name">{t("webhooks.name")}</Label>
                  <Input id="webhook-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("webhooks.namePlaceholder")} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="webhook-url">{t("webhooks.url")}</Label>
                  <Input id="webhook-url" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" />
                  <p className="text-xs text-muted-foreground">{t("webhooks.mustBeHttps")}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("webhooks.events")}</Label>
                    <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setForm({ ...form, events: form.events.length === WEBHOOK_EVENTS.length ? [] : [...WEBHOOK_EVENTS] })}>
                      {form.events.length === WEBHOOK_EVENTS.length ? t("webhooks.selectNone") : t("webhooks.selectAll")}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border p-3 text-sm">
                    {WEBHOOK_EVENT_GROUPS.map((group) => (
                      <div key={group} className="space-y-1">
                        <div className="text-xs font-semibold uppercase text-muted-foreground">{group}</div>
                        {WEBHOOK_EVENTS.filter((e) => e.startsWith(`${group}.`)).map((event) => (
                          <label key={event} className="flex cursor-pointer items-center gap-2">
                            <Checkbox checked={form.events.includes(event)} onCheckedChange={(checked) => setForm({ ...form, events: checked ? [...form.events, event] : form.events.filter((e) => e !== event) })} />
                            <code className="text-xs">{event.slice(group.length + 1)}</code>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={submit} disabled={create.isPending}>{t("webhooks.create")}</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
