import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "@/components/ui/data-table/DataTableColumnHeader";

const AVAILABLE_EVENTS = [
  // Job lifecycle events
  { id: 'job.created', label: 'Job Created', description: 'When a new job is created via API' },
  { id: 'job.started', label: 'Job Started', description: 'When a job changes to in_progress' },
  { id: 'job.stopped', label: 'Job Stopped', description: 'When a job is put on hold' },
  { id: 'job.completed', label: 'Job Completed', description: 'When a job is marked complete' },
  { id: 'job.resumed', label: 'Job Resumed', description: 'When a paused job is resumed' },
  // Operation lifecycle events
  { id: 'operation.started', label: 'Operation Started', description: 'When an operator starts an operation' },
  { id: 'operation.paused', label: 'Operation Paused', description: 'When an operation is paused' },
  { id: 'operation.resumed', label: 'Operation Resumed', description: 'When a paused operation is resumed' },
  { id: 'operation.completed', label: 'Operation Completed', description: 'When an operation is marked complete' },
  // Issue/NCR events
  { id: 'issue.created', label: 'Issue Created', description: 'When a quality issue or NCR is reported' },
];

interface Webhook {
  id: string;
  url: string;
  events: string[];
  created_at: string;
  active: boolean;
}

interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  status_code: number | null;
  error_message: string | null;
  created_at: string;
  webhook?: { url: string };
}

