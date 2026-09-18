export interface McpConnection {
  transport: "http" | "stdio";
  url: string;
  bearer: string;
  supabaseUrl: string;
  tenantId: string;
  actorId: string;
  entrypoint: string;
}

export const SERVICE_KEY_PLACEHOLDER = "<service-role key from the Supabase dashboard>";

export function randomBearer() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
}

function serverVars(c: McpConnection): Record<string, string> {
  return {
    SUPABASE_URL: c.supabaseUrl,
    SUPABASE_SERVICE_KEY: SERVICE_KEY_PLACEHOLDER,
    TENANT_ID: c.tenantId,
    ...(c.actorId ? { MCP_ACTOR_ID: c.actorId } : {}),
  };
}

export function serverEnv(c: McpConnection) {
  const vars = { ...serverVars(c), ...(c.transport === "http"
    ? { MCP_TRANSPORT: "http", MCP_BIND_PUBLIC: "true", MCP_BEARER: c.bearer || "<long random token>", MCP_ALLOWED_HOSTS: hostOf(c.url) }
    : {}) };
  return Object.entries(vars).map(([k, v]) => `${k}=${v}`).join("\n");
}

export function claudeCodeCommand(c: McpConnection) {
  if (c.transport === "http") {
    return `claude mcp add --transport http eryxon-flow ${c.url} --header "Authorization: Bearer ${c.bearer || "<MCP_BEARER>"}"`;
  }
  const env = Object.entries(serverVars(c)).map(([k, v]) => `--env ${k}=${v}`).join(" ");
  return `claude mcp add eryxon-flow ${env} -- node ${c.entrypoint}`;
}

export function mcpServersJson(c: McpConnection) {
  const server = c.transport === "http"
    ? { type: "http", url: c.url, headers: { Authorization: `Bearer ${c.bearer || "<MCP_BEARER>"}` } }
    : { command: "node", args: [c.entrypoint], env: serverVars(c) };
  return JSON.stringify({ mcpServers: { "eryxon-flow": server } }, null, 2);
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "localhost";
  }
}
