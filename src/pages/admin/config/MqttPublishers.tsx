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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, RefreshCw, Radio, Wifi, WifiOff, Info } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "@/components/ui/data-table/DataTableColumnHeader";
import { AVAILABLE_EVENTS } from "@/lib/event-dispatch";

interface MqttPublisher {
  id: string;
  name: string;
  description: string | null;
  broker_url: string;
  port: number;
  username: string | null;
  topic_pattern: string;
  default_enterprise: string;
  default_site: string;
  default_area: string;
  use_tls: boolean;
  events: string[];
  active: boolean;
  last_connected_at: string | null;
  last_error: string | null;
  created_at: string;
}

interface MqttLog {
  id: string;
  mqtt_publisher_id: string;
  event_type: string;
  topic: string;
  payload: unknown;
  success: boolean;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
}

// Topic pattern variables for documentation
const TOPIC_VARIABLES = [
  { name: '{enterprise}', description: 'Company/organization name' },
  { name: '{site}', description: 'Physical location/factory' },
  { name: '{area}', description: 'Manufacturing area (e.g., fabrication)' },
  { name: '{cell}', description: 'QRM cell / work center (e.g., laser_cutting)' },
  { name: '{line}', description: 'Production line within cell' },
  { name: '{operation}', description: 'Operation type/name' },
  { name: '{event}', description: 'Event type (e.g., operation/started)' },
  { name: '{tenant_id}', description: 'Tenant ID for multi-tenancy' },
  { name: '{job_number}', description: 'Job number' },
  { name: '{part_number}', description: 'Part number' },
];

