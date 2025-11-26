#!/usr/bin/env node

/**
 * Eryxon Flow MCP Server
 *
 * A modular Model Context Protocol server that provides AI assistants
 * with tools to interact with the Eryxon Flow Manufacturing Execution System.
 *
 * Architecture:
 * - tools/ - Domain-specific tool modules (jobs, parts, operations, etc.)
 * - types/ - Shared TypeScript types
 * - utils/ - Utility functions (supabase client, response helpers)
 *
 * @version 2.0.0
 * @see https://github.com/SheetMetalConnect/eryxon-flow/tree/main/mcp-server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

import { createSupabaseClient, validateEnvironment } from "./utils/index.js";
import { createConfiguredRegistry } from "./tools/index.js";

// Validate environment before starting
validateEnvironment();

// Create Supabase client
const supabase = createSupabaseClient();

// Create and configure the tool registry with all modules
const toolRegistry = createConfiguredRegistry();

// Log startup info
const stats = toolRegistry.getStats();
console.error(`Eryxon Flow MCP Server v2.0.0`);
console.error(`Loaded ${stats.totalTools} tools from 7 modules`);

// Create MCP server instance
const server = new Server(
  {
    name: "eryxon-flow-mcp",
    version: "2.0.0",
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
 */
server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;

  // Execute the tool through the registry
  const result = await toolRegistry.executeTool(
    name,
    (args as Record<string, unknown>) || {},
    supabase
  );

  return result as CallToolResult;
});

/**
 * Main entry point
 * Starts the server with stdio transport
 */
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Eryxon Flow MCP Server running on stdio");
}

// Start the server
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
