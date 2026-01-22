/**
 * MCP HTTP Transport Handler
 *
 * Handles HTTP requests for MCP protocol over Streamable HTTP transport.
 * Designed for serverless deployment (Vercel, AWS Lambda, etc.)
 *
 * Supports:
 * - POST /mcp - JSON-RPC requests with SSE responses
 * - GET /mcp - Server-Sent Events connection for streaming
 * - GET /mcp/health - Health check endpoint
 * - GET /mcp/info - Server information
 *
 * @version 3.0.0
 */

import { createClient } from "@supabase/supabase-js";
import { createMCPServer, getServerInfo, MCP_SERVER_VERSION } from "./core.js";
import { authenticateRequest, extractBearerToken } from "./auth.js";
import type { ToolResult } from "./types/index.js";

// Environment configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

// Use any for SupabaseClient to avoid complex type inference issues
type AnySupabaseClient = ReturnType<typeof createClient>;

// CORS headers for browser-based clients
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Request-ID, Accept",
  "Access-Control-Expose-Headers": "X-Request-ID",
};

export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface HTTPHandlerOptions {
  supabaseUrl?: string;
  supabaseServiceKey?: string;
  allowUnauthenticated?: boolean;
}

/**
 * Create a JSON-RPC error response
 */
function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): MCPResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message, data },
  };
}

/**
 * Create a JSON-RPC success response
 */
function createSuccessResponse(
  id: string | number,
  result: unknown
): MCPResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

/**
 * Handle MCP JSON-RPC request
 */
async function handleMCPRequest(
  request: MCPRequest,
  supabase: ReturnType<typeof createClient>
): Promise<MCPResponse> {
  const { server, registry } = createMCPServer({
    supabase,
    onLog: () => {}, // Suppress logs in HTTP mode
  });

  try {
    switch (request.method) {
      case "initialize": {
        return createSuccessResponse(request.id, {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "eryxon-flow-mcp",
            version: MCP_SERVER_VERSION,
          },
        });
      }

      case "tools/list": {
        const tools = registry.getTools();
        return createSuccessResponse(request.id, { tools });
      }

      case "tools/call": {
        const { name, arguments: args } =
          (request.params as {
            name: string;
            arguments?: Record<string, unknown>;
          }) || {};

        if (!name) {
          return createErrorResponse(
            request.id,
            -32602,
            "Invalid params: missing tool name"
          );
        }

        if (!registry.hasTool(name)) {
          return createErrorResponse(
            request.id,
            -32602,
            `Unknown tool: ${name}`
          );
        }

        const result = await registry.executeTool(name, args || {}, supabase);
        return createSuccessResponse(request.id, result);
      }

      case "ping": {
        return createSuccessResponse(request.id, {});
      }

      default: {
        return createErrorResponse(
          request.id,
          -32601,
          `Method not found: ${request.method}`
        );
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return createErrorResponse(request.id, -32603, message);
  }
}

/**
 * Vercel/Edge-compatible HTTP handler for MCP
 *
 * Usage:
 * ```typescript
 * // api/mcp.ts
 * import { handleHTTP } from 'eryxon-flow-mcp-server/http';
 * export default handleHTTP();
 * ```
 */
export function createHTTPHandler(options: HTTPHandlerOptions = {}) {
  const supabaseUrl = options.supabaseUrl || SUPABASE_URL;
  const supabaseServiceKey = options.supabaseServiceKey || SUPABASE_SERVICE_KEY;
  const allowUnauthenticated = options.allowUnauthenticated || false;

  // Fail fast if required config is missing
  if (!supabaseUrl) {
    throw new Error(
      "MCP Server misconfigured: SUPABASE_URL is required. " +
        "Set the environment variable or pass supabaseUrl in options."
    );
  }

  if (!supabaseServiceKey && !allowUnauthenticated) {
    throw new Error(
      "MCP Server misconfigured: SUPABASE_SERVICE_KEY is required. " +
        "Set the environment variable or pass supabaseServiceKey in options."
    );
  }

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Health check endpoint (no auth required)
    if (path.endsWith("/health") && req.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          version: MCP_SERVER_VERSION,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          },
        }
      );
    }

    // Server info endpoint (no auth required)
    if (path.endsWith("/info") && req.method === "GET") {
      // Create temporary supabase client just for info
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { registry } = createMCPServer({
        supabase,
        onLog: () => {},
      });

      return new Response(JSON.stringify(getServerInfo(registry)), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      });
    }

    // Authenticate for all other endpoints
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabase: any;

    if (allowUnauthenticated) {
      // Use service key directly (for testing or internal use)
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    } else {
      const authHeader = req.headers.get("authorization");
      const { context, error } = await authenticateRequest(
        authHeader,
        supabaseUrl,
        supabaseServiceKey
      );

      if (error || !context) {
        return new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: error || "Authentication failed",
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "WWW-Authenticate": 'Bearer realm="Eryxon Flow MCP"',
              ...CORS_HEADERS,
            },
          }
        );
      }

      supabase = context.supabase;
    }

    // Handle SSE connection for streaming (GET request)
    if (req.method === "GET") {
      const accept = req.headers.get("accept") || "";

      if (accept.includes("text/event-stream")) {
        // SSE endpoint for streaming responses
        const stream = new ReadableStream({
          start(controller) {
            // Send initial connection event
            controller.enqueue(
              `event: connected\ndata: ${JSON.stringify({ version: MCP_SERVER_VERSION })}\n\n`
            );

            // Keep connection alive with periodic pings
            const pingInterval = setInterval(() => {
              try {
                controller.enqueue(": ping\n\n");
              } catch {
                clearInterval(pingInterval);
              }
            }, 30000);

            // Clean up on close
            req.signal.addEventListener("abort", () => {
              clearInterval(pingInterval);
              controller.close();
            });
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            ...CORS_HEADERS,
          },
        });
      }

      // Regular GET without SSE - return method not allowed
      return new Response(
        JSON.stringify({
          error: "Method not allowed",
          message: "Use POST for JSON-RPC requests or GET with Accept: text/event-stream for SSE",
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          },
        }
      );
    }

    // Handle JSON-RPC POST request
    if (req.method === "POST") {
      let body: MCPRequest | MCPRequest[];

      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify(createErrorResponse(null, -32700, "Parse error")),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }

      // Handle batch requests
      if (Array.isArray(body)) {
        // Empty batch is invalid per JSON-RPC 2.0 spec
        if (body.length === 0) {
          return new Response(
            JSON.stringify(createErrorResponse(null, -32600, "Invalid Request")),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                ...CORS_HEADERS,
              },
            }
          );
        }

        const responses = await Promise.all(
          body.map((request) => handleMCPRequest(request, supabase))
        );

        return new Response(JSON.stringify(responses), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          },
        });
      }

      // Handle single request
      const response = await handleMCPRequest(body, supabase);

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      });
    }

    // Method not allowed
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
        message: "Supported methods: GET, POST, OPTIONS",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      }
    );
  };
}

/**
 * Default HTTP handler with environment-based configuration
 */
export const handleHTTP = createHTTPHandler();

/**
 * Export for Vercel serverless function
 */
export default handleHTTP;
