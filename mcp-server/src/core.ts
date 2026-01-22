/**
 * MCP Server Core
 *
 * Shared server logic that can be used by both stdio and HTTP transports.
 * This module creates and configures the MCP server without binding to a transport.
 *
 * @version 3.0.0
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createConfiguredRegistry, ToolRegistry } from "./tools/index.js";

export const MCP_SERVER_VERSION = "3.0.0";
export const MCP_SERVER_NAME = "eryxon-flow-mcp";

export interface MCPServerOptions {
  supabase: SupabaseClient;
  onLog?: (message: string) => void;
}

export interface MCPServerInstance {
  server: Server;
  registry: ToolRegistry;
  stats: { totalTools: number; toolNames: string[] };
}

/**
 * Create and configure an MCP server instance
 * Does not bind to any transport - caller is responsible for that
 */
export function createMCPServer(options: MCPServerOptions): MCPServerInstance {
  const { supabase, onLog = console.error } = options;

  // Create and configure the tool registry with all modules
  const registry = createConfiguredRegistry();
  const stats = registry.getStats();

  onLog(`Eryxon Flow MCP Server v${MCP_SERVER_VERSION}`);
  onLog(`Loaded ${stats.totalTools} tools from 11 modules`);

  // Create MCP server instance
  const server = new Server(
    {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool listing requests
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: registry.getTools() };
  });

  // Handle tool execution requests
  server.setRequestHandler(
    CallToolRequestSchema,
    async (request): Promise<CallToolResult> => {
      const { name, arguments: args } = request.params;

      // Execute the tool through the registry
      const result = await registry.executeTool(
        name,
        (args as Record<string, unknown>) || {},
        supabase
      );

      return result as CallToolResult;
    }
  );

  return { server, registry, stats };
}

/**
 * Get server information for health checks and diagnostics
 */
export function getServerInfo(registry: ToolRegistry): {
  name: string;
  version: string;
  tools: { total: number; names: string[] };
  transport: string[];
} {
  const stats = registry.getStats();
  return {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    tools: {
      total: stats.totalTools,
      names: stats.toolNames,
    },
    transport: ["stdio", "http", "sse"],
  };
}
