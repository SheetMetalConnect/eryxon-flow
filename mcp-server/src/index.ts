#!/usr/bin/env node

/**
 * Eryxon Flow MCP Server v2.4.1
 *
 * MCP server for self-hosted deployments using direct Supabase access.
 *
 * Transport options (MCP_TRANSPORT env var):
 * - stdio (default): StdioServerTransport for local CLI usage
 * - http: StreamableHTTP transport for cloud/Docker deployment
 *
 * Architecture:
 * - clients/ - Direct Supabase client abstraction
 * - tools/ - Domain-specific tool modules (50 tools)
 * - config.ts - Auto-detects deployment mode
 *
 * @see https://github.com/SheetMetalConnect/eryxon-flow/tree/main/mcp-server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  isInitializeRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { Request, Response } from "express";

import { loadConfig, getModeDescription } from "./config.js";
import { createClient, DirectSupabaseClient } from "./clients/index.js";
import { createConfiguredRegistry } from "./tools/index.js";

// Load configuration and detect mode
const config = loadConfig();
console.error(`Eryxon Flow MCP Server v2.4.1`);
console.error(`Mode: ${getModeDescription(config.mode)}`);

// Create direct Supabase client and extract the raw SupabaseClient
// Tool handlers call supabase.from() directly, so they need the raw client,
// not the UnifiedClient wrapper which only exposes .select()/.insert()/etc.
const unifiedClient = createClient(config);
const supabaseClient = (unifiedClient as DirectSupabaseClient).getSupabaseClient();

// Create and configure the tool registry with all modules
const toolRegistry = createConfiguredRegistry();

// Log startup info
const stats = toolRegistry.getStats();
console.error(`Loaded ${stats.totalTools} tools`);

/**
 * Create a configured MCP Server instance with all tool handlers registered
 */
function createMCPServer(): Server {
  const server = new Server(
    {
      name: "eryxon-flow-mcp",
      version: "2.4.1",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  /**
   * Handle tool listing requests
   * Returns all registered tools from all modules
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: toolRegistry.getTools() };
  });

  /**
   * Handle tool execution requests
   * Routes to the appropriate module handler
   *
   * NOTE: Tools receive the unified client, which automatically
   * uses either Supabase (direct) or REST API (cloud) based on config
   */
  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;

    try {
      // Execute the tool through the registry
      // Pass the raw SupabaseClient — tools call .from() directly
      const result = await toolRegistry.executeTool(
        name,
        (args as Record<string, unknown>) || {},
        supabaseClient
      );

      return result as CallToolResult;
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
      };
    }
  });

  return server;
}

/**
 * Start with stdio transport (default, for local CLI usage)
 */
async function startStdio(): Promise<void> {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server ready on stdio");
}

/**
 * Start with Streamable HTTP transport (for Docker/cloud deployment)
 *
 * Uses the MCP SDK's StreamableHTTPServerTransport with session management.
 * Supports SSE streaming for real-time tool responses.
 */
async function startHttp(): Promise<void> {
  const { randomUUID } = await import("node:crypto");
  const { StreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/streamableHttp.js"
  );
  const { createMcpExpressApp } = await import(
    "@modelcontextprotocol/sdk/server/express.js"
  );

  const port = parseInt(process.env.MCP_PORT || "3001", 10);
  const bindPublic = process.env.MCP_BIND_PUBLIC === "true";
  const requestedHost = process.env.MCP_HOST || "127.0.0.1";
  const requestedPublicBind = requestedHost === "0.0.0.0" || requestedHost === "::";
  const host = requestedPublicBind && !bindPublic ? "127.0.0.1" : requestedHost;

  if (requestedPublicBind && !bindPublic) {
    console.error(
      "MCP_HOST requested a public bind, but MCP_BIND_PUBLIC is not true; falling back to 127.0.0.1"
    );
  }

  // Map to store transports by session ID
  const transports = new Map<string, InstanceType<typeof StreamableHTTPServerTransport>>();

  const allowedHosts = (process.env.MCP_ALLOWED_HOSTS || "localhost,127.0.0.1,[::1]")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const bearerToken = process.env.MCP_BEARER;

  const app = createMcpExpressApp({ host, allowedHosts });

  const authorizeMcpRequest = (req: Request, res: Response): boolean => {
    if (bindPublic && !bearerToken) {
      res.status(503).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "MCP_BEARER is required when MCP_BIND_PUBLIC=true",
        },
        id: null,
      });
      return false;
    }

    if (!bearerToken) {
      return true;
    }

    if (req.headers.authorization !== `Bearer ${bearerToken}`) {
      res.setHeader("WWW-Authenticate", "Bearer");
      res.status(401).json({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Unauthorized",
        },
        id: null,
      });
      return false;
    }

    return true;
  };

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      version: "2.4.1",
      mode: config.mode,
      tools: stats.totalTools,
      transport: "streamable-http",
    });
  });

  // MCP POST endpoint — handles initialization and tool calls
  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    try {
      if (!authorizeMcpRequest(req, res)) {
        return;
      }

      let transport: InstanceType<typeof StreamableHTTPServerTransport>;

      if (sessionId && transports.has(sessionId)) {
        // Reuse existing transport for established session
        transport = transports.get(sessionId)!;
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request — create transport + server
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid: string) => {
            console.error(`Session initialized: ${sid}`);
            transports.set(sid, transport);
          },
        });

        // Clean up on close
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports.has(sid)) {
            console.error(`Session closed: ${sid}`);
            transports.delete(sid);
          }
        };

        // Each session gets its own MCP server instance
        const server = createMCPServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        // Invalid request
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  // MCP GET endpoint — SSE stream for server-initiated messages
  app.get("/mcp", async (req, res) => {
    try {
      if (!authorizeMcpRequest(req, res)) {
        return;
      }

      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      const transport = sessionId ? transports.get(sessionId) : undefined;
      if (!transport) {
        res.status(400).send("Invalid or missing session ID");
        return;
      }

      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling MCP stream:", error);
      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      }
    }
  });

  // MCP DELETE endpoint — session termination
  app.delete("/mcp", async (req, res) => {
    try {
      if (!authorizeMcpRequest(req, res)) {
        return;
      }

      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      const transport = sessionId ? transports.get(sessionId) : undefined;
      if (!transport) {
        res.status(400).send("Invalid or missing session ID");
        return;
      }

      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error terminating MCP session:", error);
      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      }
    }
  });

  // Start listening
  app.listen(port, () => {
    console.error(`MCP Server ready on http://${host}:${port}/mcp`);
    console.error(`Health check: http://${host}:${port}/health`);
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.error("Shutting down...");
    for (const [sessionId, transport] of transports) {
      try {
        await transport.close();
        transports.delete(sessionId);
      } catch (error) {
        console.error(`Error closing session ${sessionId}:`, error);
      }
    }
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("SIGTERM received, shutting down...");
    for (const [sessionId, transport] of transports) {
      try {
        await transport.close();
        transports.delete(sessionId);
      } catch (error) {
        console.error(`Error closing session ${sessionId}:`, error);
      }
    }
    process.exit(0);
  });
}

/**
 * Main entry point — select transport based on MCP_TRANSPORT env var
 */
async function main(): Promise<void> {
  const transportMode = process.env.MCP_TRANSPORT || "stdio";

  switch (transportMode) {
    case "stdio":
      await startStdio();
      break;
    case "http":
      await startHttp();
      break;
    default:
      console.error(`Unknown transport: ${transportMode}. Use "stdio" or "http".`);
      process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
