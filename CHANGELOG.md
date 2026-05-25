# Changelog

All notable changes to Eryxon Flow are documented here.

## [0.6.0] - 2026-05-24

Beta. Mirrors the website release note `v0.6` ("Native mobile scanning and the operator preview").
Shipped items below are live on the hosted version; the native build is still behind a Beta flag
and is validating in CI ahead of the public launch.

### Added

- **Pilot activation card** on the onboarding dashboard — new evaluators land on a single activation card that walks through their first work order.
- **Hosted trial reporting pack** — trial usage is summarised for evaluators so a pilot can be reviewed without exporting raw data.
- Marketing website redesign surfaces: root landing page (`/`), blog (`/blog/`), and changelog / release-notes (`/release-notes/`), built on the canonical Eryxon design-token contract.
- Marketing **pricing page** (`/pricing/`, linked in the primary nav): three tiers — Free to start (30-day trial), Hosted (coming soon, no price), and Managed services (get-in-touch). Ported from the design-system kit's `services.html` `.svc-plans` 3-tier grid (self-host / hosted trial / managed) onto the site's `--ery-*` token contract; CTAs route through the existing `CtaButton` (hosted app) and `RolloutInquiry` (managed mailto) primitives.
- **Inline pricing on the landing page** — the three-tier pricing block now renders directly in `Landing.astro` (kit `.mk-pricing-grid` / `.mk-tier`, before the CTA banner), as the kit's `index.html` does with `<Pricing />`. Same three tiers from `pricingCopy`, a "See full pricing →" link to `/pricing/`, across EN / NL / DE.
- **Inline managed-rollout section on the landing** (`#managed-rollout`) — a compact "want help getting it into production?" block: short intro, three points (we deploy / we connect your ERP / we sequence the floor), and a `RolloutInquiry` get-in-touch button. Folded in from the standalone page, localized EN / NL / DE.
- Marketing footer creator attribution: a "Created by" card crediting Luke van Enkhuizen — Sheet Metal Connect e.U., with a locally bundled, build-optimised avatar (`website/src/assets/luke-van-enkhuizen.jpg`).

### Changed

- **Operator preview touch targets** — operator preview frames now use the 56px touch target across phone and tablet runtimes.
- Website conformance pass against the Eryxon design system: code blocks, the docs search modal, the theme-demo toggle, and feature cards now use solid surfaces, hairline borders, and design tokens — no gradients, glass / backdrop-blur, transform-on-hover, or hardcoded dark hex. Marketing and editorial headings aligned to the canonical 600-weight, sentence-case scale.
- Removed the standalone "Managed rollout" item from the primary nav — the rollout content now lives inline on the landing (`#managed-rollout`), reachable from the hero secondary CTA and the managed-services pricing tier.
- Slimmed the standalone `/managed-rollout/` page to a thin pointer (short intro + get-in-touch button + link to the homepage `#managed-rollout` section), dropping the "conversation, not a signup" copy and the long path-chooser tree. Existing deep links (footer, docs intros) keep working.

### Removed

- Dead `AccordionContainer.astro` website component (gradient-border + scale-animation legacy, unreferenced).
- Marketing footer "Contact" column (managed-rollout, email, LinkedIn, and vanenkhuizen.com links) — replaced by the creator attribution card.

## [0.5.2] - 2026-05-09

### Added

