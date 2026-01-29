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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { authenticateAndSetContext, AuthResult } from "./auth.ts";
import { handleOptions, handleError } from "./validation/errorHandler.ts";
import { corsHeaders } from "./cors.ts";

/**
 * Context passed to handler functions
 */
export interface HandlerContext extends AuthResult {
  supabase: SupabaseClient;
  req: Request;
  url: URL;
  pathSegments: string[];
  lastSegment: string;
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY") ?? ""
    );

    try {
      // Parse URL info
      const url = new URL(req.url);
      const pathSegments = url.pathname.split("/").filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1] || "";

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

      // Build context
      const ctx: HandlerContext = {
        ...authResult,
        supabase,
        req,
        url,
        pathSegments,
        lastSegment,
      };

      // Execute handler
      const result = await handler(req, ctx);

      // If handler returns a Response, use it directly
      if (result instanceof Response) {
        return result;
      }

      // Otherwise, wrap result as JSON
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Convenience wrapper for serve() + createApiHandler()
 */
export function serveApi(
  handler: HandlerFn,
  options: HandlerOptions = {}
): void {
  serve(createApiHandler(handler, options));
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
