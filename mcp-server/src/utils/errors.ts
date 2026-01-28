/**
 * Structured error types for better error handling
 */

export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Database errors
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  DATABASE_ERROR = 'DATABASE_ERROR',
  QUERY_TIMEOUT = 'QUERY_TIMEOUT',

  // Business logic errors
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  OPERATION_FAILED = 'OPERATION_FAILED',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT = 'TIMEOUT',
}

export interface StructuredError {
  code: ErrorCode;
  message: string;
  context?: Record<string, any>;
  severity: 'error' | 'warning' | 'info';
  timestamp: string;
  originalError?: Error;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, any>;
  public readonly severity: 'error' | 'warning' | 'info';
  public readonly timestamp: string;
  public readonly originalError?: Error;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      context?: Record<string, any>;
      severity?: 'error' | 'warning' | 'info';
      originalError?: Error;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = options?.context;
    this.severity = options?.severity || 'error';
    this.timestamp = new Date().toISOString();
    this.originalError = options?.originalError;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON(): StructuredError {
    return {
      code: this.code,
      message: this.message,
      context: this.context,
      severity: this.severity,
      timestamp: this.timestamp,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
      } as any : undefined,
    };
  }
}

/**
 * Create a validation error
 */
export function validationError(message: string, context?: Record<string, any>): AppError {
  return new AppError(ErrorCode.VALIDATION_ERROR, message, { context });
}

/**
 * Create a not found error
 */
export function notFoundError(resource: string, id?: string): AppError {
  return new AppError(
    ErrorCode.NOT_FOUND,
    `${resource} not found${id ? `: ${id}` : ''}`,
    { context: { resource, id } }
  );
}

/**
 * Create a database error
 */
export function databaseError(message: string, originalError?: Error): AppError {
  return new AppError(ErrorCode.DATABASE_ERROR, message, {
    originalError,
    context: { type: 'database' },
  });
}

/**
 * Create an invalid state transition error
 */
export function invalidStateTransition(
  resource: string,
  currentState: string,
  attemptedState: string
): AppError {
  return new AppError(
    ErrorCode.INVALID_STATE_TRANSITION,
    `Cannot transition ${resource} from ${currentState} to ${attemptedState}`,
    { context: { resource, currentState, attemptedState } }
  );
}

/**
 * Wrap an unknown error in an AppError
 */
export function wrapError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(ErrorCode.INTERNAL_ERROR, error.message, {
      originalError: error,
    });
  }

  return new AppError(ErrorCode.INTERNAL_ERROR, String(error));
}