- **Native iOS / iPadOS app** (Capacitor 7) wrapping the existing React bundle. Bottom tab bar on iPhone, split-view master/detail on iPad, pull-to-refresh, swipe-to-act work-queue rows, ML Kit barcode/QR scanner, Face ID / Touch ID unlock, haptics, safe-area aware chrome, status-bar in lockstep with the React theme.
- **Native Android app** (Capacitor 7) targeting phone + tablet (Pixel Tablet, Galaxy Tab, Lenovo Tab). Hardware-back wired into React Router, offline banner, scan FAB on operator routes, sw600dp / sw720dp tablet layouts, ProGuard rules for ML Kit + biometric, app-bundle splits, deep links (`eryxon://` + `https://app.eryxon.eu`), network-security config restricting cleartext to localhost / LAN.
- **Installable PWA** (vite-plugin-pwa + workbox) for desktop macOS Launchpad / Windows Start menu / Android home-screen / iOS Add-to-Home-Screen. Web manifest with operator-friendly shortcuts (Queue / Scan / Issues), maskable icons generated from `public/pwa-icon.svg`, prompt-style service worker that surfaces updates without forcing a mid-shift reload.
- **Touch-first `/m/*` route shell** shared by all three runtimes. New operator screens: work queue, op detail with bottom-anchored Start/Stop/Complete, QR/barcode scanner, activity timeline, issues feed, terminal overview, PIN + biometric login.
- Native bridge module at `src/native/` (haptics, scanner, biometric, status bar, splash, keyboard, network, camera, app shell + hardware back) — components import from `@/native` only; nothing else touches `@capacitor/*` directly.
- npm scripts: `ios:init/sync/open/run/build`, `android:sync/open/run/livereload/assemble:debug/assemble:release/bundle:release/clean`, `pwa:assets`.
- Documentation: `docs/IOS.md`, `docs/ANDROID.md`, README PWA install guide.

### Changed

- Website / docs site refreshed for the v0.5 line: corrected Beta / Live / Coming-Soon status across the web app, REST API (24 endpoints), webhooks, MQTT (with retry / circuit-breaker / dead-letter section), MCP server, and FrePPLe / Odoo planning adapters; new "Native Mobile Apps" landing strip + roadmap entry; localization polish for DE / NL.
- Capacitor pinned to 7.6 across all plugins for a single peer-dependency line.

### Fixed

- Mobile issue tabs now use the real `public.issue_status` enum (`pending` / `approved` / `rejected` / `closed`) so freshly reported issues appear in the Open tab.
- Mobile login lands on `/m/queue` after PIN verification so the operator stays inside the touch shell.
- `PullToRefresh` no longer reads a ref during render; switched to a `dragging` state.
- `MobileScanner` hoists `launchScan` above its auto-launch effect.
- Several mobile screens defer their first fetch via `queueMicrotask` so synchronous `setState` no longer fires inside a `useEffect`.
- MQTT logs example in the docs references the correct `mqtt_publisher_id` / `success` columns.

## [0.5.1] - 2026-05-06

### Fixed

- Refreshed stale OpenTrace knowledge graph counts in the README and agent docs after regenerating the local index
- Aligned the README BSL conversion summary with the `LICENSE` change-date wording instead of a hard-coded calendar date
- Marked v0.5.1 as the current maintenance hotfix across README and website release docs

## [0.5.0] - 2026-05-06

### Added

- Planning adapter interface (`src/lib/planning/`) with ISA-95 aligned vocabulary for integrating external planning/scheduling tools
- FrePPLe adapter: pull work orders + resources, push order start/completion, Basic Auth, pagination handling
- Odoo MRP adapter (scaffold): JSON-RPC authentication, pull work orders from `mrp.production`, push execution feedback
- Factory function `createPlanningAdapter(config)` for runtime adapter selection
- 20 tests covering FrePPLe adapter (connection, mapping, pagination, error handling, auth)
- MCP Server HTTP/SSE transport (`MCP_TRANSPORT=http`): StreamableHTTP transport for Docker/cloud deployment alongside existing stdio mode
- MCP Server Dockerfile + docker-compose.yml for self-hosted deployment with health checks
- MCP Server `/health` endpoint returning server status, version, mode, and tool count
- MQTT client wrapper (`src/lib/mqtt-client.ts`) with exponential backoff retry (3 attempts), circuit breaker (5 failures / 30s cooldown), dead letter logging to `mqtt_logs`, and injectable transport for testability. 18 tests.
- Edge function test coverage: 113 tests for shared auth, security, and plan-limits modules
- Runtime env.js injection via Docker entrypoint (no rebuild needed for config changes)
- `.dockerignore` to reduce build context size
- `/health` endpoint now returns JSON (`{"status":"ok","service":"eryxon-flow"}`)
- OCI image labels for version tracking and metadata
- `src/config/env.ts` helper for runtime environment variable resolution
- Localized landing pages for DE, complete NL landing page parity
- German localization: landing page, guides, glossary, and language switcher
- Dutch localization: concepts, guides, glossary
- Language switcher in footer, browser auto-detect banner, and SEO hreflang tags
- Search and status sorting to tenant switcher
- Docs: Core Concepts guide, API query examples, capability comparison table

