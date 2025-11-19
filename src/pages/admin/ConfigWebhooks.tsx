import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Eye, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

const AVAILABLE_EVENTS = [
  { id: 'operation.started', label: 'Operation Started' },
  { id: 'operation.completed', label: 'Operation Completed' },
  { id: 'issue.created', label: 'Issue Created' },
];

export default function ConfigWebhooks() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedWebhookFilter, setSelectedWebhookFilter] = useState<string>("all");

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchWebhooks();
      fetchWebhookLogs();
    }
  }, [profile?.tenant_id]);

  const fetchWebhooks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('tenant_id', profile?.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: t('webhooks.error'),
        description: t('webhooks.failedToFetch'),
        variant: "destructive",
      });
    } else {
      setWebhooks(data || []);
    }
    setLoading(false);
  };

  const fetchWebhookLogs = async () => {
    setLogsLoading(true);

    // First get all webhook IDs for this tenant
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

    // Then get logs for those webhooks
    let query = supabase
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

    // Apply filter if not "all"
    if (selectedWebhookFilter !== "all") {
      query = query.eq('webhook_id', selectedWebhookFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching webhook logs:', error);
      toast({
        title: t('webhooks.error'),
        description: t('webhooks.failedToFetchLogs'),
        variant: "destructive",
      });
    } else {
      setWebhookLogs(data || []);
    }
    setLogsLoading(false);
  };

  const generateSecretKey = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const createWebhook = async () => {
    if (!webhookUrl.trim() || !webhookUrl.startsWith('https://')) {
      toast({
        title: t('webhooks.error'),
        description: t('webhooks.enterValidUrl'),
        variant: "destructive",
      });
      return;
    }

    if (selectedEvents.length === 0) {
      toast({
        title: t('webhooks.error'),
        description: t('webhooks.selectAtLeastOne'),
        variant: "destructive",
      });
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
      toast({
        title: t('webhooks.error'),
        description: t('webhooks.failedToCreate'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('webhooks.success'),
        description: t('webhooks.created'),
      });
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
      toast({
        title: t('webhooks.error'),
        description: t('webhooks.failedToDelete'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('webhooks.success'),
        description: t('webhooks.deleted'),
      });
      fetchWebhooks();
    }
  };

  const toggleWebhook = async (webhookId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('webhooks')
      .update({ active: !currentStatus })
      .eq('id', webhookId);

    if (error) {
      toast({
        title: t('webhooks.error'),
        description: t('webhooks.failedToUpdate'),
        variant: "destructive",
      });
    } else {
      fetchWebhooks();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('webhooks.title')}</h1>
            <p className="text-muted-foreground">{t('webhooks.description')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchWebhookLogs}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('webhooks.refreshLogs')}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('webhooks.addWebhook')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('webhooks.createWebhook')}</DialogTitle>
                <DialogDescription>
                  {t('webhooks.configureWebhook')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                  {AVAILABLE_EVENTS.map((event) => (
                    <div key={event.id} className="flex items-center space-x-2">
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
                      />
                      <Label htmlFor={event.id} className="cursor-pointer">
                        {event.label}
                      </Label>
                    </div>
                  ))}
                </div>
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
        <Card>
          <CardHeader>
            <CardTitle>{t('webhooks.configuredWebhooks')}</CardTitle>
            <CardDescription>
              {t('webhooks.webhooksDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">{t('webhooks.loading')}</div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('webhooks.noWebhooks')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('webhooks.url')}</TableHead>
                    <TableHead>{t('webhooks.events')}</TableHead>
                    <TableHead>{t('webhooks.created')}</TableHead>
                    <TableHead>{t('webhooks.status')}</TableHead>
                    <TableHead className="text-right">{t('webhooks.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell>
                        <code className="text-sm">{webhook.url}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {webhook.events.map((event: string) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(webhook.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={webhook.active ? "default" : "secondary"}>
                          {webhook.active ? t('webhooks.active') : t('webhooks.disabled')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
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
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{t('webhooks.webhookDeliveryLogs')}</CardTitle>
                    <CardDescription>{t('webhooks.recentAttempts')}</CardDescription>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Label className="text-sm text-muted-foreground">{t('webhooks.filter')}:</Label>
                    <select
                      value={selectedWebhookFilter}
                      onChange={(e) => {
                        setSelectedWebhookFilter(e.target.value);
                        fetchWebhookLogs();
                      }}
                      className="border rounded px-3 py-1.5 text-sm"
                    >
                      <option value="all">{t('webhooks.allWebhooks')}</option>
                      {webhooks.map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          {wh.url}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="text-center py-8">{t('webhooks.loadingLogs')}</div>
                ) : webhookLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('webhooks.noDeliveries')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {webhookLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{log.event_type}</Badge>
                              {log.status_code ? (
                                <Badge
                                  variant={
                                    log.status_code >= 200 && log.status_code < 300
                                      ? "default"
                                      : "destructive"
                                  }
                                >
                                  {log.status_code}
                                </Badge>
                              ) : (
                                <Badge variant="destructive">Failed</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {log.webhook?.url || 'Unknown webhook'}
                            </p>
                            {log.error_message && (
                              <p className="text-sm text-destructive mt-1">
                                {log.error_message}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                          </div>
                        </div>
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            {t('webhooks.viewPayload')}
                          </summary>
                          <pre className="mt-2 bg-muted p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Documentation</CardTitle>
                <CardDescription>How to set up and verify webhooks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Available Events</h3>
                  <ul className="space-y-2 text-sm">
                    <li><code className="bg-muted px-2 py-1 rounded">job.created</code> - Triggered when a job is created via API</li>
                    <li><code className="bg-muted px-2 py-1 rounded">operation.started</code> - Triggered when an operator starts an operation</li>
                    <li><code className="bg-muted px-2 py-1 rounded">operation.completed</code> - Triggered when an operation is marked complete</li>
                    <li><code className="bg-muted px-2 py-1 rounded">issue.created</code> - Triggered when a quality issue is reported</li>
                  </ul>
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
}

// In your webhook handler
app.post('/webhooks/eryxon', (req, res) => {
  const signature = req.headers['x-eryxon-signature'];
  const payload = JSON.stringify(req.body);
  const secret = 'your_webhook_secret';

  if (!verifyWebhook(payload, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook...
  res.status(200).send('OK');
});`}
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

                <div>
                  <h3 className="font-semibold mb-2">Testing Webhooks</h3>
                  <p className="text-sm text-muted-foreground">
                    Use tools like <a href="https://webhook.site" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">webhook.site</a> or <a href="https://requestbin.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">requestbin.com</a> to test and inspect webhook payloads during development.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
