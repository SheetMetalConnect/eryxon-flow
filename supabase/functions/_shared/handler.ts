/**
 * API Handler Factory
 *
 * Eliminates boilerplate from API endpoints by wrapping common patterns:
 * - CORS preflight handling
 * - Supabase client initialization
 * - API key authentication + tenant context
 * - Standardized error handling
 *
 * Usage:
 * ```ts
 * import { createApiHandler } from "@shared/handler.ts";
 *
 * export default createApiHandler(async (req, ctx) => {
 *   const { supabase, tenantId } = ctx;
 *   // Your business logic here
 *   return { success: true, data: { ... } };
 * });
 * ```
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { authenticateAndSetContext, AuthResult } from "./auth.ts";
import { handleOptions, handleError, mapError } from "./validation/errorHandler.ts";
import { corsHeaders } from "./cors.ts";
import {
  REQUEST_ID_HEADER,
  RequestLogContext,
  edgeLog,
  persistPilotEvent,
  resolveRequestId,
  PilotLogLevel,
} from "./observability.ts";

/**
 * Context passed to handler functions
 */
export interface HandlerContext extends AuthResult {
  supabase: SupabaseClient;
  req: Request;
  url: URL;
  pathSegments: string[];
  lastSegment: string;
  /** Request-correlated observability context for this request. */
  requestId: string;
  log: RequestLogContext;
  /**
   * Record a pilot-critical lifecycle event into `activity_log` with the
   * shared `request_id`. Use for success-path events (e.g. issue.created)
   * that should appear in the pilot incident trace. Persistence is filtered
   * by {@link shouldPersistPilotEvent} and is best-effort (never throws).
   */
  recordPilotEvent: (input: {
    level?: PilotLogLevel;
    eventType: string;
    action: string;
    description?: string;
    entityType?: string;
    entityId?: string;
    entityName?: string;
    extra?: Record<string, unknown>;
  }) => Promise<void>;
}

/**
 * Handler function type
 * Return an object to send as JSON, or a Response for custom handling
 */
export type HandlerFn = (
  req: Request,
  ctx: HandlerContext
) => Promise<Response | object>;

/**
 * Options for handler creation
 */
export interface HandlerOptions {
  /** Allow unauthenticated access (default: false) */
  public?: boolean;
  /** Allowed HTTP methods (default: all) */
  methods?: string[];
}

/**
 * Create a standardized API handler with built-in auth, CORS, and error handling
 */
export function createApiHandler(
  handler: HandlerFn,
  options: HandlerOptions = {}
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1] || "";
    // Service = the edge function name (first path segment after functions/v1).
    const service = pathSegments[0] || "edge";
    const route = url.pathname;
    const start = Date.now();

    // Resolve request id at the edge boundary: trust valid inbound
    // `x-request-id`, otherwise mint one. Same id is logged and returned.
    const requestId = resolveRequestId(req.headers);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return handleOptions();
    }

    // Check allowed methods
    if (options.methods && !options.methods.includes(req.method)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "METHOD_NOT_ALLOWED",
            message: `Method ${req.method} not allowed. Allowed: ${options.methods.join(", ")}`,
          },
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            [REQUEST_ID_HEADER]: requestId,
          },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY") ?? ""
    );

    // Base request-correlation context, enriched after auth.
    const log: RequestLogContext = { requestId, service, route, method: req.method };

    try {
      let authResult: AuthResult = {
        tenantId: "",
        apiKeyId: "",
        keyPrefix: "",
        plan: "free",
      };

      // Authenticate unless public endpoint
      if (!options.public) {
        authResult = await authenticateAndSetContext(req, supabase);
      }

      log.tenantId = authResult.tenantId || undefined;

      // Build context
      const ctx: HandlerContext = {
        ...authResult,
        supabase,
        req,
        url,
        pathSegments,
        lastSegment,
        requestId,
        log,
        recordPilotEvent: (input) =>
          persistPilotEvent(supabase, {
            ctx: { ...log, eventType: input.eventType },
            level: input.level ?? "info",
            action: input.action,
            description: input.description,
            entityType: input.entityType,
            entityId: input.entityId,
            entityName: input.entityName,
            extra: input.extra,
          }).then(() => undefined),
      };

      // Execute handler
      const result = await handler(req, ctx);

      // If handler returns a Response, use it directly (preserve its headers,
      // add request id for correlation).
      if (result instanceof Response) {
        result.headers.set(REQUEST_ID_HEADER, requestId);
        edgeLog("info", "request.completed", {
          ...log,
          statusCode: result.status,
          durationMs: Date.now() - start,
        });
        return result;
      }

      // Otherwise, wrap result as JSON
      edgeLog("info", "request.completed", {
        ...log,
        statusCode: 200,
        durationMs: Date.now() - start,
      });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          [REQUEST_ID_HEADER]: requestId,
        },
      });
    } catch (error) {
      const mapped = mapError(error);
      const errorLog: RequestLogContext = {
        ...log,
        statusCode: mapped.status,
        errorCode: mapped.code,
        durationMs: Date.now() - start,
      };
      edgeLog("error", "request.failed", errorLog);

      // Persist the failure into activity_log with the shared request_id so
      // CTO can reconcile the edge log with a durable pilot incident row.
      await persistPilotEvent(supabase, {
        ctx: errorLog,
        level: "error",
        action: "edge.error",
        description: mapped.message,
      });

      return handleError(error, requestId);
    }
  };
}

/**
 * Start an API handler using Deno.serve.
 * Usage: export default serveApi(handler, options);
 */
export function serveApi(
  handler: HandlerFn,
  options: HandlerOptions = {}
): void {
  Deno.serve(createApiHandler(handler, options));
}

/**
 * Create a JSON response with proper headers
 */
export function jsonResponse(
  data: object,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T, status = 200): Response {
  return jsonResponse({ success: true, data }, status);
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  status = 400
): Response {
  return jsonResponse({ success: false, error: { code, message } }, status);
}
