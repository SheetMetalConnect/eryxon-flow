---
title: "Release Notes"
description: "Versioning policy and current release summary for Eryxon Flow."
---

Eryxon Flow currently documents release `0.3.2`.

## Versioning

The project uses Semantic Versioning:

- **MAJOR** for breaking API, database, deployment, or architectural changes
- **MINOR** for backward-compatible features and platform expansions
- **PATCH** for fixes, security hardening, documentation updates, and release stabilization

All upcoming work should land in the website changelog before the next version is tagged.

## Current Release: 0.3.2

### Focus

Security hardening, API coverage, integrated route refactoring, and 3D viewer measurement planning.

### Highlights

- stronger tenant-aware security and validation paths
- cleaner route and component organization
- expanded API payload documentation and E2E API tooling
- improved release/migration guidance for self-hosted deployments
- integrated 3D viewer measurement architecture and planning
- consolidated documentation into the website with updated security and 3D architecture references

### Operational Notes

- Run database migrations before validating signup and notification flows
- Deploy edge functions in the same rollout window as the schema updates
- Configure the `notify-new-signup` Supabase Database Webhook explicitly for your environment

## Source of Truth

For the full release history, use the website changelog:

- [Changelog](/guides/changelog/)
- [Security Architecture](/architecture/security-architecture/)
- [3D CAD Engine](/architecture/3d-engine/)
