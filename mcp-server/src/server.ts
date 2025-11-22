/**
 * MCP Server Setup
 * Configures and initializes the MCP server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { env } from "./config/environment.js";
import { toolRegistry } from "./tools/index.js";
import { logger } from "./lib/logger.js";

/**
 * Create and configure MCP server
 */
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: env.server.name,
      version: env.server.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = toolRegistry.getAllDefinitions();
    logger.debug(`Listing ${tools.length} tools`);
    return { tools };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;

    logger.debug(`Tool call received: ${name}`, { args });

    // Get handler from registry
    const handler = toolRegistry.getHandler(name);

    if (!handler) {
      logger.error(`Unknown tool: ${name}`);
      return {
        content: [
          {
            type: "text",
            text: `Error: Unknown tool '${name}'`,
          },
        ],
        isError: true,
      } as any;
    }

    // Execute handler (error handling is built into the handler via withErrorHandling)
    const result = await handler(args);
    return result as any;
  });

  logger.info("MCP server configured successfully");

  return server;
}
