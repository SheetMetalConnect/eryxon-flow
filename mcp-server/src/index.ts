#!/usr/bin/env node

/**
 * Eryxon Flow MCP Server v2.4.0
 *
 * Universal MCP server supporting both:
 * - DIRECT mode: Self-hosted with service key
 * - API mode: Cloud SaaS with tenant-scoped API keys
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
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfig, getModeDescription } from "./config.js";
import { createClient } from "./clients/index.js";
import { createConfiguredRegistry } from "./tools/index.js";

// Load configuration and detect mode
const config = loadConfig();
console.error(`🚀 Eryxon Flow MCP Server v2.4.0`);
console.error(`📡 Mode: ${getModeDescription(config.mode)}`);

// Create unified client (Supabase or REST API)
const client = createClient(config);

// Create and configure the tool registry with all modules
const toolRegistry = createConfiguredRegistry();

// Log startup info
const stats = toolRegistry.getStats();
console.error(`🔧 Loaded ${stats.totalTools} tools from ${stats.totalModules} modules`);

// Create MCP server instance
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

/**
 * Main entry point
 * Starts the server with stdio transport
 */
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ MCP Server ready on stdio");
}

// Start the server
main().catch((error) => {
  console.error("❌ Server error:", error);
  process.exit(1);
});
