/**
 * Standardized Error Handler for Edge Functions
 */

import { corsHeaders } from "../cors.ts";
import {
  ApiErrorResponse,
  ApiSuccessResponse,
  ValidationResult,
} from "./types.ts";
import { RateLimitError } from "../auth.ts";
import { getRateLimitHeaders } from "../rate-limiter.ts";

/**
 * Custom error classes
 */
export class ValidationException extends Error {
  constructor(
    public validationResult: ValidationResult,
  ) {
    super(validationResult.summary);
    this.name = "ValidationException";
  }
}

export class NotFoundError extends Error {
  constructor(
    public resource: string,
    public id?: string,
  ) {
    super(id ? `${resource} with ID ${id} not found` : `${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(
    public resource: string,
    public field: string,
    public value: any,
  ) {
    super(`${resource} with ${field} "${value}" already exists`);
    this.name = "ConflictError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Invalid or missing API key") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Access denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class PaymentRequiredError extends Error {
  constructor(
    public limitType: string,
    public currentUsage: number,
    public limit: number,
  ) {
    super(`${limitType} limit exceeded (${currentUsage}/${limit})`);
    this.name = "PaymentRequiredError";
  }
}

export class BadRequestError extends Error {
  constructor(message: string = "Malformed request") {
    super(message);
    this.name = "BadRequestError";
  }
}

export class InternalServerError extends Error {
  constructor(message: string = "An unexpected error occurred") {
    super(message);
    this.name = "InternalServerError";
  }
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  meta?: any,
): Response {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    body.meta = meta;
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: any,
): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      statusCode: status,
    },
  };

  if (details) {
    body.error.details = details;
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Main error handler - converts errors to standardized responses
 */
export function handleError(error: unknown): Response {
  console.error("Error:", error);

  // Validation errors (422)
  if (error instanceof ValidationException) {
    return createErrorResponse(
      "VALIDATION_ERROR",
      error.validationResult.summary,
      422,
      error.validationResult.errors,
    );
  }

  // Not found errors (404)
  if (error instanceof NotFoundError) {
    return createErrorResponse(
      "NOT_FOUND",
      error.message,
      404,
    );
  }

  // Conflict errors (409)
  if (error instanceof ConflictError) {
    return createErrorResponse(
      "CONFLICT",
      error.message,
      409,
    );
  }

  // Unauthorized errors (401)
  if (error instanceof UnauthorizedError) {
    return createErrorResponse(
      "UNAUTHORIZED",
      error.message,
      401,
    );
  }

  // Forbidden errors (403)
  if (error instanceof ForbiddenError) {
    return createErrorResponse(
      "FORBIDDEN",
      error.message,
      403,
    );
  }

  // Payment required errors (402)
  if (error instanceof PaymentRequiredError) {
    return createErrorResponse(
      "QUOTA_EXCEEDED",
      error.message,
      402,
      {
        limitType: error.limitType,
        currentUsage: error.currentUsage,
        limit: error.limit,
      },
    );
  }

  // Rate limit errors (429)
  if (error instanceof RateLimitError) {
    const rateLimitHeaders = getRateLimitHeaders(error.rateLimitResult);
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: error.message,
        statusCode: 429,
        details: {
          remaining: error.rateLimitResult.remaining,
          resetAt: new Date(error.rateLimitResult.resetAt).toISOString(),
          retryAfter: error.rateLimitResult.retryAfter,
        },
      },
    };

    return new Response(JSON.stringify(body), {
      status: 429,
      headers: {
        ...corsHeaders,
        ...rateLimitHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  // Bad request errors (400)
  if (error instanceof BadRequestError) {
    return createErrorResponse(
      "BAD_REQUEST",
      error.message,
      400,
    );
  }

  // Internal server errors (500)
  if (error instanceof InternalServerError) {
    return createErrorResponse(
      "INTERNAL_ERROR",
      error.message,
      500,
    );
  }

  // Generic errors (500)
  if (error instanceof Error) {
    return createErrorResponse(
      "INTERNAL_ERROR",
      error.message,
      500,
    );
  }

  // Unknown errors (500)
  return createErrorResponse(
    "INTERNAL_ERROR",
    "An unexpected error occurred",
    500,
  );
}

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function handleOptions(): Response {
  return new Response("ok", { headers: corsHeaders });
}

/**
 * Handle unsupported HTTP methods
 */
export function handleMethodNotAllowed(
  allowedMethods: string[],
): Response {
  return createErrorResponse(
    "METHOD_NOT_ALLOWED",
    `Method not allowed. Supported methods: ${allowedMethods.join(", ")}`,
    405,
  );
}
