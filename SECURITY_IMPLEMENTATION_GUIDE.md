# Security Implementation Guide

This guide shows how to apply the security fixes identified in SECURITY_AUDIT.md.

## Overview

**Status:** Security utilities created, ready to apply
**Location:** `supabase/functions/_shared/`
**Priority:** Apply before production deployment

---

## ✅ Step 1: Security Utilities Created

The following security modules are ready to use:

### 1. Rate Limiter (`_shared/rate-limiter.ts`)
```typescript
import { checkRateLimit, createRateLimitResponse, getRateLimitHeaders } from "../_shared/rate-limiter.ts";
```

**Features:**
- In-memory rate limiting
- Configurable limits per endpoint
- Automatic cleanup of old entries
- Standard rate limit headers

### 2. Security Utils (`_shared/security.ts`)
```typescript
import {
  sanitizeError,
  validateFilename,
  validateContentType,
  validateWebhookUrl,
  validateInputLimits,
  capPaginationLimit,
  getClientIdentifier,
  constantTimeCompare,
  getCorsHeaders
} from "../_shared/security.ts";
```

**Features:**
- Error message sanitization
- File upload validation
- Webhook URL validation (SSRF prevention)
- Input validation
- Pagination limits
- Secure CORS headers
- Timing-attack-resistant comparison

---

## 📋 Step 2: Apply to Edge Functions

### Template for Securing an Endpoint

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

// 🔒 SECURITY IMPORTS
import { checkRateLimit, createRateLimitResponse, getRateLimitHeaders } from "../_shared/rate-limiter.ts";
import { sanitizeError, getClientIdentifier, getCorsHeaders } from "../_shared/security.ts";

// 🔒 SECURE CORS HEADERS
const corsHeaders = getCorsHeaders();

