---
title: Changelog
description: Release history and current release status for Eryxon Flow.
---

## Current Status

The latest stable release is **v0.5.2**, published on May 9, 2026. Most of Eryxon Flow is still **Beta** — including the web app, REST API, webhooks, MQTT, and the FrePPLe and Odoo planning adapters. The **MCP server is Live**. Native **iOS / iPadOS**, **Android**, and the installable **PWA** shipped in `v0.5.2`. The hosted version at [app.eryxon.eu](https://app.eryxon.eu) remains online and free to try.

Eryxon Flow is free to use, fork, and adapt under the Business Source License 1.1 terms.

Need the historical rollout-oriented summary for the `v0.5.1` hotfix line? Read the [v0.5.1 hotfix proof snapshot](/guides/release-proof-v0-5-1/).

For per-release summaries that separate shipped updates from Beta status and roadmap context, see the [release notes](/release-notes/).

## v0.5.2 - May 9, 2026

Native-device and installable-web release that moved the product posture beyond the `v0.5.1` hotfix line.

### Why it matters

- Adds native iOS / iPadOS and Android shells plus an installable PWA around the existing React app
- Introduces a touch-first `/m/*` route shell for operators across phone, tablet, and installable web runtimes
- Refreshes website and docs status language for the `v0.5.x` line

### Added

- Native iOS / iPadOS app
- Native Android app
- Installable PWA
- Touch-first `/m/*` route shell with queue, scanner, activity timeline, and terminal overview flows

### Changed

- Website and docs status language refreshed across the `v0.5.x` line
- Capacitor plugin line pinned to `7.6`

### Fixed

- Mobile issue tab status mapping
- Mobile login landing route
- MQTT docs example columns

## v0.5.1 - May 6, 2026

Maintenance hotfix for release metadata and handoff docs. It clarified the `v0.5.0` rollout story for self-hosted and integration-heavy shops before `v0.5.2` became current.

### Why it matters

- Keeps the release story aligned with the current [Deployment Guide](/guides/deployment/), [Batch & Nesting Management](/features/batch-management/), and [MCP Server Reference](/api/mcp-server-reference/)
- Separates shipped proof from Beta status and roadmap context
- Adds a buyer-facing historical summary in the [v0.5.1 hotfix proof snapshot](/guides/release-proof-v0-5-1/)

### Fixed

- Refreshed stale OpenTrace knowledge graph counts after regenerating the local index
- Aligned the README BSL conversion summary with the repository `LICENSE`
- Tagged v0.5.1 as the current maintenance hotfix on top of v0.5.0

## v0.5.0 - May 6, 2026

Last web-app feature release before the native mobile push. Adds self-hosted planning integration and shop floor execution hardening.

### Highlights

- Direct-only MCP server for trusted self-hosted deployments, with stdio and Streamable HTTP transports
- Hardened MCP HTTP defaults: loopback binding, bearer auth for public bind, allowed-host protection, and non-root Docker image
- FrePPLe and Odoo planning adapters with pagination, tenant-safe feedback, and quantity/date correctness fixes
- MQTT retry, circuit breaker, dead letter logging, and per-attempt timeout handling
- Docker runtime `/env.js` injection so configuration can change without rebuilding the frontend image
- Batch API and lifecycle hardening for tenant validation and safe operation assignment
- Admin-only tenant export API using Supabase user JWT authorization
- Website documentation is the canonical docs surface for setup, self-hosting, REST API, MCP, and release history

## Full History

- [GitHub release notes](https://github.com/SheetMetalConnect/eryxon-flow/releases)
- [Repository changelog](https://github.com/SheetMetalConnect/eryxon-flow/blob/main/CHANGELOG.md)
