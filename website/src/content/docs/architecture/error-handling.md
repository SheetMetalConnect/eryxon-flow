---
title: "Error Handling and Logging Guide"
description: "Documentation for Error Handling and Logging Guide"
---



This document describes the error handling and logging patterns used in the Eryxon MES application.

## Table of Contents

- [Error Handling Utilities](#error-handling-utilities)
- [Logging System](#logging-system)
- [Error Boundary](#error-boundary)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)

---

## Error Handling Utilities

Location: `src/lib/errors.ts`

### Error Codes

Use predefined error codes for consistency:

```typescript
import { ErrorCode } from '@/lib/errors';

// Available codes:
ErrorCode.UNAUTHORIZED      // User not authenticated
ErrorCode.FORBIDDEN         // User lacks permission
ErrorCode.NOT_FOUND         // Resource not found
ErrorCode.VALIDATION_ERROR  // Invalid input
ErrorCode.QUOTA_EXCEEDED    // Storage/usage limit reached
ErrorCode.NETWORK_ERROR     // Network connectivity issue
ErrorCode.TIMEOUT           // Operation timed out
// ... and more
```

### AppError Class

Create rich error objects with context:

```typescript
import { AppError, ErrorCode } from '@/lib/errors';

throw new AppError('Job not found', ErrorCode.NOT_FOUND, {
  context: { jobId: '123', tenantId: 'abc' },
  httpStatus: 404,
  isRetryable: false,
});
```

### Safe Error Message Extraction

Always use `getErrorMessage` for unknown error types:

```typescript
import { getErrorMessage } from '@/lib/errors';

try {
  await someOperation();
} catch (error) {
  const message = getErrorMessage(error); // Always returns string
  toast.error(message);
}
```

### Supabase Error Conversion

Convert Supabase errors to AppError for consistent handling:

```typescript
import { fromSupabaseError } from '@/lib/errors';

const { data, error } = await supabase.from('jobs').select('*');
if (error) {
  throw fromSupabaseError(error, { operation: 'fetchJobs' });
}
```

### Result Type Pattern

For operations where failure is expected, use the Result type:

```typescript
import { Result, ok, err, tryCatch } from '@/lib/errors';

async function fetchJob(id: string): Promise<Result<Job>> {
  const result = await tryCatch(
    supabase.from('jobs').select('*').eq('id', id).single(),
    { operation: 'fetchJob' }
  );

  if (!result.success) {
    return result; // Returns { success: false, error: AppError }
  }

  return ok(result.data); // Returns { success: true, data: Job }
}

// Usage:
const result = await fetchJob('123');
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error.toUserMessage());
}
```

---

## Logging System

Location: `src/lib/logger.ts`

### Basic Usage

```typescript
import { logger } from '@/lib/logger';

// Log levels
logger.debug('Detailed info for development');
logger.info('General operational information');
logger.warn('Potential issues');
logger.error('Errors that affect functionality', error);
```

### Logging with Context

Always include context for better debugging:

```typescript
logger.info('Job created', {
  operation: 'createJob',
  entityType: 'job',
  entityId: jobId,
  tenantId: profile.tenant_id,
});

logger.error('Failed to update operation', error, {
  operation: 'updateOperation',
  entityType: 'operation',
  entityId: operationId,
});
```

### Supabase Operation Logging

Log database operations consistently:

```typescript
const { data, error } = await supabase.from('jobs').insert(newJob);

logger.supabaseOperation('INSERT', 'jobs', { data, error }, {
  entityId: newJob.id,
  tenantId: tenantId,
});
```

### Timed Operations

Track operation performance:

```typescript
// Synchronous
const result = logger.timed('processData', () => {
  return heavyComputation();
});

// Asynchronous
const data = await logger.timedAsync('fetchMetrics', async () => {
  return await fetchAllMetrics();
}, { tenantId });
```

### Scoped Loggers

Create loggers with preset context for components/hooks:

```typescript
import { createScopedLogger } from '@/lib/logger';

function useJobOperations(jobId: string) {
  const log = createScopedLogger({
    operation: 'useJobOperations',
    entityType: 'job',
    entityId: jobId,
  });

  const updateJob = async (data: Partial<Job>) => {
    log.info('Updating job');
    try {
      await supabase.from('jobs').update(data).eq('id', jobId);
      log.info('Job updated successfully');
    } catch (error) {
      log.error('Failed to update job', error);
      throw error;
    }
  };
}
```

### Log Levels by Environment

- **Development**: All logs (debug, info, warn, error)
- **Production**: Only warn and error

---

## Error Boundary

Location: `src/components/ErrorBoundary.tsx`

### Basic Usage

Wrap components that might throw:

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  <ComponentThatMightFail />
</ErrorBoundary>
```

### Custom Fallback

Provide a custom error UI:

```tsx
<ErrorBoundary
  fallback={<CustomErrorComponent />}
  onError={(error, info) => {
    // Send to error tracking service
    trackError(error, info);
  }}
>
  <MyComponent />
</ErrorBoundary>
```

### HOC Pattern

Wrap components with error boundary:

```tsx
import { withErrorBoundary } from '@/components/ErrorBoundary';

const SafeComponent = withErrorBoundary(MyComponent, {
  errorMessage: 'Failed to load component',
});
```

### Lazy Loading Fallback

Use with React.lazy for code splitting:

```tsx
import { PageLoadingFallback } from '@/components/ErrorBoundary';

<Suspense fallback={<PageLoadingFallback />}>
  <LazyComponent />
</Suspense>
```

---

## Best Practices

### 1. Always Handle Errors

Never leave catch blocks empty:

```typescript
// BAD
try {
  await operation();
} catch (error) {
  // Silent failure
}

// GOOD
try {
  await operation();
} catch (error) {
  logger.error('Operation failed', error, { operation: 'myOperation' });
  toast.error(getErrorMessage(error));
}
```

### 2. Use Typed Errors

Avoid `any` in catch blocks:

```typescript
// BAD
catch (error: any) {
  console.error(error.message);
}

// GOOD
catch (error) {
  const message = getErrorMessage(error);
  logger.error('Operation failed', error);
}
```

### 3. Include Context

Always log with relevant context:

```typescript
// BAD
logger.error('Error');

// GOOD
logger.error('Failed to create job', error, {
  operation: 'createJob',
  tenantId,
  userId,
  jobData: { name: job.name },
});
```

### 4. User-Friendly Messages

Convert technical errors for users:

```typescript
const appError = fromSupabaseError(error);
toast.error(appError.toUserMessage()); // "The requested resource was not found."
```

### 5. Retry Logic for Transient Errors

Check if error is retryable:

```typescript
import { isRetryableError } from '@/lib/errors';

const MAX_RETRIES = 3;
let attempt = 0;

while (attempt < MAX_RETRIES) {
  try {
    await operation();
    break;
  } catch (error) {
    if (!isRetryableError(error) || attempt === MAX_RETRIES - 1) {
      throw error;
    }
    attempt++;
    await delay(Math.pow(2, attempt) * 1000); // Exponential backoff
  }
}
```

---

## Migration Guide

### Converting Existing Code

#### Before (Old Pattern)

```typescript
try {
  const { data, error } = await supabase.from('jobs').select('*');
  if (error) throw error;
  return data;
} catch (error) {
  console.error('Error fetching jobs:', error);
  throw error;
}
```

#### After (New Pattern)

```typescript
import { logger } from '@/lib/logger';
import { fromSupabaseError, getErrorMessage } from '@/lib/errors';

try {
  const { data, error } = await supabase.from('jobs').select('*');
  if (error) {
    throw fromSupabaseError(error, { operation: 'fetchJobs' });
  }
  return data;
} catch (error) {
  logger.error('Failed to fetch jobs', error, {
    operation: 'fetchJobs',
    tenantId,
  });
  throw error;
}
```

### Priority Areas for Migration

1. **Authentication flows** - Critical for security
2. **Data mutations** - Important for data integrity
3. **External integrations** - Webhooks, MQTT, APIs
4. **File operations** - Upload/download errors

---

## Related Documentation

- [Coding Patterns](/development/coding_patterns/) - General coding patterns
- [Caching](/architecture/caching/) - Query caching patterns
- [Developer Guide](/development/claude/) - AI agent guidelines
