/**
 * Centralized Error Handling Utilities
 *
 * This module provides:
 * 1. Custom error types for different error categories
 * 2. Error code constants for consistent error identification
 * 3. Utilities for safe error message extraction
 * 4. Error context enrichment helpers
 */

/**
 * Error codes for consistent error identification across the application
 */
export const ErrorCode = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',

  // Data operation errors
  CREATE_FAILED: 'CREATE_FAILED',
  UPDATE_FAILED: 'UPDATE_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
  FETCH_FAILED: 'FETCH_FAILED',

  // Storage errors
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // General
  UNKNOWN: 'UNKNOWN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Application-specific error class with context support
 */
export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly context?: Record<string, unknown>;
  public readonly originalError?: unknown;
  public readonly httpStatus?: number;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.UNKNOWN,
    options?: {
      context?: Record<string, unknown>;
      originalError?: unknown;
      httpStatus?: number;
      isRetryable?: boolean;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = options?.context;
    this.originalError = options?.originalError;
    this.httpStatus = options?.httpStatus;
    this.isRetryable = options?.isRetryable ?? false;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Create a user-friendly error message
   */
  toUserMessage(): string {
    switch (this.code) {
      case ErrorCode.UNAUTHORIZED:
        return 'You need to sign in to perform this action.';
      case ErrorCode.FORBIDDEN:
        return 'You do not have permission to perform this action.';
      case ErrorCode.NOT_FOUND:
        return 'The requested resource was not found.';
      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.INVALID_INPUT:
        return this.message || 'Please check your input and try again.';
      case ErrorCode.QUOTA_EXCEEDED:
        return 'Storage quota exceeded. Please upgrade your plan or free up space.';
      case ErrorCode.RATE_LIMITED:
      case ErrorCode.TOO_MANY_REQUESTS:
        return 'Too many requests. Please wait a moment and try again.';
      case ErrorCode.NETWORK_ERROR:
        return 'Network error. Please check your connection and try again.';
      case ErrorCode.TIMEOUT:
        return 'The operation timed out. Please try again.';
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 'The service is temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unknown error occurred';
}

/**
 * Safely extract error code from Supabase errors
 */
export function getSupabaseErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    if ('code' in error) {
      return String((error as { code: unknown }).code);
    }
  }
  return undefined;
}

/**
 * Check if an error is a Supabase PGRST (PostgREST) error
 */
export function isSupabaseError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    return 'code' in error && 'message' in error;
  }
  return false;
}

/**
 * Convert Supabase error to AppError with appropriate code
 */
export function fromSupabaseError(
  error: unknown,
  context?: Record<string, unknown>
): AppError {
  const message = getErrorMessage(error);
  const supabaseCode = getSupabaseErrorCode(error);

  // Map common Supabase error codes to our error codes
  let code: ErrorCodeType = ErrorCode.UNKNOWN;
  let httpStatus: number | undefined;
  let isRetryable = false;

  if (supabaseCode) {
    switch (supabaseCode) {
      case 'PGRST301':
      case '42501': // RLS policy violation
        code = ErrorCode.FORBIDDEN;
        httpStatus = 403;
        break;
      case 'PGRST116': // No rows found
        code = ErrorCode.NOT_FOUND;
        httpStatus = 404;
        break;
      case '23505': // Unique constraint violation
        code = ErrorCode.ALREADY_EXISTS;
        httpStatus = 409;
        break;
      case '23503': // Foreign key constraint violation
        code = ErrorCode.VALIDATION_ERROR;
        httpStatus = 422;
        break;
      case '22P02': // Invalid input syntax
      case '23502': // Not null constraint violation
        code = ErrorCode.INVALID_INPUT;
        httpStatus = 400;
        break;
      case 'PGRST204': // No content
        code = ErrorCode.NOT_FOUND;
        httpStatus = 204;
        break;
      default:
        if (supabaseCode.startsWith('PGRST')) {
          code = ErrorCode.INTERNAL_ERROR;
          httpStatus = 500;
        }
    }
  }

  // Check for network/timeout errors
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
    code = ErrorCode.NETWORK_ERROR;
    isRetryable = true;
  }
  if (message.toLowerCase().includes('timeout')) {
    code = ErrorCode.TIMEOUT;
    isRetryable = true;
  }

  return new AppError(message, code, {
    context: { ...context, supabaseCode },
    originalError: error,
    httpStatus,
    isRetryable,
  });
}

/**
 * Create an error handler function with context
 */
export function createErrorHandler(operation: string, context?: Record<string, unknown>) {
  return (error: unknown): never => {
    const appError = error instanceof AppError
      ? error
      : fromSupabaseError(error, { operation, ...context });

    throw appError;
  };
}

/**
 * Wrap an async function with error handling
 */
export async function withErrorHandling<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw error instanceof AppError
      ? error
      : fromSupabaseError(error, { operation, ...context });
  }
}

/**
 * Type guard to check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isRetryable;
  }
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('temporarily unavailable')
  );
}

/**
 * Result type for operations that can fail
 * Use this instead of throwing errors for expected failure cases
 */
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a success result
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create a failure result
 */
export function err<E = AppError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Wrap a promise in a Result type (never throws)
 */
export async function tryCatch<T>(
  promise: Promise<T>,
  context?: { operation?: string }
): Promise<Result<T>> {
  try {
    const data = await promise;
    return ok(data);
  } catch (error) {
    const appError = error instanceof AppError
      ? error
      : fromSupabaseError(error, context);
    return err(appError);
  }
}