async function authenticateApiKey(authHeader: string | null, supabase: any) {
  // ... existing auth code ...
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // 🔒 STEP 1: RATE LIMITING (before authentication)
    const clientId = getClientIdentifier(req);
    const rateLimit = checkRateLimit(clientId, {
      maxRequests: 100, // 100 requests
      windowMs: 60 * 1000, // per minute
      keyPrefix: 'api-endpoint',
    });

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit, corsHeaders);
    }

    // 🔒 STEP 2: AUTHENTICATION
    const tenantId = await authenticateApiKey(req.headers.get('authorization'), supabase);

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' }
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            ...getRateLimitHeaders(rateLimit), // Include rate limit info
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // 🔒 STEP 3: INPUT VALIDATION
    const body = await req.json();
    // ... validate inputs using validateInputLimits() ...

    // 🔒 STEP 4: BUSINESS LOGIC
    // ... your endpoint logic ...

    // 🔒 STEP 5: SUCCESSFUL RESPONSE
    return new Response(
      JSON.stringify({
        success: true,
        data: { /* ... */ }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          ...getRateLimitHeaders(rateLimit),
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    // 🔒 STEP 6: SANITIZED ERROR HANDLING
    console.error('Error in endpoint:', error); // Server-side logging
    const sanitized = sanitizeError(error); // Client-safe error

    return new Response(
      JSON.stringify({
        success: false,
        error: sanitized
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
```

---

## 🎯 Step 3: Endpoint-Specific Security

### api-upload-url (File Upload)

**Additional Security:**
```typescript
import { validateFilename, validateContentType } from "../_shared/security.ts";

// After getting body
const { filename, content_type, job_number } = body;

// 🔒 VALIDATE FILENAME
const filenameCheck = validateFilename(filename);
if (!filenameCheck.valid) {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code: 'INVALID_FILENAME', message: filenameCheck.error }
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// 🔒 VALIDATE CONTENT TYPE
const contentTypeCheck = validateContentType(content_type);
if (!contentTypeCheck.valid) {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code: 'INVALID_CONTENT_TYPE', message: contentTypeCheck.error }
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Use sanitized filename
const sanitizedFilename = filenameCheck.sanitized!;
const filePath = job_number
  ? `${tenantId}/jobs/${job_number}/${sanitizedFilename}`
  : `${tenantId}/files/${sanitizedFilename}`;
```

**Rate Limit:**
```typescript
const rateLimit = checkRateLimit(clientId, {
  maxRequests: 50, // More restrictive for file uploads
  windowMs: 60 * 1000,
  keyPrefix: 'file-upload',
});
```

---

### api-jobs (Create Jobs)

**Additional Security:**
```typescript
import { validateInputLimits, capPaginationLimit } from "../_shared/security.ts";

// For POST (create)
const validation = validateInputLimits({
  jobNumber: body.job_number,
  customer: body.customer,
  notes: body.notes,
});

if (!validation.valid) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validation.errors
      }
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// For GET (list)
const url = new URL(req.url);
const limit = capPaginationLimit(
  parseInt(url.searchParams.get('limit') || '100'),
  100, // default
  1000 // max
);
```

**Rate Limit:**
```typescript
// Separate limits for GET vs POST
const isReadOperation = req.method === 'GET';
const rateLimit = checkRateLimit(tenantId, {
  maxRequests: isReadOperation ? 200 : 50, // More permissive for reads
  windowMs: 60 * 1000,
  keyPrefix: isReadOperation ? 'jobs-read' : 'jobs-write',
});
```

---

### webhook-dispatch (Webhook Security)

**Additional Security:**
```typescript
import { validateWebhookUrl } from "../_shared/security.ts";

// Before dispatching webhook
const urlCheck = validateWebhookUrl(webhook.url);
if (!urlCheck.valid) {
  console.error(`Invalid webhook URL for webhook ${webhook.id}: ${urlCheck.error}`);
  // Log but don't crash - just skip this webhook
  continue;
}
```

**Rate Limit:**
```typescript
// Rate limit webhook dispatches to prevent abuse
const rateLimit = checkRateLimit('global-webhook-dispatch', {
  maxRequests: 1000, // 1000 webhooks
  windowMs: 60 * 1000, // per minute
  keyPrefix: 'webhook-dispatch',
});
```

---

## 🔐 Step 4: Frontend Security

### ConfigWebhooks.tsx (Webhook URL Validation)

**Current Code:**
```typescript
if (!webhookUrl.trim() || !webhookUrl.startsWith('https://')) {
  // Basic check
}
```

**Secure Code:**
```typescript
import { isValidWebhookUrl } from "@/lib/security";

const isValid = isValidWebhookUrl(webhookUrl);
if (!isValid) {
  toast({
    title: "Invalid URL",
    description: "Webhook URL must be a valid HTTPS endpoint (no localhost or private IPs)",
    variant: "destructive",
  });
  return;
}
```

**Create Frontend Utility:**
```typescript
// src/lib/security.ts
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1'
    ) {
      return false;
    }

    // Block private IPs
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ) {
      return false;
    }

    // Block metadata services
    if (hostname === '169.254.169.254') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
```

---

## 📊 Step 5: Environment Configuration

### Required Environment Variables

**In Supabase Dashboard → Project Settings → Edge Functions:**

```bash
# Optional: Restrict CORS to specific origin
ALLOWED_ORIGIN=https://your-domain.com

# Optional: Custom rate limits (if needed)
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

**For Production:**
```bash
# Lock down CORS
ALLOWED_ORIGIN=https://production-domain.com

# Tighter rate limits
RATE_LIMIT_MAX_REQUESTS=50
RATE_LIMIT_WINDOW_MS=60000
```

**For Development:**
```bash
# Allow localhost
ALLOWED_ORIGIN=http://localhost:5173

# Looser rate limits
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=60000
```

---

## 🧪 Step 6: Testing Security

### Test Rate Limiting

```bash
# Send 101 requests in quick succession
for i in {1..101}; do
  curl -X GET "https://your-project.supabase.co/functions/v1/api-jobs" \
    -H "Authorization: Bearer ery_live_xxxx"
done

# Expected: First 100 succeed, 101st returns 429
```

### Test File Upload Security

```bash
# Try path traversal
curl -X POST "https://your-project.supabase.co/functions/v1/api-upload-url" \
  -H "Authorization: Bearer ery_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{"filename": "../../etc/passwd", "content_type": "text/plain"}'

# Expected: 400 Bad Request - Invalid filename

# Try executable upload
curl -X POST "https://your-project.supabase.co/functions/v1/api-upload-url" \
  -H "Authorization: Bearer ery_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{"filename": "malware.exe", "content_type": "application/x-msdownload"}'

# Expected: 400 Bad Request - File type not allowed
```

### Test Webhook URL Validation

```bash
# Try localhost webhook
curl -X POST "https://your-app.com/admin/webhooks/create" \
  -d '{"url": "https://localhost:8080/webhook", "events": ["task.completed"]}'

# Expected: Validation error - Localhost not allowed

# Try private IP
curl -X POST "https://your-app.com/admin/webhooks/create" \
  -d '{"url": "https://192.168.1.1/webhook", "events": ["task.completed"]}'

# Expected: Validation error - Private IP not allowed
```

### Test Input Validation

```bash
# Try oversized input
curl -X POST "https://your-project.supabase.co/functions/v1/api-jobs" \
  -H "Authorization: Bearer ery_live_xxxx" \
  -H "Content-Type: application/json" \
  -d "{\"job_number\": \"$(python -c 'print(\"A\" * 10000)')\"}"

# Expected: 400 Bad Request - Job number too long
```

---

## 📝 Step 7: Security Checklist

Before deploying to production, verify:

- [ ] All edge functions have rate limiting
- [ ] All edge functions use `getCorsHeaders()` from security utils
- [ ] All edge functions use `sanitizeError()` for error handling
- [ ] File upload endpoints validate filenames and content types
- [ ] Webhook URLs validated for SSRF prevention
- [ ] Input validation applied to all user inputs
- [ ] Pagination limits capped at reasonable maximum
- [ ] Environment variables configured for production
- [ ] Security tests pass
- [ ] Rate limits tested and working
- [ ] CORS configured correctly
- [ ] Error messages don't leak sensitive data

---

## 🚀 Step 8: Deployment

1. **Deploy security utilities first:**
   ```bash
   supabase functions deploy _shared/rate-limiter
   supabase functions deploy _shared/security
   ```

2. **Update and deploy each endpoint:**
   ```bash
   supabase functions deploy api-upload-url
   supabase functions deploy api-jobs
   supabase functions deploy api-parts
   supabase functions deploy api-tasks
   supabase functions deploy webhook-dispatch
   ```

3. **Set environment variables:**
   - Go to Supabase Dashboard → Project Settings → Edge Functions
   - Add `ALLOWED_ORIGIN` for your production domain

4. **Monitor:**
   - Check Supabase logs for rate limit hits
   - Monitor for validation errors
   - Watch for suspicious patterns

---

## 📚 Additional Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Supabase Edge Functions Best Practices](https://supabase.com/docs/guides/functions)
- [Rate Limiting Patterns](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

---

**Next Steps:**
1. Review this guide
2. Apply security updates to edge functions systematically
3. Test thoroughly in development
4. Deploy to production with monitoring
5. Schedule regular security audits
