# PR 434-438 Integration Guide

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
- Replaces it with a profile insert trigger for first admin signups
- Keeps notification delivery non-blocking for the signup transaction

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

## Verification Completed On This Branch

The integration branch was validated with:

- `npx tsc --noEmit`
- `npx tsc -p tsconfig.scripts.json --noEmit`
- `npm run build`
- `npm run test:run`

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