export default function ConfigWebhooks() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const fetchWebhooks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('tenant_id', profile?.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(t('webhooks.error'), { description: t('webhooks.failedToFetch') });
    } else {
      setWebhooks(data || []);
    }
    setLoading(false);
  };

  const fetchWebhookLogs = async () => {
    setLogsLoading(true);

    const { data: tenantWebhooks } = await supabase
      .from('webhooks')
      .select('id')
      .eq('tenant_id', profile?.tenant_id);

    if (!tenantWebhooks || tenantWebhooks.length === 0) {
      setWebhookLogs([]);
      setLogsLoading(false);
      return;
    }

    const webhookIds = tenantWebhooks.map(w => w.id);

    const { data, error } = await supabase
      .from('webhook_logs')
      .select(`
        id,
        webhook_id,
        event_type,
        payload,
        status_code,
        error_message,
        created_at,
        webhook:webhooks(url)
      `)
      .in('webhook_id', webhookIds)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching webhook logs:', error);
      toast.error(t('webhooks.error'), { description: t('webhooks.failedToFetchLogs') });
    } else {
      setWebhookLogs(data || []);
    }
    setLogsLoading(false);
  };

  useEffect(() => {
    if (profile?.tenant_id) {
      const loadTimeout = window.setTimeout(() => {
        void fetchWebhooks();
        void fetchWebhookLogs();
      }, 0);
      return () => clearTimeout(loadTimeout);
    }
    return;
  }, [profile?.tenant_id]);

  const generateSecretKey = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const createWebhook = async () => {
    if (!webhookUrl.trim() || !webhookUrl.startsWith('https://')) {
      toast.error(t('webhooks.error'), { description: t('webhooks.enterValidUrl') });
      return;
    }

    if (selectedEvents.length === 0) {
      toast.error(t('webhooks.error'), { description: t('webhooks.selectAtLeastOne') });
      return;
    }

    const secretKey = generateSecretKey();

    const { error } = await supabase
      .from('webhooks')
      .insert({
        tenant_id: profile?.tenant_id,
        url: webhookUrl,
        events: selectedEvents,
        secret_key: secretKey,
        active: true
      });

    if (error) {
      toast.error(t('webhooks.error'), { description: t('webhooks.failedToCreate') });
    } else {
      toast.success(t('webhooks.success'), { description: t('webhooks.created') });
      setDialogOpen(false);
      setWebhookUrl("");
      setSelectedEvents([]);
      fetchWebhooks();
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId);

    if (error) {
      toast.error(t('webhooks.error'), { description: t('webhooks.failedToDelete') });
    } else {
      toast.success(t('webhooks.success'), { description: t('webhooks.deleted') });
      fetchWebhooks();
    }
  };

  const toggleWebhook = async (webhookId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('webhooks')
      .update({ active: !currentStatus })
      .eq('id', webhookId);

    if (error) {
      toast.error(t('webhooks.error'), { description: t('webhooks.failedToUpdate') });
    } else {
      fetchWebhooks();
    }
  };

  const webhookColumns: ColumnDef<Webhook>[] = useMemo(() => [
    {
      accessorKey: "url",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('webhooks.url')} />
      ),
      cell: ({ row }) => (
        <code className="text-sm">{row.getValue("url")}</code>
      ),
    },
    {
      accessorKey: "events",
      header: t('webhooks.events'),
      cell: ({ row }) => {
        const events = row.getValue("events") as string[];
        return (
          <div className="flex gap-1 flex-wrap">
            {events.map((event) => (
              <Badge key={event} variant="outline" className="text-xs">
                {event}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('webhooks.created')} />
      ),
      cell: ({ row }) => format(new Date(row.getValue("created_at")), 'MMM d, yyyy'),
    },
    {
      accessorKey: "active",
      header: t('webhooks.status'),
      cell: ({ row }) => {
        const active = row.getValue("active") as boolean;
        return (
          <Badge variant={active ? "default" : "secondary"}>
            {active ? t('webhooks.active') : t('webhooks.disabled')}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: t('webhooks.actions'),
      cell: ({ row }) => {
        const webhook = row.original;
        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleWebhook(webhook.id, webhook.active)}
            >
              {webhook.active ? t('webhooks.disable') : t('webhooks.enable')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteWebhook(webhook.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ], [t, deleteWebhook, toggleWebhook]);

  const logColumns: ColumnDef<WebhookLog>[] = useMemo(() => [
    {
      accessorKey: "event_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Event" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("event_type")}</Badge>
      ),
    },
    {
      accessorKey: "status_code",
      header: "Status",
      cell: ({ row }) => {
        const statusCode = row.getValue("status_code") as number | null;
        return statusCode ? (
          <Badge variant={statusCode >= 200 && statusCode < 300 ? "default" : "destructive"}>
            {statusCode}
          </Badge>
        ) : (
          <Badge variant="destructive">Failed</Badge>
        );
      },
    },
    {
      accessorKey: "webhook.url",
      id: "webhook_url",
      header: "Webhook",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.webhook?.url || 'Unknown'}
        </span>
      ),
    },
    {
      accessorKey: "error_message",
      header: "Error",
      cell: ({ row }) => {
        const error = row.getValue("error_message") as string | null;
        return error ? (
          <span className="text-sm text-destructive">{error}</span>
        ) : null;
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Time" />
      ),
      cell: ({ row }) => format(new Date(row.getValue("created_at")), 'MMM d, HH:mm:ss'),
    },
  ], []);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
          {t('webhooks.title')}
        </h1>
        <p className="text-muted-foreground text-lg">{t('webhooks.description')}</p>
      </div>

      <hr className="title-divider" />

      <div className="flex justify-end">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchWebhookLogs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('webhooks.refreshLogs')}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="cta-button">
                <Plus className="mr-2 h-4 w-4" />
                {t('webhooks.addWebhook')}
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card sm:max-w-lg overflow-hidden flex flex-col">
              <DialogHeader className="shrink-0">
                <DialogTitle>{t('webhooks.createWebhook')}</DialogTitle>
                <DialogDescription>
                  {t('webhooks.configureWebhook')}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">{t('webhooks.webhookUrl')}</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder={t('webhooks.urlPlaceholder')}
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">{t('webhooks.mustBeHttps')}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t('webhooks.events')}</Label>
                  <div className="border rounded-lg p-3 space-y-3">
                    {AVAILABLE_EVENTS.map((event) => (
                      <div key={event.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={event.id}
                          checked={selectedEvents.includes(event.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEvents([...selectedEvents, event.id]);
                            } else {
                              setSelectedEvents(selectedEvents.filter(e => e !== event.id));
                            }
                          }}
                          className="mt-0.5"
                        />
                        <div>
                          <Label htmlFor={event.id} className="cursor-pointer font-medium">
                            {event.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="shrink-0 border-t pt-4">
                <Button onClick={createWebhook} className="w-full">
                  {t('webhooks.createWebhook')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="webhooks" className="w-full">
        <TabsList>
          <TabsTrigger value="webhooks">{t('webhooks.webhooks')}</TabsTrigger>
          <TabsTrigger value="logs">{t('webhooks.deliveryLogs')}</TabsTrigger>
          <TabsTrigger value="docs">{t('webhooks.documentation')}</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t('webhooks.configuredWebhooks')}</CardTitle>
              <CardDescription>
                {t('webhooks.webhooksDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={webhookColumns}
                data={webhooks || []}
                loading={loading}
                searchPlaceholder={t('webhooks.searchWebhooks') || "Search webhooks..."}
                pageSize={10}
                emptyMessage={t('webhooks.noWebhooks')}
                showToolbar={false}
              />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Webhook Payload Format</CardTitle>
              <CardDescription>Example of webhook POST request</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
                {`{
  "event": "operation.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "tenant_id": "uuid",
  "data": {
    "operation_id": "uuid",
    "operation_name": "Laser cutting",
    "part_number": "P-001",
    "job_number": "J-2024-001",
    "completed_at": "2024-01-15T10:30:00Z",
    "actual_time": 50
  }
}`}
              </pre>
              <p className="text-sm text-muted-foreground mt-4">
                All requests include an <code>X-Eryxon-Signature</code> header with HMAC signature for verification.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t('webhooks.webhookDeliveryLogs')}</CardTitle>
              <CardDescription>{t('webhooks.recentAttempts')}</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={logColumns}
                data={webhookLogs || []}
                loading={logsLoading}
                searchPlaceholder="Search logs..."
                pageSize={20}
                emptyMessage={t('webhooks.noDeliveries')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Webhook Documentation</CardTitle>
              <CardDescription>How to set up and verify webhooks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Available Events</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Job Lifecycle</h4>
                    <ul className="space-y-2 text-sm">
                      <li><code className="bg-muted px-2 py-1 rounded">job.created</code> - When a new job is created via API</li>
                      <li><code className="bg-muted px-2 py-1 rounded">job.started</code> - When a job changes to in_progress</li>
                      <li><code className="bg-muted px-2 py-1 rounded">job.stopped</code> - When a job is put on hold</li>
                      <li><code className="bg-muted px-2 py-1 rounded">job.completed</code> - When a job is marked complete</li>
                      <li><code className="bg-muted px-2 py-1 rounded">job.resumed</code> - When a paused job is resumed</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Operation Lifecycle</h4>
                    <ul className="space-y-2 text-sm">
                      <li><code className="bg-muted px-2 py-1 rounded">operation.started</code> - When an operator starts an operation</li>
                      <li><code className="bg-muted px-2 py-1 rounded">operation.paused</code> - When an operation is paused</li>
                      <li><code className="bg-muted px-2 py-1 rounded">operation.resumed</code> - When a paused operation is resumed</li>
                      <li><code className="bg-muted px-2 py-1 rounded">operation.completed</code> - When an operation is marked complete</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Quality & Issues</h4>
                    <ul className="space-y-2 text-sm">
                      <li><code className="bg-muted px-2 py-1 rounded">issue.created</code> - When a quality issue or NCR is reported</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Signature Verification</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  All webhook requests include an X-Eryxon-Signature header with HMAC-SHA256 signature.
                  Verify the signature to ensure the request came from Eryxon Flow:
                </p>
                <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                  {`// Node.js example
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Best Practices</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Always verify the signature before processing webhooks</li>
                  <li>Respond with 200 status code quickly (within 10 seconds)</li>
                  <li>Use HTTPS endpoints only</li>
                  <li>Implement retry logic for processing failures</li>
                  <li>Log webhook payloads for debugging</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
