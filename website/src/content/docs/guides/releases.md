---
title: "Release Notes"
description: "Versioning policy and current release summary for Eryxon Flow."
---

Eryxon Flow currently documents release `0.3.3`.

## Versioning

The project uses Semantic Versioning:

- **MAJOR** for breaking API, database, deployment, or architectural changes
- **MINOR** for backward-compatible features and platform expansions
- **PATCH** for fixes, security hardening, documentation updates, and release stabilization

All upcoming work should land in the website changelog before the next version is tagged.

## Current Release: 0.3.3

### Focus

Release packaging, dependency maintenance, and documentation alignment on top of the integrated security and architecture work delivered in `0.3.2`.

### Highlights

- refreshed non-breaking app and docs dependencies
- aligned package metadata and release labeling to `0.3.3`
- consolidated documentation into the website with updated security and 3D architecture references
- retained the integrated security, API, route-refactor, and 3D viewer work from `0.3.2`

### Operational Notes

- Run database migrations before validating signup and notification flows
- Deploy edge functions in the same rollout window as the schema updates
- Configure the `notify-new-signup` Supabase Database Webhook explicitly for your environment
- Review the changelog entry for `0.3.2` if you are upgrading from `0.3.1` or earlier, because the migration and rollout requirements were introduced there

## Source of Truth

For the full release history, use the website changelog:

- [Changelog](/guides/changelog/)
- [Security Architecture](/architecture/security-architecture/)
- [3D CAD Engine](/architecture/3d-engine/)
