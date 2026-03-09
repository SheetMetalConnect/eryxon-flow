# PR 434-438 Integration Guide

**Target Release:** `0.3.2`

## Scope

This document captures the combined rollout for these parallel pull requests:

- `#434` Security audit fixes: authentication, CORS, validation, and XSS prevention
- `#435` Security and code quality improvements: password validation, type safety, and logging
- `#436` Route definition extraction and component management refactor
- `#437` API documentation expansion and end-to-end API test coverage
- `#438` 3D viewer measurements implementation plan

The integration branch keeps the strongest implementation where changes overlapped and resolves conflicts into one end-to-end validation target.

## Integration Decisions

- `#436` is the structural base for routing and component organization. It provided the cleanest application layout and the lowest conflict surface for the rest of the stack.
- Security-sensitive behavior from `#434` and `#435` wins over looser legacy patterns. This includes stricter tenant scoping, stronger invitation/password handling, and safer validation paths.
- Logger-based diagnostics win over ad hoc console usage where both approaches touched the same area.
- The 3D viewer measurement work is shipped as planning plus modular viewer measurement scaffolding, not as a partially hidden one-off implementation.
- API docs and E2E tooling from `#437` are kept intact and aligned with the merged backend/frontend behavior.

## What Changed

### Security and auth

- Hardened edge-function request validation and shared security helpers under `supabase/functions/_shared/`
- Improved authentication-adjacent flows, including invitation acceptance and stricter password policy enforcement
- Added stronger tenant scoping in data access paths that were at risk of cross-tenant leakage
- Preserved the signup notification fix via migration `20260202200000_fix_signup_notification_trigger.sql`

### App structure and runtime behavior

- Consolidated route and component wiring on top of the refactor from `#436`
- Standardized realtime subscription usage in issue summary hooks
- Fixed merge-level runtime issues in `src/hooks/useCADProcessing.ts`
- Kept cleanup behavior defensive for mocked realtime channels without weakening production cleanup

### API docs and testability

- Added/expanded `docs/API_PAYLOAD_REFERENCE.md`
- Added scriptable API test helpers in `scripts/api-test-utils.ts`
- Added shell-based end-to-end API coverage in `scripts/test-api-e2e.sh`
- Added `tsconfig.scripts.json` so the test utilities compile cleanly in isolation

### Viewer measurements

- Added `docs/PLAN_3D_VIEWER_MEASUREMENTS.md`
- Integrated measurement support modules under `src/components/viewer/measurements/`
- Wired the STEP viewer toward a measurement-capable architecture without forcing an unreviewed production-only workflow

## Required Migration

Run the included migration before testing signup and notification flows:

```bash
supabase db push
```

Primary migration in this integration:

- `supabase/migrations/20260202200000_fix_signup_notification_trigger.sql`

What it does:

- Removes the old tenant trigger that could send multiple signup notifications
- Removes any project-specific hardcoded profile webhook implementation
- Leaves signup notification delivery to explicit environment-level webhook configuration
- Keeps the database layer portable across hosted and self-hosted deployments

## Environment Setup

### Frontend `.env`

Copy `.env.example` to `.env` and set at least:

```bash
VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_SUPABASE_ANON_KEY"
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_ID"
```

Optional but commonly used:

```bash
VITE_TURNSTILE_SITE_KEY="YOUR_TURNSTILE_SITE_KEY"
VITE_CAD_SERVICE_URL="https://YOUR_CAD_SERVICE"
VITE_CAD_SERVICE_API_KEY="YOUR_CAD_API_KEY"
VITE_TEST_TENANT_ID="YOUR_TEST_TENANT_UUID"
```

### Edge Function secrets

For Supabase edge functions, set:

```bash
supabase secrets set \
  SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
```

Optional secrets used by this PR stack:

- `RESEND_API_KEY`
- `SIGNUP_NOTIFY_EMAIL`
- `APP_URL`
- `EMAIL_FROM`
- `ALLOWED_ORIGIN`
- `CRON_SECRET`
- `INTERNAL_SERVICE_SECRET`

### Manual signup notification webhook

After applying migrations and deploying functions, configure this once in Supabase:

1. Go to `Database -> Webhooks`
2. Create a webhook named `notify-new-signup`
3. Table: `public.profiles`
4. Events: `INSERT`
5. Type: `Supabase Edge Function`
6. Edge Function: `notify-new-signup`
7. Filter: `record.role = 'admin' AND record.has_email_login = true`

This is intentionally not hardcoded in SQL so the project stays portable across environments.

## Deployment Steps

Run these commands against the target environment:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy
npm install
npm run build
```

If you want to validate the API surface against a live Supabase project:

```bash
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export API_KEY="YOUR_API_KEY"
npm run test:api:e2e
```

## Local Development Validation

Recommended local validation order:

```bash
cp .env.example .env
# fill in the required frontend values

npm install
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy
npm run dev
```

Expected result:

- Vite starts without compile errors
- auth screens load with the configured Supabase project
- signup/invitation flows work against the migrated schema
- issue hooks and route tree load without runtime errors

## Best Practices For This Rollout

- Apply migrations before deploying the frontend, not after
- Deploy edge functions in the same rollout window as the migration
- Treat environment-specific webhook wiring as deployment config, not schema
- Validate signup notifications in a non-production project first because the trigger behavior changed
- Keep `VITE_SUPABASE_URL` explicit rather than relying on project-id-derived fallbacks
- Use live API E2E checks only against a project with representative tenant/test data
- Review `docs/PLAN_3D_VIEWER_MEASUREMENTS.md` as planning/scaffolding, not as a finished feature-complete QA target

## Verification Completed On This Branch

The integration branch was validated with:

- `npx tsc --noEmit`
- `npx tsc -p tsconfig.scripts.json --noEmit`
- `npm run build`
- `npm run test:run`
- `npm run dev`

Current result:

- `24` test files passed
- `440` tests passed

## Recommended QA Flow

1. Apply migrations and deploy edge functions.
2. Validate admin signup and confirm only one signup notification is emitted.
3. Validate invitation acceptance with weak and strong passwords.
4. Smoke test the main route tree after the route/component refactor.
5. Run live API E2E checks with `npm run test:api:e2e`.
6. Open the STEP viewer and verify measurement UI wiring and documentation-driven behavior.

## Files to Review First

- `CHANGELOG.md`
- `docs/API_PAYLOAD_REFERENCE.md`
- `docs/PLAN_3D_VIEWER_MEASUREMENTS.md`
- `supabase/migrations/20260202200000_fix_signup_notification_trigger.sql`
- `scripts/test-api-e2e.sh`
