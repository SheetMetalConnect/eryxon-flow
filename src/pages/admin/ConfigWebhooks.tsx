import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";

const AVAILABLE_EVENTS = [
  { id: 'task.started', label: 'Task Started' },
  { id: 'task.completed', label: 'Task Completed' },
  { id: 'issue.created', label: 'Issue Created' },
];

export default function ConfigWebhooks() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchWebhooks();
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
        title: "Error",
        description: "Failed to fetch webhooks",
        variant: "destructive",
      });
    } else {
      setWebhooks(data || []);
    }
    setLoading(false);
  };

  const generateSecretKey = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const createWebhook = async () => {
    if (!webhookUrl.trim() || !webhookUrl.startsWith('https://')) {
      toast({
        title: "Error",
        description: "Please enter a valid HTTPS URL",
        variant: "destructive",
      });
      return;
    }

    if (selectedEvents.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one event",
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
        title: "Error",
        description: "Failed to create webhook",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Webhook created successfully",
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
        title: "Error",
        description: "Failed to delete webhook",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Webhook deleted",
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
        title: "Error",
        description: "Failed to update webhook",
        variant: "destructive",
      });
    } else {
      fetchWebhooks();
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Webhooks</h1>
            <p className="text-muted-foreground">Configure outbound webhook notifications</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Webhook</DialogTitle>
                <DialogDescription>
                  Configure a webhook to receive event notifications
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://your-api.com/webhooks/eryxon"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">Must be HTTPS</p>
                </div>
                <div className="space-y-2">
                  <Label>Events</Label>
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
                  Create Webhook
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configured Webhooks</CardTitle>
            <CardDescription>
              Webhooks send HTTP POST requests to your endpoints when events occur
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No webhooks configured yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                          {webhook.active ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleWebhook(webhook.id, webhook.active)}
                          >
                            {webhook.active ? "Disable" : "Enable"}
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
  "event": "task.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "tenant_id": "uuid",
  "data": {
    "task_id": "uuid",
    "task_name": "Laser cutting",
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
      </div>
    </Layout>
  );
}
