This document describes the error handling and logging patterns used in the Eryxon Flow application.


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

## Request-Correlated Observability (Edge)

Location: `supabase/functions/_shared/observability.ts`, wired through
`supabase/functions/_shared/handler.ts` and
`supabase/functions/_shared/validation/errorHandler.ts`.

This is the managed-pilot incident-trace baseline (ERY-39 / ERY-46). It lets a
single request be followed from the edge log line into a durable
`activity_log` row using one shared id.

### The request-correlation contract

Every request that goes through `createApiHandler` / `serveApi` carries:

| Field        | Meaning                                              |
| ------------ | ---------------------------------------------------- |
| `requestId`  | shared correlation id (see below)                    |
| `service`    | edge function name (first path segment)              |
| `route`      | request URL path                                     |
| `method`     | HTTP method                                          |
| `statusCode` | mapped HTTP status for the outcome                   |
| `eventType`  | domain event, e.g. `issue.created`, `edge.error`     |
| `errorCode`  | stable error code from `mapError` (failures only)    |

The same fields exist on the frontend `LogContext` (`src/lib/logger.ts`) so a
browser log can be stitched to the edge log by `requestId`.

### Request id rule

- The edge boundary reads an inbound `x-request-id` header. A **valid** value
  (≤ 200 chars, `[A-Za-z0-9._:-]`) is trusted and reused; otherwise a fresh
  uuid is minted via `resolveRequestId`.
- The resolved id is **always returned** in the `x-request-id` response header
  (success and failure), and exposed to browsers via CORS
  (`Access-Control-Expose-Headers`).
- The same id is written into both the structured edge log line (`edgeLog`)
  and any persisted `activity_log.metadata.request_id`.

### Persistence rule

`shouldPersistPilotEvent` decides what reaches `activity_log`:

- `warn` and `error` events are **always** persisted.
- `info`/`debug` events are persisted **only** when their `eventType` is in
  `PILOT_CRITICAL_EVENT_TYPES` (auth/session recovery, tenant switch, operator
  login, time entry, issue creation, job/operation lifecycle, webhook/MQTT
  dispatch failures).
- Events with no `tenantId` are skipped (the column is `NOT NULL`; this also
  avoids persisting pre-auth failures).
- Persistence is **best-effort**: a write failure is logged but never breaks
  the request path.

The handler persists an `edge.error` event for every mapped failure, and
handlers can record success-path lifecycle events via
`ctx.recordPilotEvent({ eventType, action, ... })` (see `api-issues` for the
`issue.created` example).

### Tracing one incident

1. Find the edge log line for the failing request and copy its `request_id`.
2. Query `activity_log` for the matching row:
   `select * from activity_log where metadata->>'request_id' = '<id>'`.
3. The row's `metadata` carries `severity`, `error_code`, `status_code`,
   `service`, and `route` — the full edge↔DB correlation.

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

- [Coding Patterns](/engineering/coding-patterns/) - General coding patterns
- [Caching](/architecture/caching/) - Query caching patterns
