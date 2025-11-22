/**
 * MCP Server Setup
 * Configures and initializes the MCP server with per-tenant authentication
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { env } from "./config/environment.js";
import { toolRegistry } from "./tools/index.js";
import { logger } from "./lib/logger.js";
import {
  extractApiKey,
  authenticateMcpRequest,
  checkToolPermission,
  setActiveTenant,
  logKeyUsage,
} from "./lib/authentication.js";

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

  // Handle tool execution with authentication
  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;
    const startTime = Date.now();

    logger.debug(`Tool call received: ${name}`, { args });

    try {
      // Extract and validate API key
      const apiKey = extractApiKey(request);

      if (!apiKey) {
        logger.error("No API key provided");
        return {
          content: [
            {
              type: "text",
              text: "Error: Missing MCP API key. Please include your key in the request:\n\n" +
                   "Example:\n" +
                   "{\n" +
                   '  "params": {\n' +
                   '    "name": "fetch_jobs",\n' +
                   '    "_meta": { "apiKey": "mcp_live_..." }\n' +
                   "  }\n" +
                   "}",
            },
          ],
          isError: true,
        } as any;
      }

      // Authenticate request
      const authContext = await authenticateMcpRequest(apiKey);
      logger.info(`Authenticated request for tenant: ${authContext.tenantId}`);

      // Set active tenant for RLS
      await setActiveTenant(authContext.tenantId);

      // Check tool permission
      if (!checkToolPermission(authContext, name)) {
        logger.warn(`Tool not allowed: ${name}`, {
          keyId: authContext.keyId,
          allowedTools: authContext.allowedTools,
        });

        // Log failed usage
        await logKeyUsage(authContext, {
          toolName: name,
          toolArguments: args,
          success: false,
          errorMessage: "Tool not allowed for this key",
          responseTimeMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text",
              text: `Error: Tool '${name}' is not allowed for this MCP key.\n\n` +
                   `Allowed tools: ${authContext.allowedTools.join(", ")}`,
            },
          ],
          isError: true,
        } as any;
      }

      // Get handler from registry
      const handler = toolRegistry.getHandler(name);

      if (!handler) {
        logger.error(`Unknown tool: ${name}`);

        // Log failed usage
        await logKeyUsage(authContext, {
          toolName: name,
          toolArguments: args,
          success: false,
          errorMessage: "Unknown tool",
          responseTimeMs: Date.now() - startTime,
        });

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

      // Calculate response time
      const responseTime = Date.now() - startTime;

      // Log successful usage
      await logKeyUsage(authContext, {
        toolName: name,
        toolArguments: args,
        success: !result.isError,
        errorMessage: result.isError ? "Tool execution failed" : undefined,
        responseTimeMs: responseTime,
      });

      logger.info(`Tool executed: ${name}`, {
        tenant: authContext.tenantId,
        success: !result.isError,
        responseTime: `${responseTime}ms`,
      });

      return result as any;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      logger.error(`Tool execution error: ${name}`, {
        error: error.message,
        stack: error.stack,
      });

      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      } as any;
    }
  });

  logger.info("MCP server configured successfully with per-tenant authentication");

  return server;
}