### Changed

- ESLint `no-explicit-any` rule enabled as warning
- Finalized release handoff messaging: active development is on hold, the hosted version remains online as-is, and users are free to use, fork, and adapt Eryxon Flow under the BSL 1.1 terms
- Added a website changelog page so the README, release notes, and docs site point to the same release history
- `as any` casts reduced from 72 to 7 across codebase
- Supabase types regenerated with latest schema
- **Lazy-load mockDataGenerator** — 2,202-line mock data module now loads on demand via dynamic `import()`. Removes ~40KB from the production bundle for all non-demo users.
- **Split database.ts into domain modules** — 1,085-line monolith decomposed into `src/lib/db/` with 4 focused modules: operations, time-tracking, batches, assemblies. Original file preserved as thin re-export.
- **Decompose PartDetailModal** — 1,193-line component split into tab sub-components under `src/components/admin/part-detail/`: PartDetailsTab (140 lines), PartOperationsTab (459 lines), PartFilesTab (167 lines).
- **CORS fails closed** — edge functions no longer default to `Access-Control-Allow-Origin: *` when `ALLOWED_ORIGIN` env var is not set. Now defaults to `localhost` only (safe for dev). Production deployments must explicitly set `ALLOWED_ORIGIN`.
- Dockerfile bumped to `node:22-alpine` (builder stage)
- Consolidated `docker-compose.yml` as single production-ready file with `env_file` support (removed `docker-compose.prod.yml`)
- CI/CD hardening: lint + typecheck gates added to all workflows, fork PR deploy protection, Cloudflare action updated to v3
- Database migration cleanup: replaced stale TODO with documentation, added migrations README and archive README

### Fixed

- **SSRF: block IPv6 loopback in webhook URL validation** — `validateWebhookUrl` now correctly blocks `[::1]`, expanded IPv6 loopback forms, IPv4-mapped IPv6 loopback (`[::ffff:127.x.x.x]`), and IPv4-mapped private ranges. URL parser normalizes these to hex notation which the previous check missed.
- Vite security vulnerabilities patched (CVE path traversal, WebSocket read)
- CORS wildcard default — now fails closed when `ALLOWED_ORIGIN` not set
- Operator UI re-render bugs: 5 `setState`-in-`useEffect` violations fixed (`OperatorLayout.tsx`, `OperatorStatusBar.tsx`, `OperatorView.tsx`)
- Root admin tenant switching no longer violates unique constraint
- Removed unrecognized `browsing-topics` from Permissions-Policy header

### Improved

- Self-hosting: runtime env injection, .dockerignore, Node 22, health endpoint
- Component refactors: PartDetailModal split, database.ts modularized, mockDataGenerator lazy-loaded
- Database migration cleanup with READMEs
- MCP server working (v2.4.0, builds clean)
- Safe dependency updates (Supabase, TanStack Query, react-hook-form, MSW, Vitest)

## [0.4.1] - 2026-03-29

### Added

- **Batch API** — `api-batches` (CRUD) and `api-batch-lifecycle` (start/stop/add-operations) edge functions
- Weighted time distribution: batch stop divides time by estimated_time ratios when available
- Webhook events: `batch.started`, `batch.completed`
- Focused auth hooks: `useProfile`, `useTenant`, `useSession`, `useAuthActions` (split from god-hook `useAuth`)
- 98 new unit tests (519 → 617 total), 12 new test files
- Agent safety guardrails: module size limits and refactoring rules in docs
- Automated API test suite (54 tests)
- Architecture documentation with Mermaid graphs
- API catalog, route map, hook map, conventions, glossary, troubleshooting docs
- ADRs (5 Architecture Decision Records)
- Dependency graph via madge
- MCP server support (CodeGraphContext, RepoMapper, Repomix)
- Agent discovery via `.agents/` directory convention

### Changed

