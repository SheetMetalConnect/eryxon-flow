# Security Policy

Eryxon Flow is a multi-tenant Manufacturing Execution System. Shops run their
production on it, so we treat security reports with priority.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Instead, use one of these private channels:

- **GitHub private vulnerability reporting** (preferred): use the
  ["Report a vulnerability"](https://github.com/SheetMetalConnect/eryxon-flow/security/advisories/new)
  button on this repository.
- **Email**: luke@sheetmetalconnect.com with the subject line `[SECURITY]`.

Include what you can: affected surface (app, edge functions, MCP server,
website), reproduction steps, and impact. A proof of concept helps but is not
required.

## What to expect

- An acknowledgement within **3 business days**.
- An assessment and remediation plan within **10 business days** for confirmed
  issues; critical issues affecting production auth, tenant isolation, or data
  integrity follow the project's hotfix path and are fixed as fast as possible.
- Credit in the changelog after the fix ships, if you'd like it.

## Scope

In scope:

- The Eryxon Flow application (`src/`), Supabase edge functions
  (`supabase/functions/`), database policies (`supabase/migrations/`), the MCP
  server (`mcp-server/`), and CI/CD workflows.
- Tenant-isolation issues are the highest-priority class — anything that lets
  one tenant read or write another tenant's data.

Out of scope:

- Vulnerabilities in third-party dependencies without a demonstrated impact on
  Eryxon Flow (report those upstream — but feel free to tell us too).
- Issues that require a compromised device or stolen credentials.
- The marketing website's content (typos, broken links — regular issues are
  fine for those).

## Supported versions

Security fixes land on `main` and ship with the active release line (see
`CHANGELOG.md`). Self-hosted deployments should track tagged releases.
