---
title: "API Key Authentication"
description: "Documentation for API Key Authentication"
---

## Overview

The Eryxon Flow API uses API keys for external integrations (ERP systems, automation, etc.). Keys follow the format `ery_live_xxx` or `ery_test_xxx`.

## How It Works

### Key Generation
1. Admin creates API key via dashboard (Admin > API Keys)
2. System generates random key: `ery_live_<32-random-chars>`
3. Key is hashed using **SHA-256** and stored in `api_keys` table
4. Plaintext key shown once to user (never stored)

### Key Validation
1. Client sends request with `Authorization: Bearer ery_live_xxx`
2. System extracts key prefix (first 12 chars) for efficient lookup
3. Looks up candidate keys by prefix
4. Hashes provided key with **SHA-256** and compares to stored hash
5. On match: sets tenant context and allows request

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐
│   Dashboard User    │     │   External System    │
│   (JWT Auth)        │     │   (API Key Auth)     │
└─────────┬───────────┘     └──────────┬───────────┘
          │                            │
          ▼                            ▼
┌─────────────────────┐     ┌──────────────────────┐
│  api-key-generate   │     │  api-jobs, api-parts │
│  (creates keys)     │     │  (validates keys)    │
└─────────┬───────────┘     └──────────┬───────────┘
          │                            │
          │     SHA-256 hash           │ SHA-256 hash
          ▼                            ▼
┌──────────────────────────────────────────────────┐
│                  api_keys table                  │
│  key_prefix | key_hash | tenant_id | active      │
└──────────────────────────────────────────────────┘
```

## Shared Auth Module

All API endpoints use the shared authentication module:

```typescript
// supabase/functions/_shared/auth.ts
import { authenticateAndSetContext } from "../_shared/auth.ts";

// In your endpoint:
const { tenantId } = await authenticateAndSetContext(req, supabase);
```

This module:
- Extracts Bearer token from Authorization header
- Validates key format (`ery_live_*` or `ery_test_*`)
- Looks up key by prefix (efficient query)
- Hashes and compares using SHA-256
- Sets tenant context for Row-Level Security
- Updates `last_used_at` timestamp (async)

## Two Auth Patterns

| Pattern | Endpoints | Token Type | Use Case |
|---------|-----------|------------|----------|
| **API Key** | `api-jobs`, `api-parts`, etc. | `ery_live_xxx` | External integrations |
| **JWT** | `api-key-generate`, `api-integrations` | Supabase session | Dashboard users |

## Key Format

```
ery_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
└─┬─┘└┬─┘└──────────────┬────────────────┘
  │   │                 │
  │   │                 └── 32 random chars
  │   └── Environment (live/test)
  └── Prefix identifier
```

## Database Schema

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,      -- First 12 chars for lookup
  key_hash TEXT NOT NULL,        -- SHA-256 hash of full key
  active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Index for efficient prefix lookup
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix) WHERE active = true;
```

## Security Considerations

1. **Keys are never stored** - Only SHA-256 hash is persisted
2. **Prefix lookup** - Avoids comparing all keys (O(1) vs O(n))
3. **Constant-time comparison** - SHA-256 comparison prevents timing attacks
4. **Async last_used update** - Doesn't block request response
5. **Soft delete** - Keys are deactivated, not deleted (audit trail)

## Error Responses

| Error | HTTP Status | Cause |
|-------|-------------|-------|
| `Missing or invalid authorization header` | 401 | No Bearer token |
| `Invalid API key format` | 401 | Key doesn't match `ery_*` pattern |
| `Invalid API key` | 401 | Key not found or hash mismatch |

## Testing

```bash

curl -H "Authorization: Bearer ery_live_yourkey" \
  https://yourproject.supabase.co/functions/v1/api-jobs




curl -H "Authorization: Bearer invalid_key" \
  https://yourproject.supabase.co/functions/v1/api-jobs

