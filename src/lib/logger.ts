/**
 * Structured Logging Utility
 *
 * Provides consistent, context-aware logging throughout the application.
 * This is a foundation for future integration with external logging services
 * (Sentry, DataDog, LogRocket, etc.)
 *
 * Features:
 * 1. Log levels (debug, info, warn, error)
 * 2. Structured context with each log
 * 3. Environment-aware behavior
 * 4. Easy migration path to external services
 */

import { getErrorMessage, ErrorCodeType } from './errors';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  /** The operation being performed */
  operation?: string;
  /** Entity type (job, part, operation, etc.) */
  entityType?: string;
  /** Entity ID */
  entityId?: string;
  /** Tenant ID for multi-tenant context */
  tenantId?: string;
  /** User ID */
  userId?: string;
  /** Error code if applicable */
  errorCode?: ErrorCodeType;
  /** HTTP status if applicable */
  httpStatus?: number;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Additional metadata */
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Log level priority for filtering
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Get the minimum log level from environment
 */
function getMinLogLevel(): LogLevel {
  // In production, default to 'warn' to reduce noise
  // In development, show all logs
  if (import.meta.env.PROD) {
    return 'warn';
  }
  return 'debug';
}

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  const minLevel = getMinLogLevel();
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}

/**
 * Format a log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const parts: string[] = [];

  // Add timestamp in development
  if (import.meta.env.DEV) {
    parts.push(`[${new Date(entry.timestamp).toLocaleTimeString()}]`);
  }

  // Add level badge
  parts.push(`[${entry.level.toUpperCase()}]`);

  // Add operation context if present
  if (entry.context?.operation) {
    parts.push(`[${entry.context.operation}]`);
  }

  // Add message
  parts.push(entry.message);

  return parts.join(' ');
}

/**
 * Get console styling for log level
 */
function getLogStyle(level: LogLevel): string {
  switch (level) {
    case 'debug':
      return 'color: #888';
    case 'info':
      return 'color: #0969da';
    case 'warn':
      return 'color: #9a6700';
    case 'error':
      return 'color: #cf222e';
  }
}

/**
 * Output a log entry to the console
 */
function outputLog(entry: LogEntry): void {
  const message = formatLogEntry(entry);
  const style = getLogStyle(entry.level);

  // Use appropriate console method
  switch (entry.level) {
    case 'debug':
      console.debug(`%c${message}`, style, entry.context || '');
      break;
    case 'info':
      console.info(`%c${message}`, style, entry.context || '');
      break;
    case 'warn':
      console.warn(`%c${message}`, style, entry.context || '');
      break;
    case 'error':
      console.error(`%c${message}`, style, entry.context || '');
      if (entry.error?.stack) {
        console.error(entry.error.stack);
      }
      break;
  }
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  if (error) {
    entry.error = {
      message: getErrorMessage(error),
      stack: error instanceof Error ? error.stack : undefined,
      code: error && typeof error === 'object' && 'code' in error
        ? String((error as { code: unknown }).code)
        : undefined,
    };
  }

  return entry;
}

/**
 * Main logger object with methods for each log level
 */
export const logger = {
  /**
   * Debug level - verbose information for development
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return;
    const entry = createLogEntry('debug', message, context);
    outputLog(entry);
  },

  /**
   * Info level - general operational information
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return;
    const entry = createLogEntry('info', message, context);
    outputLog(entry);
  },

  /**
   * Warn level - potential issues that don't prevent operation
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return;
    const entry = createLogEntry('warn', message, context);
    outputLog(entry);
  },

  /**
   * Error level - errors that affect functionality
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    if (!shouldLog('error')) return;
    const entry = createLogEntry('error', message, context, error);
    outputLog(entry);

    // Future: Send to external error tracking service
    // Sentry.captureException(error, { extra: context });
  },

  /**
   * Log a Supabase operation result
   */
  supabaseOperation(
    operation: string,
    table: string,
    result: { error?: unknown; data?: unknown },
    context?: Omit<LogContext, 'operation' | 'entityType'>
  ): void {
    const fullContext: LogContext = {
      ...context,
      operation,
      entityType: table,
    };

    if (result.error) {
      this.error(`${operation} on ${table} failed`, result.error, fullContext);
    } else {
      this.debug(`${operation} on ${table} succeeded`, fullContext);
    }
  },

  /**
   * Log with timing information
   */
  timed<T>(
    operation: string,
    fn: () => T,
    context?: LogContext
  ): T {
    const start = performance.now();
    try {
      const result = fn();
      const durationMs = Math.round(performance.now() - start);
      this.debug(`${operation} completed`, { ...context, operation, durationMs });
      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - start);
      this.error(`${operation} failed`, error, { ...context, operation, durationMs });
      throw error;
    }
  },

  /**
   * Log async operation with timing
   */
  async timedAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = Math.round(performance.now() - start);
      this.debug(`${operation} completed`, { ...context, operation, durationMs });
      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - start);
      this.error(`${operation} failed`, error, { ...context, operation, durationMs });
      throw error;
    }
  },
};

/**
 * Create a scoped logger with preset context
 * Useful for components or hooks that need consistent context
 */
export function createScopedLogger(baseContext: LogContext) {
  return {
    debug(message: string, context?: LogContext): void {
      logger.debug(message, { ...baseContext, ...context });
    },
    info(message: string, context?: LogContext): void {
      logger.info(message, { ...baseContext, ...context });
    },
    warn(message: string, context?: LogContext): void {
      logger.warn(message, { ...baseContext, ...context });
    },
    error(message: string, error?: unknown, context?: LogContext): void {
      logger.error(message, error, { ...baseContext, ...context });
    },
  };
}

/**
 * Performance tracking utility
 */
export function measurePerformance(name: string): () => void {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    logger.debug(`Performance: ${name}`, { durationMs: Math.round(duration) });
  };
}

export default logger;
