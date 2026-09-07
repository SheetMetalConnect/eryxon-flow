# Community maintenance review: 0.10.0

This review prioritizes correctness and maintainability in the existing Community
application. It does not change the BUSL license or add Premium capabilities.
Implemented changes and upgrade requirements are in `CHANGELOG.md`; development,
PR feedback, and release procedures are in `RELEASING.md`.

## Decisions implemented

- Keep the React/Vite frontend and Supabase architecture. Separate display from
  production mutations; perform multi-record lifecycle changes in PostgreSQL
  transactions. Both browser and service-role API paths call those contracts.
- Use one responsive operator interface. Preserve old links through redirects;
  remove the second mobile implementation. PWA is optional and updates wait for
  an explicit reload, so an active shift is not interrupted automatically.
- Treat the authenticated account, tenant, and PIN employee as separate identities.
  Validate them server-side, invalidate client caches on identity changes, and
  ignore stale results. Test denials as well as successful operations.
- Generate database types from a clean migration replay. Do not maintain a second
  manual copy. Share domain types outside hooks and UI implementations, and import
  route constants directly. The checked app import graph has no cycles.
- Publish immutable images through one release workflow. Separate release
  publication from production rollout; verify the server before backend changes.
  Retain a tested app rollback path and document that it cannot roll back data.
- Check all PR feedback repeatedly. A green build does not establish that review
  comments were handled, and bot silence does not establish review completion.

## Evidence and limits

The baseline root typecheck checked no files. Checking project references exposed
133 errors; the corrected command now checks the app, tests, and Vite configuration.
The baseline app had 984 passing tests despite those type errors and reproduced
stale-table and dropped-realtime defects. New regressions exercise those failures,
PIN verification races, API write restrictions, and stale authentication responses.
Some old tests that only mirrored unused code or duplicate type declarations were
removed; test count alone is not a coverage claim.

Database validation replays migrations locally and exercises tenant isolation,
privilege escalation denials, verified terminal sessions, transaction rollback,
and simultaneous operation/batch requests. Browser checks use intercepted local
fixtures at phone, tablet, and desktop sizes; they establish rendering/navigation
behavior, not a complete authenticated production end-to-end test. Remote customer
data and production deployment are outside these local validation results.

The app, website, and MCP dependency audits were reduced to zero reported advisories
at review time. This is a point-in-time dependency result, not a security audit or a
claim that every code path is secure. The production Docker app is also built and
its runtime configuration and health endpoint checked locally.

## Remaining maintenance work

- Large admin lists now fetch complete deterministic chunks and apply filters
  before ranges. They still materialize the matching collection in the browser.
  True server pagination, aggregate reports, and query cancellation should replace
  this when scaling those screens. Prove counts and filter semantics in tests.
- `strict` remains disabled, although implicit-any checking and the real project
  typecheck run. Adopt strict null checking by module with typed database boundaries;
  do not hide new failures with casts or broad suppression. Existing lint warnings
  and oversized components remain visible debt.
- AuthContext still combines session, profile, and tenant state. Its race/cache
  behavior is covered, but separate contexts could reduce consumer rerenders.
  Change this only with measured render evidence and retained identity tests.
- Lifecycle notifications occur after the transaction. An event transport failure
  cannot undo committed production changes, but a process failure can lose the
  notification. A transactional outbox is the appropriate next step when durable
  integration delivery is required; test retry and deduplication semantics together.
- Lazy chunks for API documentation, icons, PDF, and 3D remain large. The main app
  bundle also needs route-level profiling before further splitting. Do not preload
  all optional features through barrels or cache the entire app by default.
- Private branch protection requires a GitHub plan supporting rulesets. The repo's
  scripts and instructions help maintain review discipline but cannot prevent an
  administrator from bypassing it. Existing container-package visibility is separate.

These points are explicit limits of the release, not assertions that the work is
already implemented. Prefer focused follow-up PRs with a failing behavior or
measurement before restructuring another subsystem.
