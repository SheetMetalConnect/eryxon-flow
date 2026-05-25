---
title: Changelog
description: Release history and current release status for Eryxon Flow.
---

## Current Status

**v0.6** is the current stable line and installs as a desktop **PWA** from Chrome or Edge on Windows and macOS. Most underlying surfaces are still **Beta** — the web app, REST API, webhooks, MQTT, and the FrePPLe and Odoo planning adapters. The **MCP server is Live**. Native **iOS / iPadOS** and **Android** apps are **in development and not yet released**. The hosted version at [app.eryxon.eu](https://app.eryxon.eu) remains online and free to try.

The last cut git tag is **v0.5.1** (May 6, 2026); the v0.6 line builds on it and has not been separately tagged.

Eryxon Flow is free to use, fork, and adapt under the Apache License 2.0 — it is fully open source.

For per-release summaries that separate shipped updates from Beta status and roadmap context, see the [release notes](/release-notes/).

## v0.6 — stable PWA

v0.6 is the current stable line. The installable PWA is shipped and usable today; install it from
Chrome or Edge on Windows and macOS. The touch-first `/m/*` operator preview ships alongside it.
The native iOS and Android apps are still in development and have not been released — follow them on
the [roadmap](/roadmap/). The v0.6 line builds on v0.5.1 and has not been separately tagged.

## v0.5.1 - May 6, 2026

Maintenance hotfix for release metadata and handoff docs. It clarified the `v0.5.0` rollout story for self-hosted and integration-heavy shops. This is the last cut git tag; the v0.6 line builds on it.

### Why it matters

- Keeps the release story aligned with the current [Deployment Guide](/guides/deployment/), [Batch & Nesting Management](/features/batch-management/), and [MCP Server Reference](/api/mcp-server-reference/)
- Separates shipped proof from Beta status and roadmap context
- Adds a buyer-facing historical summary in the [v0.5.1 hotfix proof snapshot](/guides/release-proof-v0-5-1/)

### Fixed

- Refreshed stale OpenTrace knowledge graph counts after regenerating the local index
- Aligned the README licensing summary with the repository `LICENSE`
- Tagged v0.5.1 as the maintenance hotfix on top of v0.5.0

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
