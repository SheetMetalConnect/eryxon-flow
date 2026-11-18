import { describe, expect, it } from "vitest";
import { claudeCodeCommand, mcpServersJson, serverEnv, SERVICE_KEY_PLACEHOLDER, type McpConnection } from "./mcpConfig";

const base: McpConnection = {
  transport: "http", url: "https://mcp.example.com/mcp", bearer: "abc", supabaseUrl: "https://x.supabase.co",
  tenantId: "t-1", actorId: "p-1", entrypoint: "/srv/mcp/dist/index.js",
};

describe("mcpConfig", () => {
  it("never emits the service key and pins the workshop", () => {
    const env = serverEnv(base);
    expect(env).toContain(`SUPABASE_SERVICE_KEY=${SERVICE_KEY_PLACEHOLDER}`);
    expect(env).toContain("TENANT_ID=t-1");
    expect(env).toContain("MCP_ALLOWED_HOSTS=mcp.example.com");
    expect(env).toContain("MCP_BEARER=abc");
  });

  it("builds an http client config with the bearer header", () => {
    expect(JSON.parse(mcpServersJson(base)).mcpServers["eryxon-flow"]).toEqual({
      type: "http", url: base.url, headers: { Authorization: "Bearer abc" },
    });
    expect(claudeCodeCommand(base)).toBe('claude mcp add --transport http eryxon-flow https://mcp.example.com/mcp --header "Authorization: Bearer abc"');
  });

  it("builds a stdio config with the env block and no http vars", () => {
    const c = { ...base, transport: "stdio" as const };
    const server = JSON.parse(mcpServersJson(c)).mcpServers["eryxon-flow"];
    expect(server.command).toBe("node");
    expect(server.env.MCP_ACTOR_ID).toBe("p-1");
    expect(serverEnv(c)).not.toContain("MCP_TRANSPORT");
  });
});
