---
title: "Security Architecture"
description: "Authentication, authorization, tenant isolation, API key handling, and deployment security in Eryxon Flow."
---


Eryxon Flow uses a layered security model built around Supabase Auth, Postgres Row Level Security, tenant-scoped data access, and hardened edge-function helpers.

## Security Model

The core rule is simple:

- client-side role checks improve UX
- server-side authorization decides access
- tenant isolation is enforced in the database

Frontend guards and role-aware UI are convenience features only. The authoritative boundary is the database and edge-function layer.

## Authentication

### Browser Sessions

The application uses Supabase Auth for browser sessions:

- email/password sign-in
- invitation-based onboarding
- optional Turnstile CAPTCHA on public auth forms
- persisted JWT sessions with automatic refresh

On sign-in, the app resolves the signed-in user, loads the matching profile, and then fetches the active tenant context. When the session disappears, the app now clears both profile and tenant state immediately to avoid stale tenant context.

### API Authentication

External REST integrations use API keys in the `Authorization` header:

```http
Authorization: Bearer ery_live_xxxxxxxxxx
```

- `ery_live_*` keys are production keys
- `ery_test_*` keys are test keys
- keys are hashed with SHA-256 before storage
- comparisons use constant-time matching in the edge auth helper

API keys are tenant-bound and authenticated in `supabase/functions/_shared/auth.ts`.

## Authorization

### Database-First Enforcement

Eryxon Flow relies on Postgres Row Level Security for real authorization:

- tenant-scoped tables are filtered through `tenant_id`
- edge functions set active tenant context before querying
- browser-only route guards do not grant access on their own

This means an attacker can bypass UI checks in the browser, but still cannot read or mutate data without a valid session, valid API key, and matching RLS permissions.

### Role Handling

The frontend uses profile role data for routing and interface decisions:

- admins can access planning, configuration, and integration screens
- operators get a narrower production-floor experience

That role field is not treated as the source of truth for security. It exists to shape the UI, while server-side enforcement remains authoritative.

## Tenant Isolation

Tenant isolation is enforced at multiple levels:

- RLS on tenant-owned tables
- tenant-aware storage paths
- tenant-bound API keys
- tenant-scoped realtime subscriptions
- tenant context initialization through RPC helpers

This is especially important for a multi-customer manufacturing system where jobs, drawings, routing, and quality data must never bleed between organizations.

## Edge Function Hardening

The edge-function layer is hardened in several ways:

- shared validation and sanitization helpers are used more consistently
- wildcard CORS was replaced by environment-driven origin handling
- internal-only functions such as webhook dispatch and MQTT publish now expect a shared secret token
- error handling is sanitized before responses are returned

For production, set `ALLOWED_ORIGIN` explicitly so browser calls are restricted to the intended app origin.

## File and Upload Security

Files are stored in private Supabase buckets and exposed through signed URLs.

Current protections include:

- tenant-scoped storage paths
- signed URL access instead of public buckets
- content-type validation for uploads
- filename sanitization and safer upload handling

This matters for STEP files, PDFs, issue attachments, and other shop-floor artifacts that should remain tenant-private.

## Webhooks and Internal Event Paths

The deployment model separates public integration endpoints from internal automation paths:

- public API endpoints use API key auth
- signup notification delivery uses an explicit Supabase Database Webhook
- internal dispatch functions should be wired with environment secrets, not open public access

This keeps deployment-specific wiring out of SQL and makes hosted and self-hosted environments more portable.

## Practical Deployment Guidance

For a secure deployment:

1. Set `ALLOWED_ORIGIN` for edge functions.
2. Keep service-role keys only in server-side secrets.
3. Configure the `notify-new-signup` Database Webhook explicitly in Supabase.
4. Use private storage buckets with signed URLs.
5. Revalidate RLS policies whenever you add new tenant-owned tables.

## Related Docs

- [App Architecture](/architecture/app-architecture/)
- [Connectivity Overview](/architecture/connectivity-overview/)
- [REST API Reference](/api/rest-api-reference/)
- [Self Hosting](/guides/self-hosting/)