export default function ConfigMqttPublishers() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [publishers, setPublishers] = useState<MqttPublisher[]>([]);
  const [mqttLogs, setMqttLogs] = useState<MqttLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [publisherName, setPublisherName] = useState("");
  const [brokerUrl, setBrokerUrl] = useState("");
  const [port, setPort] = useState(1883);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [topicPattern, setTopicPattern] = useState("{enterprise}/{site}/{area}/{cell}/{event}");
  const [defaultEnterprise, setDefaultEnterprise] = useState("eryxon");
  const [defaultSite, setDefaultSite] = useState("main");
  const [defaultArea, setDefaultArea] = useState("production");
  const [useTls, setUseTls] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchPublishers();
      fetchMqttLogs();
    }
  }, [profile?.tenant_id]);

  const fetchPublishers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mqtt_publishers')
      .select('*')
      .eq('tenant_id', profile?.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: t('mqtt.error'),
        description: t('mqtt.failedToFetch'),
        variant: "destructive",
      });
    } else {
      setPublishers(data || []);
    }
    setLoading(false);
  };

  const fetchMqttLogs = async () => {
    setLogsLoading(true);

    const { data: tenantPublishers } = await supabase
      .from('mqtt_publishers')
      .select('id')
      .eq('tenant_id', profile?.tenant_id);

    if (!tenantPublishers || tenantPublishers.length === 0) {
      setMqttLogs([]);
      setLogsLoading(false);
      return;
    }

    const publisherIds = tenantPublishers.map(p => p.id);

    const { data, error } = await supabase
      .from('mqtt_logs')
      .select('*')
      .in('mqtt_publisher_id', publisherIds)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching MQTT logs:', error);
      toast({
        title: t('mqtt.error'),
        description: t('mqtt.failedToFetchLogs'),
        variant: "destructive",
      });
    } else {
      setMqttLogs(data || []);
    }
    setLogsLoading(false);
  };

  const resetForm = () => {
    setPublisherName("");
    setBrokerUrl("");
    setPort(1883);
    setUsername("");
    setPassword("");
    setTopicPattern("{enterprise}/{site}/{area}/{cell}/{event}");
    setDefaultEnterprise("eryxon");
    setDefaultSite("main");
    setDefaultArea("production");
    setUseTls(false);
    setSelectedEvents([]);
  };

  // Generate preview topic
  const previewTopic = useMemo(() => {
    let topic = topicPattern;
    topic = topic.replace('{enterprise}', defaultEnterprise || 'eryxon');
    topic = topic.replace('{site}', defaultSite || 'main');
    topic = topic.replace('{area}', defaultArea || 'production');
    topic = topic.replace('{cell}', 'laser_cutting');
    topic = topic.replace('{line}', 'line1');
    topic = topic.replace('{operation}', 'cut_panel');
    topic = topic.replace('{event}', 'operation/started');
    topic = topic.replace('{tenant_id}', 'abc123');
    topic = topic.replace('{job_number}', 'j-2024-001');
    topic = topic.replace('{part_number}', 'p-001');
    return topic.split('/').filter(s => s.length > 0).join('/');
  }, [topicPattern, defaultEnterprise, defaultSite, defaultArea]);

  const createPublisher = async () => {
    if (!publisherName.trim()) {
      toast({
        title: t('mqtt.error'),
        description: t('mqtt.enterName'),
        variant: "destructive",
      });
      return;
    }

    if (!brokerUrl.trim()) {
      toast({
        title: t('mqtt.error'),
        description: t('mqtt.enterBrokerUrl'),
        variant: "destructive",
      });
      return;
    }

    if (selectedEvents.length === 0) {
      toast({
        title: t('mqtt.error'),
        description: t('mqtt.selectAtLeastOne'),
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('mqtt_publishers')
      .insert({
        tenant_id: profile?.tenant_id,
        name: publisherName,
        broker_url: brokerUrl,
        port: port,
        username: username || null,
        password: password || null,
        topic_pattern: topicPattern,
        default_enterprise: defaultEnterprise,
        default_site: defaultSite,
        default_area: defaultArea,
        use_tls: useTls,
        events: selectedEvents,
        active: true,
        created_by: profile?.id,
      });

    if (error) {
      toast({
        title: t('mqtt.error'),
        description: t('mqtt.failedToCreate'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('mqtt.success'),
        description: t('mqtt.created'),
      });
      setDialogOpen(false);
      resetForm();
      fetchPublishers();
    }
  };

  const deletePublisher = async (publisherId: string) => {
    const { error } = await supabase
      .from('mqtt_publishers')
      .delete()
      .eq('id', publisherId);

    if (error) {
      toast({
        title: t('mqtt.error'),
        description: t('mqtt.failedToDelete'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('mqtt.success'),
        description: t('mqtt.deleted'),
      });
      fetchPublishers();
    }
  };

  const togglePublisher = async (publisherId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('mqtt_publishers')
      .update({ active: !currentStatus })
      .eq('id', publisherId);

    if (error) {
      toast({
        title: t('mqtt.error'),
        description: t('mqtt.failedToUpdate'),
        variant: "destructive",
      });
    } else {
      fetchPublishers();
    }
  };

  const publisherColumns: ColumnDef<MqttPublisher>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('mqtt.name')} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "broker_url",
      header: t('mqtt.broker'),
      cell: ({ row }) => {
        const publisher = row.original;
        return (
          <code className="text-sm">
            {publisher.broker_url}:{publisher.port}
          </code>
        );
      },
    },
    {
      accessorKey: "topic_pattern",
      header: t('mqtt.topicPattern'),
      cell: ({ row }) => (
        <code className="text-xs text-muted-foreground max-w-[200px] truncate block">
          {row.getValue("topic_pattern")}
        </code>
      ),
    },
    {
      accessorKey: "events",
      header: t('mqtt.events'),
      cell: ({ row }) => {
        const events = row.getValue("events") as string[];
        return (
          <div className="flex gap-1 flex-wrap max-w-[200px]">
            {events.slice(0, 2).map((event) => (
              <Badge key={event} variant="outline" className="text-xs">
                {event}
              </Badge>
            ))}
            {events.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{events.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "last_connected_at",
      header: t('mqtt.lastConnected'),
      cell: ({ row }) => {
        const lastConnected = row.getValue("last_connected_at") as string | null;
        const lastError = row.original.last_error;
        return lastConnected ? (
          <div className="flex items-center gap-1">
            <Wifi className="h-3 w-3 text-green-500" />
            <span className="text-sm">{format(new Date(lastConnected), 'MMM d, HH:mm')}</span>
          </div>
        ) : lastError ? (
          <div className="flex items-center gap-1">
            <WifiOff className="h-3 w-3 text-destructive" />
            <span className="text-sm text-destructive">{t('mqtt.connectionFailed')}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{t('mqtt.neverConnected')}</span>
        );
      },
    },
    {
      accessorKey: "active",
      header: t('mqtt.status'),
      cell: ({ row }) => {
        const active = row.getValue("active") as boolean;
        return (
          <Badge variant={active ? "default" : "secondary"}>
            {active ? t('mqtt.active') : t('mqtt.disabled')}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: t('mqtt.actions'),
      cell: ({ row }) => {
        const publisher = row.original;
        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => togglePublisher(publisher.id, publisher.active)}
            >
              {publisher.active ? t('mqtt.disable') : t('mqtt.enable')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deletePublisher(publisher.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ], [t]);

  const logColumns: ColumnDef<MqttLog>[] = useMemo(() => [
    {
      accessorKey: "event_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('mqtt.event')} />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("event_type")}</Badge>
      ),
    },
    {
      accessorKey: "topic",
      header: t('mqtt.topic'),
      cell: ({ row }) => (
        <code className="text-xs text-muted-foreground max-w-[250px] truncate block">
          {row.getValue("topic")}
        </code>
      ),
    },
    {
      accessorKey: "success",
      header: t('mqtt.status'),
      cell: ({ row }) => {
        const success = row.getValue("success") as boolean;
        return (
          <Badge variant={success ? "default" : "destructive"}>
            {success ? t('mqtt.published') : t('mqtt.failed')}
          </Badge>
        );
      },
    },
    {
      accessorKey: "latency_ms",
      header: t('mqtt.latency'),
      cell: ({ row }) => {
        const latency = row.getValue("latency_ms") as number | null;
        return latency ? (
          <span className="text-sm">{latency}ms</span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: "error_message",
      header: t('mqtt.errorMessage'),
      cell: ({ row }) => {
        const error = row.getValue("error_message") as string | null;
        return error ? (
          <span className="text-sm text-destructive max-w-[200px] truncate block">
            {error}
          </span>
        ) : null;
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('mqtt.time')} />
      ),
      cell: ({ row }) => format(new Date(row.getValue("created_at")), 'MMM d, HH:mm:ss'),
    },
  ], [t]);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
          {t('mqtt.title')}
        </h1>
        <p className="text-muted-foreground text-lg">{t('mqtt.description')}</p>
      </div>

      <hr className="title-divider" />

      <div className="flex justify-end">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchMqttLogs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('mqtt.refreshLogs')}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="cta-button">
                <Plus className="mr-2 h-4 w-4" />
                {t('mqtt.addPublisher')}
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('mqtt.createPublisher')}</DialogTitle>
                <DialogDescription>
                  {t('mqtt.configurePublisher')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold">{t('mqtt.basicInfo')}</h3>
                  <div className="space-y-2">
                    <Label htmlFor="publisher-name">{t('mqtt.publisherName')}</Label>
                    <Input
                      id="publisher-name"
                      placeholder={t('mqtt.namePlaceholder')}
                      value={publisherName}
                      onChange={(e) => setPublisherName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Broker Settings */}
                <div className="space-y-4">
                  <h3 className="font-semibold">{t('mqtt.brokerSettings')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="broker-url">{t('mqtt.brokerUrl')}</Label>
                      <Input
                        id="broker-url"
                        placeholder={t('mqtt.brokerPlaceholder')}
                        value={brokerUrl}
                        onChange={(e) => setBrokerUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="port">{t('mqtt.port')}</Label>
                      <Input
                        id="port"
                        type="number"
                        value={port}
                        onChange={(e) => setPort(parseInt(e.target.value) || 1883)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">{t('mqtt.username')}</Label>
                      <Input
                        id="username"
                        placeholder={t('mqtt.optional')}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('mqtt.password')}</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder={t('mqtt.optional')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="use-tls"
                      checked={useTls}
                      onCheckedChange={setUseTls}
                    />
                    <Label htmlFor="use-tls">{t('mqtt.useTls')}</Label>
                  </div>
                </div>

                {/* Topic Settings - Configurable UNS Pattern */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    {t('mqtt.topicSettings')}
                    <Badge variant="outline" className="text-xs">UNS / ISA-95</Badge>
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="topic-pattern">{t('mqtt.topicPattern')}</Label>
                    <Input
                      id="topic-pattern"
                      placeholder="{enterprise}/{site}/{area}/{cell}/{event}"
                      value={topicPattern}
                      onChange={(e) => setTopicPattern(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Info className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{t('mqtt.topicPatternHelp')}</span>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">{t('mqtt.topicPreview')}:</p>
                    <code className="text-sm">{previewTopic}</code>
                  </div>

                  {/* Default Values */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="default-enterprise" className="text-sm">
                        {t('mqtt.defaultEnterprise')}
                      </Label>
                      <Input
                        id="default-enterprise"
                        placeholder="eryxon"
                        value={defaultEnterprise}
                        onChange={(e) => setDefaultEnterprise(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default-site" className="text-sm">
                        {t('mqtt.defaultSite')}
                      </Label>
                      <Input
                        id="default-site"
                        placeholder="main"
                        value={defaultSite}
                        onChange={(e) => setDefaultSite(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default-area" className="text-sm">
                        {t('mqtt.defaultArea')}
                      </Label>
                      <Input
                        id="default-area"
                        placeholder="production"
                        value={defaultArea}
                        onChange={(e) => setDefaultArea(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Variable Reference */}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      {t('mqtt.availableVariables')}
                    </summary>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {TOPIC_VARIABLES.map(v => (
                        <div key={v.name} className="flex gap-2">
                          <code className="text-xs bg-muted px-1 rounded">{v.name}</code>
                          <span className="text-xs text-muted-foreground">{v.description}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>

                {/* Event Selection */}
                <div className="space-y-2">
                  <Label>{t('mqtt.events')}</Label>
                  <div className="border rounded-lg p-3 space-y-3 max-h-72 overflow-y-auto">
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

                <Button onClick={createPublisher} className="w-full">
                  {t('mqtt.createPublisher')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="publishers" className="w-full">
        <TabsList>
          <TabsTrigger value="publishers">{t('mqtt.publishers')}</TabsTrigger>
          <TabsTrigger value="logs">{t('mqtt.publishLogs')}</TabsTrigger>
          <TabsTrigger value="docs">{t('mqtt.documentation')}</TabsTrigger>
        </TabsList>

        <TabsContent value="publishers" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t('mqtt.configuredPublishers')}</CardTitle>
              <CardDescription>
                {t('mqtt.publishersDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={publisherColumns}
                data={publishers || []}
                loading={loading}
                searchPlaceholder={t('mqtt.searchPublishers') || "Search publishers..."}
                pageSize={10}
                emptyMessage={t('mqtt.noPublishers')}
                showToolbar={false}
              />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t('mqtt.unsPattern')}</CardTitle>
              <CardDescription>{t('mqtt.unsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
                {`# Unified Namespace (UNS) Topic Structure
# Based on ISA-95 / IEC 62264 hierarchy

{enterprise}/           # Company/organization
  {site}/               # Physical factory/location
    {area}/             # Manufacturing area (e.g., fabrication)
      {cell}/           # QRM cell/work center (e.g., laser_cutting)
        {line}/         # Production line (optional)
          {operation}/  # Operation type (optional)
            {event}     # Event type (e.g., operation/started)

Example Topics:
  acme/factory1/fabrication/laser_cutting/operation/started
  acme/factory1/assembly/welding_cell/line1/weld_frame/operation/completed
  eryxon/main/production/bending/job/created

Payload Format:
{
  "event": "operation.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "tenant_id": "abc123",
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t('mqtt.mqttPublishLogs')}</CardTitle>
              <CardDescription>{t('mqtt.recentAttempts')}</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={logColumns}
                data={mqttLogs || []}
                loading={logsLoading}
                searchPlaceholder={t('mqtt.searchLogs') || "Search logs..."}
                pageSize={20}
                emptyMessage={t('mqtt.noLogs')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t('mqtt.mqttDocumentation')}</CardTitle>
              <CardDescription>{t('mqtt.howToSetup')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">{t('mqtt.supportedBrokers')}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('mqtt.brokersDescription')}
                </p>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>HiveMQ Cloud</strong> - {t('mqtt.hivemqDesc')}</li>
                  <li>• <strong>EMQX Cloud</strong> - {t('mqtt.emqxDesc')}</li>
                  <li>• <strong>Mosquitto</strong> - {t('mqtt.mosquittoDesc')}</li>
                  <li>• <strong>AWS IoT Core</strong> - {t('mqtt.awsIotDesc')}</li>
                  <li>• <strong>Azure IoT Hub</strong> - {t('mqtt.azureIotDesc')}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">{t('mqtt.unsPatternTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('mqtt.unsPatternDescription')}
                </p>
                <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                  {`# ISA-95 Hierarchy for Manufacturing
# Enterprise > Site > Area > Cell > Line > Operation

# Example: Metal fabrication shop
acme/                        # Enterprise
  nl-factory/                # Site (Netherlands factory)
    fabrication/             # Area
      laser_cutting/         # Cell (QRM cell)
        operation/started    # Event
        operation/completed
        issue/created

# Subscribe patterns:
acme/+/+/+/operation/#       # All operation events across enterprise
acme/nl-factory/#            # All events from NL factory
acme/+/fabrication/#         # All events from fabrication areas
+/+/+/laser_cutting/#        # All laser cutting events`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">{t('mqtt.clientExample')}</h3>
                <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                  {`// Node.js example with MQTT.js
const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://your-broker.com', {
  username: 'your-username',
  password: 'your-password'
});

// Subscribe to all operation events from your factory
client.subscribe('acme/nl-factory/+/+/operation/#');

client.on('message', (topic, message) => {
  const event = JSON.parse(message.toString());
  console.log('Topic:', topic);
  console.log('Event:', event.event);
  console.log('Data:', event.data);

  // Extract hierarchy from topic
  const [enterprise, site, area, cell, ...eventParts] = topic.split('/');
  console.log(\`Cell: \${cell}, Event: \${eventParts.join('/')}\`);
});`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">{t('mqtt.bestPractices')}</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{t('mqtt.practice1')}</li>
                  <li>{t('mqtt.practice2')}</li>
                  <li>{t('mqtt.practice3')}</li>
                  <li>{t('mqtt.practice4')}</li>
                  <li>{t('mqtt.practice5')}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
