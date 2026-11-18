import { corsHeaders } from "../cors.ts";
import {
  ApiErrorResponse,
  ApiSuccessResponse,
  ValidationResult,
} from "./types.ts";
import { RateLimitError, UnauthorizedError, ForbiddenError } from "../auth.ts";
import { getRateLimitHeaders } from "../rate-limiter.ts";

export { UnauthorizedError, ForbiddenError };

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
    public field?: string,
    public value?: unknown,
  ) {
    super(field ? `${resource} with ${field} "${value}" already exists` : resource);
    this.name = "ConflictError";
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

// Database errors → HTTP: production rules (22023) are 409 with the rule text,
// missing rows (P0002) 404, duplicates 409, constraint failures 400.
export function throwDatabaseError(error: { code?: string; message: string }): never {
  if (error.code === "42501") throw new ForbiddenError(error.message);
  if (error.code === "P0002") throw new NotFoundError(error.message);
  if (error.code === "22023") throw new ConflictError(error.message);
  if (error.code === "23505") throw new ConflictError("The record already exists");
  if (error.code === "23503" || error.code === "23514") throw new BadRequestError(error.message);
  throw new InternalServerError(error.message);
}

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

interface MappedError {
  code: string;
  message: string;
  status: number;
  details?: any;
  /** Extra response headers (e.g. rate-limit) to merge into the response. */
  headers?: Record<string, string>;
}

export function mapError(error: unknown): MappedError {
  if (error instanceof ValidationException) {
    return {
      code: "VALIDATION_ERROR",
      message: error.validationResult.summary,
      status: 422,
      details: error.validationResult.errors,
    };
  }
  if (error instanceof NotFoundError) {
    return { code: "NOT_FOUND", message: error.message, status: 404 };
  }
  if (error instanceof ConflictError) {
    return { code: "CONFLICT", message: error.message, status: 409 };
  }
  if (error instanceof UnauthorizedError) {
    return { code: "UNAUTHORIZED", message: error.message, status: 401 };
  }
  if (error instanceof ForbiddenError) {
    return { code: "FORBIDDEN", message: error.message, status: 403 };
  }
  if (error instanceof PaymentRequiredError) {
    return {
      code: "QUOTA_EXCEEDED",
      message: error.message,
      status: 402,
      details: {
        limitType: error.limitType,
        currentUsage: error.currentUsage,
        limit: error.limit,
      },
    };
  }
  if (error instanceof RateLimitError) {
    return {
      code: "RATE_LIMIT_EXCEEDED",
      message: error.message,
      status: 429,
      details: {
        remaining: error.rateLimitResult.remaining,
        resetAt: new Date(error.rateLimitResult.resetAt).toISOString(),
        retryAfter: error.rateLimitResult.retryAfter,
      },
      headers: getRateLimitHeaders(error.rateLimitResult),
    };
  }
  if (error instanceof BadRequestError) {
    return { code: "BAD_REQUEST", message: error.message, status: 400 };
  }
  if (error instanceof InternalServerError) {
    return { code: "INTERNAL_ERROR", message: error.message, status: 500 };
  }
  if (error instanceof Error) {
    return { code: "INTERNAL_ERROR", message: error.message, status: 500 };
  }
  return {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    status: 500,
  };
}

export function handleError(error: unknown, requestId?: string): Response {
  console.error("Error:", error);

  const mapped = mapError(error);

  const headers: Record<string, string> = {
    ...corsHeaders,
    ...(mapped.headers ?? {}),
    "Content-Type": "application/json",
  };
  if (requestId) {
    headers["x-request-id"] = requestId;
  }

  // Rate-limit responses carry richer error info for backward compatibility.
  if (error instanceof RateLimitError) {
    const body = {
      success: false,
      error: {
        code: mapped.code,
        message: mapped.message,
        statusCode: mapped.status,
        rateLimitInfo: mapped.details,
      },
    };
    return new Response(JSON.stringify(body), { status: mapped.status, headers });
  }

  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: mapped.code,
      message: mapped.message,
      statusCode: mapped.status,
    },
  };
  if (mapped.details) {
    body.error.details = mapped.details;
  }

  return new Response(JSON.stringify(body), { status: mapped.status, headers });
}

export function handleOptions(): Response {
  return new Response("ok", { headers: corsHeaders });
}

export function handleMethodNotAllowed(
  allowedMethods: string[],
): Response {
  return createErrorResponse(
    "METHOD_NOT_ALLOWED",
    `Method not allowed. Supported methods: ${allowedMethods.join(", ")}`,
    405,
  );
}