- **Architecture refactoring** — decomposed 6 hotspots for agent-safe development:
  - `AuthContext` (94 importers) → 4 focused selector hooks, 70 consumers migrated
  - `SchedulerService` (425 lines) → calendar, capacity, allocator modules
  - `STEPViewer` (1976 lines) → scene, controls, grid, pmi-overlay modules
  - `BatchDetail` (684 lines) → 9 focused sub-components (~90 line shell)
  - `OperatorView` (686 lines) → 5 focused sub-components (~120 line shell)
- API endpoint count: 22 → 24

### Fixed

- **BatchCreate React #185 crash** — PostgREST returns arrays for ambiguous FK joins; added `unwrapRelation()` helper
- **CapacityMatrix 400 error** — `customer_name` → `customer`, `parts(name)` → `parts(part_number)` (non-existent columns)
- Operations now editable after batch creation (was disabled in edit mode)
- OperatorView test updated to match refactored component structure
- Runtime migration from legacy `serve()` to `Deno.serve()` across all edge functions
- Auth module rewrite: fixed deprecated `hexEncode`, missing FK join for tenant plan lookup
- Schema alignment: fixed 10+ edge functions referencing non-existent columns
- CRUD builder: added `skipTenantFilter`, fixed Promise-wrapped `queryModifier`, added `.range()` fallback
- Plan limits: fixed column name mismatch (`current_month_parts` vs `current_parts_this_month`)
- Validators: fixed `IssueValidator` enum values to match database
- Parts/Operations: rewrote with inline validation (heavy import chain crashed Deno runtime)
- Upload whitelist: added STEP, DXF, Excel content types
- Per-function `deno.json` for proper `@shared/` resolution
- Database migrations: added lifecycle columns, missing FK constraints, `expired` enum value

## [0.3.3] - 2026-03-09

### Changed

- Updated app and docs dependencies
- Aligned package metadata to release 0.3.3
- Refreshed architecture and operations docs

### Fixed

- Cleared website dependency audit findings
- Resolved docs-site release packaging mismatch
- Removed contradictory API documentation

## [0.3.2] - 2026-03-09

### Added

- API reference expansion and payload reference pages
- E2E API validation tooling
- 3D viewer measurement implementation plan

### Changed

- Refactored route definitions and component composition
- Consolidated realtime hook patterns
- Tightened tenant scoping across scheduler, CAD, issues, and auth

### Fixed

- Security audit findings (auth, CORS, validation, XSS, edge functions)
- Signup notification trigger (duplicate emails)
- Type safety issues and unsafe query patterns

## [0.3.1] - 2026-01-28

### Added

- MCP server test suite (90 tests)
- Zod runtime validation for all tool inputs
- Tool factory pattern (createFetchTool, createUpdateTool, createStatusTransitionTool)
- Structured error handling with ErrorCode enum
- Pagination support with metadata

### Changed

- Migrated 9 tool modules to validation and factory patterns (544 lines removed)

### Fixed

- Enum inconsistencies between create/update schemas
- Race condition (TOCTOU) in state transitions
- Agent-batch validation (imported but never called)
- Missing 'cancelled' status in job filters
- Soft-delete awareness in fetch queries

### Infrastructure

- Added `import_map.json` for Edge Functions
- Fixed 502 errors from circular dependencies
- Automated self-hosting setup script
- Idempotent storage bucket creation and RLS policies
- Auth trigger for automatic profile/tenant creation on signup

## [0.3.0] - 2026-01-28

### Added

- Batch nesting and grouping
- Batch image support
- Batch time tracking with stapelscannen time distribution

## [0.2.0] - 2026-01-21

### Added

- Fuzzy search filtering across Jobs, Parts, Operations APIs
- Shared CRUD builder pattern for edge functions

### Changed

- 87 database migrations
- 15 edge functions refactored to shared CRUD builder

### Removed

- Advanced analytics dashboards (OEE, QRM, quality, reliability)
- Shipping and logistics module
- Integrations marketplace
- Python 3D backend service (replaced by client-side viewer)

### Fixed

- Missing `await` in validation for api-parts and api-operations
- Bulk-sync crash and partial success ghosting
- CORS issues with STEP file viewing
- Security vulnerabilities in react-router-dom

## [0.1.x] - 2025-2026

Initial development releases.
