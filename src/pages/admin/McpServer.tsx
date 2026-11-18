import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import { Bot, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { env } from "@/config/env";
import { DOCS_URL } from "@/lib/config";
import { claudeCodeCommand, mcpServersJson, randomBearer, serverEnv, type McpConnection } from "@/lib/mcpConfig";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PROTOCOL = "2026-07-28";
const STORAGE = "mcp_connection";

interface Actor { id: string; full_name: string; is_machine: boolean }
interface Activity { id: string; action: string; entity_type: string | null; entity_name: string | null; created_at: string }

function Snippet({ title, code }: { title: string; code: string }) {
  const { t } = useTranslation();
  const copy = () => {
    void navigator.clipboard.writeText(code);
    toast.success(t("mcp.copied"));
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <Button variant="ghost" size="sm" onClick={copy}><Copy className="mr-1.5 h-3.5 w-3.5" />{t("mcp.copy")}</Button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{code}</pre>
    </div>
  );
}

export default function McpServer() {
  const { t } = useTranslation();
  const profile = useProfile();
  const [actors, setActors] = useState<Actor[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [conn, setConn] = useState<McpConnection>(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE) ?? "{}") as Partial<McpConnection>;
    return {
      transport: "http",
      url: env("VITE_MCP_HTTP_URL") ?? "https://mcp.example.com/mcp",
      entrypoint: env("VITE_MCP_SERVER_ENTRYPOINT") ?? "/absolute/path/to/eryxon-flow/mcp-server/dist/index.js",
      bearer: "",
      actorId: "",
      supabaseUrl: env("VITE_SUPABASE_URL") ?? "",
      tenantId: "",
      ...stored,
    };
  });
  const update = (patch: Partial<McpConnection>) => setConn((c) => ({ ...c, ...patch }));

  useEffect(() => {
    const { bearer: _bearer, ...persisted } = conn;
    localStorage.setItem(STORAGE, JSON.stringify(persisted));
  }, [conn]);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    update({ tenantId: profile.tenant_id });
    void supabase.from("profiles").select("id, full_name, is_machine").eq("tenant_id", profile.tenant_id).order("full_name")
      .then(({ data }) => setActors(data ?? []));
  }, [profile?.tenant_id]);

  useEffect(() => {
    if (!conn.actorId) return setActivity([]);
    void supabase.from("activity_log").select("id, action, entity_type, entity_name, created_at")
      .eq("user_id", conn.actorId).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setActivity(data ?? []));
  }, [conn.actorId]);

  const snippets = useMemo(() => ({
    env: serverEnv(conn), claude: claudeCodeCommand(conn), json: mcpServersJson(conn),
  }), [conn]);
  const isHttp = conn.transport === "http";

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("mcp.title")}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">{t("mcp.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{t("mcp.protocol", { version: PROTOCOL })}</Badge>
          <Button asChild variant="outline" size="sm">
            <a href={`${DOCS_URL}/api/mcp-server-reference/`} target="_blank" rel="noopener noreferrer">
              {t("mcp.reference")}<ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("mcp.connection")}</CardTitle>
          <CardDescription>{t("mcp.connectionHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={conn.transport} onValueChange={(v) => update({ transport: v as McpConnection["transport"] })}>
            <TabsList>
              <TabsTrigger value="http">{t("mcp.http")}</TabsTrigger>
              <TabsTrigger value="stdio">{t("mcp.stdio")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4 md:grid-cols-2">
            {isHttp ? (
              <div className="space-y-1.5">
                <Label htmlFor="mcp-url">{t("mcp.endpoint")}</Label>
                <Input id="mcp-url" value={conn.url} onChange={(e) => update({ url: e.target.value })} />
                <p className="text-xs text-muted-foreground">{t("mcp.endpointHint")}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="mcp-entry">{t("mcp.entrypoint")}</Label>
                <Input id="mcp-entry" value={conn.entrypoint} onChange={(e) => update({ entrypoint: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("mcp.actor")}</Label>
              <Select value={conn.actorId} onValueChange={(v) => update({ actorId: v })}>
                <SelectTrigger><SelectValue placeholder={t("mcp.noActor")} /></SelectTrigger>
                <SelectContent>
                  {actors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name}{a.is_machine ? ` · ${t("mcp.machine")}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("mcp.actorHint")}</p>
            </div>
            {isHttp ? (
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="mcp-bearer">{t("mcp.bearer")}</Label>
                <div className="flex gap-2">
                  <Input id="mcp-bearer" value={conn.bearer} onChange={(e) => update({ bearer: e.target.value })} className="font-mono" />
                  <Button variant="outline" onClick={() => update({ bearer: randomBearer() })}>
                    <RefreshCw className="mr-1.5 h-4 w-4" />{t("mcp.generate")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t("mcp.bearerHint")}</p>
              </div>
            ) : null}
          </div>

          <Snippet title={t("mcp.serverEnv")} code={snippets.env} />
          <Snippet title={t("mcp.claudeCode")} code={snippets.claude} />
          <Snippet title={t("mcp.mcpServers")} code={snippets.json} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />{t("mcp.activity")}</CardTitle>
            <CardDescription>{t("mcp.activityHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("mcp.activityEmpty")}</p>
            ) : (
              <ul className="divide-y text-sm">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="truncate"><Badge variant="outline" className="mr-2">{a.action}</Badge>{a.entity_name ?? a.entity_type ?? ""}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{format(new Date(a.created_at), "d MMM HH:mm")}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("mcp.security")}</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>{t("mcp.securityService")}</li>
              <li>{t("mcp.securityTenant")}</li>
              <li>{t("mcp.securityHttp")}</li>
              <li>{t("mcp.securityRules")}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
