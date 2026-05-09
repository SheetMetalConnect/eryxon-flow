---
title: Changelog
description: Release history and current maintenance status for Eryxon Flow.
---

## Current Status

The latest stable release is **v0.5.1**, published on May 6, 2026. Most of Eryxon Flow is still **Beta** — including the web app, REST API, webhooks, MQTT, and the FrePPLe and Odoo planning adapters. The **MCP server is Live**. Native **Android** and **iOS** apps are coming soon (Android is being built natively with offline support and fast cold start). The hosted version at [app.eryxon.eu](https://app.eryxon.eu) remains online and free to try.

Eryxon Flow is free to use, fork, and adapt under the Business Source License 1.1 terms. The native mobile apps will share the same backend and REST/MCP/MQTT API as the web app.

## v0.5.1 - May 6, 2026

Maintenance hotfix for release metadata and handoff docs. (Native Android and iOS app development started after this release.)

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
