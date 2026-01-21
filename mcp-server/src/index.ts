#!/usr/bin/env node

/**
 * Eryxon Flow MCP Server - Stdio Transport
 *
 * Entry point for local/desktop usage via stdio transport.
 * For HTTP/serverless usage, see ./http.ts
 *
 * Usage:
 *   node dist/index.js
 *   npx eryxon-mcp
 *
 * @version 3.0.0
 * @see https://github.com/SheetMetalConnect/eryxon-flow/tree/main/mcp-server
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createSupabaseClient, validateEnvironment } from "./utils/index.js";
import { createMCPServer, MCP_SERVER_VERSION } from "./core.js";

/**
 * Main entry point for stdio transport
 */
async function main(): Promise<void> {
  // Validate environment before starting
  validateEnvironment();

  // Create Supabase client
  const supabase = createSupabaseClient();

  // Create MCP server with shared core
  const { server } = createMCPServer({
    supabase,
    onLog: console.error,
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`Eryxon Flow MCP Server v${MCP_SERVER_VERSION} running on stdio`);
}

// Start the server
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
