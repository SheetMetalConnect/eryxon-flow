#!/usr/bin/env node
import { createServer } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { hostHeaderValidation, toNodeHandler } from "@modelcontextprotocol/node";
import { connect } from "./supabase.js";
import { buildServer, PROTOCOL_VERSION, VERSION } from "./server.js";
import { allTools } from "./tools/index.js";

if (process.argv.includes("--version")) {
  console.log(`eryxon-flow-mcp ${VERSION} (MCP ${PROTOCOL_VERSION})`);
  process.exit(0);
}

const supabase = connect();
const factory = () => buildServer(supabase);
const transport = process.env.MCP_TRANSPORT ?? "stdio";

if (transport === "stdio") {
  const handle = serveStdio(factory, { legacy: "reject" });
  console.error(`Eryxon Flow MCP ${VERSION} (${PROTOCOL_VERSION}) on stdio, ${allTools.length} tools`);
  process.on("SIGINT", () => void handle.close().then(() => process.exit(0)));
} else if (transport === "http") {
  const port = Number(process.env.MCP_PORT ?? 3001);
  const bindPublic = process.env.MCP_BIND_PUBLIC === "true";
  const requestedHost = process.env.MCP_HOST ?? "127.0.0.1";
  const host = !bindPublic && (requestedHost === "0.0.0.0" || requestedHost === "::") ? "127.0.0.1" : requestedHost;
  const bearer = process.env.MCP_BEARER;
  if (bindPublic && !bearer) {
    console.error("MCP_BEARER is required when MCP_BIND_PUBLIC=true");
    process.exit(1);
  }
  const allowedHosts = (process.env.MCP_ALLOWED_HOSTS ?? "localhost,127.0.0.1,[::1]").split(",").map((v) => v.trim()).filter(Boolean);
  const validHost = hostHeaderValidation(allowedHosts);
  const mcp = toNodeHandler(createMcpHandler(factory, { legacy: "reject" }));

  const http = createServer(async (req, res) => {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    if (path === "/health") {
      const { error } = await supabase.from("jobs").select("id", { count: "exact", head: true }).limit(1);
      res.writeHead(error ? 503 : 200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: error ? "degraded" : "ok", version: VERSION, protocol: PROTOCOL_VERSION, tools: allTools.length, ...(error ? { database: error.message } : {}) }));
      return;
    }
    if (path !== "/mcp") {
      res.writeHead(404).end();
      return;
    }
    if (!validHost(req, res)) return;
    if (bearer && req.headers.authorization !== `Bearer ${bearer}`) {
      res.writeHead(401, { "www-authenticate": "Bearer", "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null }));
      return;
    }
    await mcp(req, res);
  });
  http.listen(port, host, () => console.error(`Eryxon Flow MCP ${VERSION} (${PROTOCOL_VERSION}) on http://${host}:${port}/mcp, ${allTools.length} tools`));
  const shutdown = () => http.close(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} else {
  console.error(`Unknown MCP_TRANSPORT "${transport}"; use stdio or http`);
  process.exit(1);
}
