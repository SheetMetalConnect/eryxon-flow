#!/usr/bin/env node

/**
 * Eryxon Flow MCP Server v2.4.0
 *
 * Universal MCP server supporting both:
 * - DIRECT mode: Self-hosted with service key
 * - API mode: Cloud SaaS with tenant-scoped API keys
 *
 * Transport options (MCP_TRANSPORT env var):
 * - stdio (default): StdioServerTransport for local CLI usage
 * - http: StreamableHTTP transport for cloud/Docker deployment
 *
 * Architecture:
 * - clients/ - Unified client abstraction (Supabase or REST API)
 * - tools/ - Domain-specific tool modules (55 tools)
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

import { loadConfig, getModeDescription } from "./config.js";
import { createClient } from "./clients/index.js";
import { createConfiguredRegistry } from "./tools/index.js";

// Load configuration and detect mode
const config = loadConfig();
console.error(`Eryxon Flow MCP Server v2.4.0`);
console.error(`Mode: ${getModeDescription(config.mode)}`);

// Create unified client (Supabase or REST API)
const client = createClient(config);

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
      version: "2.4.0",
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
      // The client will handle the request appropriately based on mode
      const result = await toolRegistry.executeTool(
        name,
        (args as Record<string, unknown>) || {},
        client as any // Tools still expect SupabaseClient type, but UnifiedClient is compatible
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
  const host = process.env.MCP_HOST || "0.0.0.0";

  // Map to store transports by session ID
  const transports: Record<string, InstanceType<typeof StreamableHTTPServerTransport>> = {};

  const app = createMcpExpressApp({ host });

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      version: "2.4.0",
      mode: config.mode,
      tools: stats.totalTools,
      transport: "streamable-http",
    });
  });

  // MCP POST endpoint — handles initialization and tool calls
  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    try {
      let transport: InstanceType<typeof StreamableHTTPServerTransport>;

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport for established session
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request — create transport + server
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid: string) => {
            console.error(`Session initialized: ${sid}`);
            transports[sid] = transport;
          },
        });

        // Clean up on close
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            console.error(`Session closed: ${sid}`);
            delete transports[sid];
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
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  });

  // MCP DELETE endpoint — session termination
  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  });

  // Start listening
  app.listen(port, () => {
    console.error(`MCP Server ready on http://${host}:${port}/mcp`);
    console.error(`Health check: http://${host}:${port}/health`);
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.error("Shutting down...");
    for (const sessionId of Object.keys(transports)) {
      try {
        await transports[sessionId].close();
        delete transports[sessionId];
      } catch (error) {
        console.error(`Error closing session ${sessionId}:`, error);
      }
    }
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("SIGTERM received, shutting down...");
    for (const sessionId of Object.keys(transports)) {
      try {
        await transports[sessionId].close();
        delete transports[sessionId];
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
