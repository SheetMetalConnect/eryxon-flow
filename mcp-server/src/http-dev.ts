#!/usr/bin/env node

/**
 * Eryxon Flow MCP Server - HTTP Development Server
 *
 * Local development server for testing HTTP transport.
 * Uses Node.js built-in HTTP server (no external dependencies).
 *
 * Usage:
 *   npm run dev:http
 *   curl http://localhost:3001/mcp/health
 *
 * @version 3.0.0
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { createHTTPHandler } from "./http.js";

const PORT = process.env.MCP_PORT || 3001;

/**
 * Convert Node.js HTTP request to Web Request
 */
async function nodeToWebRequest(req: IncomingMessage): Promise<Request> {
  const protocol = "http";
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `${protocol}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }

  let body: string | null = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks).toString();
  }

  return new Request(url.toString(), {
    method: req.method || "GET",
    headers,
    body,
  });
}

/**
 * Write Web Response to Node.js HTTP response
 */
async function webToNodeResponse(
  webResponse: Response,
  nodeResponse: ServerResponse
): Promise<void> {
  nodeResponse.statusCode = webResponse.status;

  webResponse.headers.forEach((value, key) => {
    nodeResponse.setHeader(key, value);
  });

  const body = await webResponse.text();
  nodeResponse.end(body);
}

/**
 * Start the development server
 */
async function main(): Promise<void> {
  const handler = createHTTPHandler({
    allowUnauthenticated: process.env.MCP_ALLOW_UNAUTHENTICATED === "true",
  });

  const server = createServer(async (req, res) => {
    try {
      const webRequest = await nodeToWebRequest(req);
      const webResponse = await handler(webRequest);
      await webToNodeResponse(webResponse, res);
    } catch (error) {
      console.error("Request error:", error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });

  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║          Eryxon Flow MCP Server - HTTP Mode                  ║
╠══════════════════════════════════════════════════════════════╣
║  Version:    3.0.0                                           ║
║  Port:       ${String(PORT).padEnd(47)}║
║  Auth:       ${(process.env.MCP_ALLOW_UNAUTHENTICATED === "true" ? "Disabled (dev mode)" : "Required (Bearer token)").padEnd(47)}║
╠══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                  ║
║    GET  /mcp/health  - Health check                          ║
║    GET  /mcp/info    - Server info                           ║
║    POST /mcp         - JSON-RPC requests                     ║
║    GET  /mcp (SSE)   - Server-Sent Events stream             ║
╠══════════════════════════════════════════════════════════════╣
║  Test commands:                                              ║
║    curl http://localhost:${PORT}/mcp/health                       ║
║    curl http://localhost:${PORT}/mcp/info                         ║
╚══════════════════════════════════════════════════════════════╝
`);
  });
}

main().catch((error) => {
  console.error("Server startup error:", error);
  process.exit(1);
});
