---
title: Changelog
description: Release history and current maintenance status for Eryxon Flow.
---

## Current Status

The latest stable release is **v0.5.1**, published on May 6, 2026. Web app development on the v0.5.x line is in maintenance mode. **Native Android and iOS apps are now in development** — Android is being built natively with offline support and fast cold start, and iOS is in active development. The hosted version at [app.eryxon.eu](https://app.eryxon.eu) remains online and free to try.

Eryxon Flow is free to use, fork, and adapt under the Business Source License 1.1 terms. The native mobile apps will share the same backend and REST/MCP/MQTT API as the web app.

## v0.5.1 - May 6, 2026

Maintenance hotfix for release metadata and final handoff docs.

### Fixed

- Refreshed stale OpenTrace knowledge graph counts after regenerating the local index
- Aligned the README BSL conversion summary with the repository `LICENSE`
- Marked v0.5.1 as the current maintenance hotfix while preserving v0.5.0 as the final active-development release

## v0.5.0 - May 6, 2026

Final active-development release for self-hosted planning integration and shop floor execution.

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
