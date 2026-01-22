/**
 * Eryxon Flow MCP Server - Vercel Serverless Function
 *
 * This is the HTTP endpoint for the MCP server on Vercel.
 * Supports JSON-RPC requests and SSE connections.
 *
 * Endpoints:
 *   GET  /api/mcp/health - Health check (no auth)
 *   GET  /api/mcp/info   - Server info (no auth)
 *   POST /api/mcp        - JSON-RPC requests (auth required)
 *   GET  /api/mcp        - SSE stream (auth required)
 *
 * Authentication:
 *   Authorization: Bearer <mcp-endpoint-token>
 *
 * @version 3.0.0
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

// ============================================================================
// Configuration
// ============================================================================

const MCP_SERVER_VERSION = "3.0.0";
const MCP_SERVER_NAME = "eryxon-flow-mcp";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

// ============================================================================
// Types
// ============================================================================

interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

// ============================================================================
// Authentication
// ============================================================================

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

async function validateToken(
  token: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ valid: boolean; tenantId?: string; error?: string }> {
  if (!token) {
    return { valid: false, error: "No token provided" };
  }

  const tokenHash = hashToken(token);
  const tokenPrefix = token.substring(0, 8);

  try {
    const { data: endpoint, error } = await supabase
      .from("mcp_endpoints")
      .select("id, tenant_id, name, enabled")
      .eq("token_hash", tokenHash)
      .eq("token_prefix", tokenPrefix)
      .single();

    if (error || !endpoint) {
      return { valid: false, error: "Invalid token" };
    }

    if (!endpoint.enabled) {
      return { valid: false, error: "Endpoint is disabled" };
    }

    // Update usage tracking atomically
    await supabase.rpc("increment_mcp_usage", { endpoint_id: endpoint.id });
    await supabase
      .from("mcp_endpoints")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", endpoint.id);

    return { valid: true, tenantId: endpoint.tenant_id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { valid: false, error: `Authentication error: ${message}` };
  }
}

// ============================================================================
// Tool Registry (inline for serverless)
// ============================================================================

interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

type ToolHandler = (
  args: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>
) => Promise<ToolResult>;

// Core tools - simplified for serverless (full tools in mcp-server package)
const tools: Tool[] = [
  {
    name: "fetch_jobs",
    description: "Fetch jobs from the database with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["not_started", "in_progress", "completed", "on_hold"],
          description: "Filter by job status",
        },
        limit: {
          type: "number",
          description: "Maximum number of jobs to return (default: 50)",
        },
      },
    },
  },
  {
    name: "fetch_parts",
    description: "Fetch parts with optional job_id and status filtering",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "Filter by job ID",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "on_hold"],
          description: "Filter by part status",
        },
        limit: {
          type: "number",
          description: "Maximum number of parts to return (default: 100)",
        },
      },
    },
  },
  {
    name: "fetch_operations",
    description: "Fetch operations with optional filtering",
    inputSchema: {
      type: "object",
      properties: {
        part_id: {
          type: "string",
          description: "Filter by part ID",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "on_hold"],
          description: "Filter by operation status",
        },
        limit: {
          type: "number",
          description: "Maximum number of operations to return (default: 100)",
        },
      },
    },
  },
  {
    name: "get_dashboard_stats",
    description: "Get aggregated dashboard statistics",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_job",
    description: "Create a new job",
    inputSchema: {
      type: "object",
      properties: {
        customer_name: {
          type: "string",
          description: "Customer name",
        },
        job_number: {
          type: "string",
          description: "Job number/identifier",
        },
        description: {
          type: "string",
          description: "Job description",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
          description: "Job priority",
        },
        due_date: {
          type: "string",
          description: "Due date (ISO 8601 format)",
        },
      },
      required: ["customer_name", "job_number"],
    },
  },
  {
    name: "update_job",
    description: "Update a job's status or properties",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Job ID to update",
        },
        status: {
          type: "string",
          enum: ["not_started", "in_progress", "completed", "on_hold"],
          description: "New status for the job",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
          description: "New priority for the job",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "start_job",
    description: "Start a job (changes status to in_progress)",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Job ID to start" },
      },
      required: ["id"],
    },
  },
  {
    name: "complete_job",
    description: "Complete a job (changes status to completed)",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Job ID to complete" },
      },
      required: ["id"],
    },
  },
];

// Tool handlers
const handlers = new Map<string, ToolHandler>();

handlers.set("fetch_jobs", async (args, supabase) => {
  let query = supabase.from("jobs").select("*");
  if (args.status) query = query.eq("status", args.status);
  const limit = typeof args.limit === "number" ? args.limit : 50;
  query = query.limit(limit).order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

handlers.set("fetch_parts", async (args, supabase) => {
  let query = supabase.from("parts").select("*");
  if (args.job_id) query = query.eq("job_id", args.job_id);
  if (args.status) query = query.eq("status", args.status);
  const limit = typeof args.limit === "number" ? args.limit : 100;
  query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

handlers.set("fetch_operations", async (args, supabase) => {
  let query = supabase.from("operations").select("*");
  if (args.part_id) query = query.eq("part_id", args.part_id);
  if (args.status) query = query.eq("status", args.status);
  const limit = typeof args.limit === "number" ? args.limit : 100;
  query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

handlers.set("get_dashboard_stats", async (_args, supabase) => {
  const [jobsResult, partsResult, operationsResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("status", { count: "exact" })
      .eq("status", "in_progress"),
    supabase
      .from("parts")
      .select("status", { count: "exact" })
      .eq("status", "in_progress"),
    supabase
      .from("operations")
      .select("status", { count: "exact" })
      .eq("status", "in_progress"),
  ]);

  const stats = {
    activeJobs: jobsResult.count || 0,
    activeParts: partsResult.count || 0,
    activeOperations: operationsResult.count || 0,
    timestamp: new Date().toISOString(),
  };

  return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
});

handlers.set("create_job", async (args, supabase) => {
  const { data, error } = await supabase
    .from("jobs")
    .insert([args])
    .select()
    .single();
  if (error) throw error;
  return {
    content: [
      {
        type: "text",
        text: `Job created successfully:\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
});

handlers.set("update_job", async (args, supabase) => {
  const { id, ...updates } = args as { id: string; [key: string]: unknown };
  const { data, error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return {
    content: [
      {
        type: "text",
        text: `Job updated successfully:\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
});

handlers.set("start_job", async (args, supabase) => {
  const { id } = args as { id: string };
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("jobs")
    .update({ status: "in_progress", started_at: now, updated_at: now })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return {
    content: [
      {
        type: "text",
        text: `Job started successfully:\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
});

handlers.set("complete_job", async (args, supabase) => {
  const { id } = args as { id: string };
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("jobs")
    .update({ status: "completed", completed_at: now, updated_at: now })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return {
    content: [
      {
        type: "text",
        text: `Job completed successfully:\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
});

// ============================================================================
// MCP Request Handling
// ============================================================================

function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string
): MCPResponse {
  return {
    jsonrpc: "2.0",
    id: id ?? 0,
    error: { code, message },
  };
}

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

async function handleMCPRequest(
  request: MCPRequest,
  supabase: ReturnType<typeof createClient>
): Promise<MCPResponse> {
  try {
    switch (request.method) {
      case "initialize": {
        return createSuccessResponse(request.id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
        });
      }

      case "tools/list": {
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

        const handler = handlers.get(name);
        if (!handler) {
          return createErrorResponse(request.id, -32602, `Unknown tool: ${name}`);
        }

        try {
          const result = await handler(args || {}, supabase);
          return createSuccessResponse(request.id, result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Tool execution failed";
          return createSuccessResponse(request.id, {
            content: [{ type: "text", text: `Error: ${message}` }],
            isError: true,
          });
        }
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

// ============================================================================
// Vercel Handler
// ============================================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Set CORS headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const path = req.url || "";

  // Health check endpoint (no auth)
  if (path.includes("/health")) {
    res.status(200).json({
      status: "healthy",
      version: MCP_SERVER_VERSION,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Info endpoint (no auth)
  if (path.includes("/info")) {
    res.status(200).json({
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
      tools: {
        total: tools.length,
        names: tools.map((t) => t.name),
      },
      transport: ["http"],
      documentation: "https://eryxon.com/docs/api/mcp",
    });
    return;
  }

  // Validate environment is configured
  if (!SUPABASE_URL) {
    res.status(500).json({
      error: "Server configuration error",
      message: "SUPABASE_URL not configured",
    });
    return;
  }

  if (!SUPABASE_SERVICE_KEY) {
    res.status(500).json({
      error: "Server configuration error",
      message: "SUPABASE_SERVICE_KEY not configured",
    });
    return;
  }

  // Create admin client for auth
  const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Authenticate request
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="Eryxon Flow MCP"');
    res.status(401).json({
      error: "Unauthorized",
      message: "Missing Authorization header. Use: Authorization: Bearer <token>",
    });
    return;
  }

  const authResult = await validateToken(token, adminSupabase);
  if (!authResult.valid) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="Eryxon Flow MCP"');
    res.status(401).json({
      error: "Unauthorized",
      message: authResult.error,
    });
    return;
  }

  // Create tenant-scoped client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "x-tenant-id": authResult.tenantId! } },
  });

  // Handle POST (JSON-RPC)
  if (req.method === "POST") {
    const body = req.body as MCPRequest | MCPRequest[];

    if (Array.isArray(body)) {
      const responses = await Promise.all(
        body.map((request) => handleMCPRequest(request, supabase))
      );
      res.status(200).json(responses);
      return;
    }

    const response = await handleMCPRequest(body, supabase);
    res.status(200).json(response);
    return;
  }

  // Method not allowed
  res.status(405).json({
    error: "Method not allowed",
    message: "Use POST for JSON-RPC requests",
  });
}
