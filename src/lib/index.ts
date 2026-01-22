/**
 * Library utilities barrel export
 *
 * Provides convenient imports for common utilities:
 * import { logger, AppError, ErrorCode } from '@/lib';
 */

// Error handling utilities
export {
  ErrorCode,
  AppError,
  getErrorMessage,
  getSupabaseErrorCode,
  isSupabaseError,
  fromSupabaseError,
  createErrorHandler,
  withErrorHandling,
  isRetryableError,
  ok,
  err,
  tryCatch,
  type ErrorCodeType,
  type Result,
} from './errors';

// Logging utilities
export {
  logger,
  createScopedLogger,
  measurePerformance,
  type LogLevel,
  type LogContext,
} from './logger';

// Query client and caching
export {
  queryClient,
  createQueryClient,
  QueryKeys,
  StaleTime,
  CacheTime,
  defaultQueryOptions,
} from './queryClient';

// Cache invalidation
export {
  invalidateJobCaches,
  invalidatePartCaches,
  invalidateOperationCaches,
  invalidateCellCaches,
  invalidateTimeEntryCaches,
  invalidateIssueCaches,
  invalidateConfigCaches,
  invalidateAllCaches,
  prefetchCommonData,
} from './cacheInvalidation';

// General utilities
export { cn } from './utils';
