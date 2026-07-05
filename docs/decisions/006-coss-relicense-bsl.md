# ADR-006: Relicense to the Business Source License 1.1 (COSS model)

**Status:** Accepted
**Date:** 2026-07-05
**Context:** Licensing / Product

## Decision

Relicense Eryxon Flow from Apache 2.0 to the **Business Source License 1.1 (BSL)**,
with a **single-site Additional Use Grant** and a **Change License of GNU GPL v2.0
or later** four years after each version's release. This splits the product into a
free, self-hostable **Community** edition and a commercial **Premium** offering
(multi-site, hosted/managed service, and the commercial add-ons).

## Context

The core code was fully permissive (Apache 2.0), which let any party host the
multi-tenant SaaS features or resell them with no obligation back to the project.
We want a sustainable COSS model: keep a genuinely useful, source-available
Community edition for single-workshop self-hosters (community footprint), while
reserving multi-site, hosting-as-a-service, and high-value add-ons (ERP connectors,
monitoring, the management hub, advanced 3D, whitelabel, SLA) for Premium.

Relicensing is unconstrained here: the sole copyright holder is Sheet Metal Connect
e.U. (all human commits), so no contributor permission is needed to relicense future
versions.

## Consequences

**Positive:**
- Community stays source-available and free to self-host for one site; Premium is
  clearly delineated and sold direct.
- BSL's freeform Additional Use Grant encodes the "single site, no hosting-as-a-service"
  boundary in the license text — the only place it is actually enforceable for
  source-available code.
- Each version auto-converts to GPL v2.0-or-later after four years, so the code is
  never permanently locked.

**Negative:**
- BSL is source-available, **not** OSI open-source; the project can no longer be
  described as "open source" / "FOSS" / "Apache 2.0". All copy was updated accordingly.
- Versions already published under Apache 2.0 remain forkable under Apache in perpetuity
  (irrevocable grant) — immaterial here given no external forks.

## Alternatives Considered

1. **Keep Apache 2.0 (open-core, premium in separate private repos)** — rejected: the
   owner chose to relicense the core rather than keep it permissive.
2. **Functional Source License (FSL)** — rejected: FSL blocks only *competing* commercial
   use; it does not cap a licensee's own multi-site internal use, so it cannot express the
   single-site boundary.
3. **Hard-coded site-limit trigger in the DB** — rejected: trivially removed by any
   self-hoster, hostile to honest Community users, and contrary to the repo's
   "no hard-coded config/limits in source" rule. The boundary lives in the license and in
   the hosted tiers' server-side metering instead.
4. **Fully proprietary core** — rejected: kills the Community self-hosting story the model
   depends on.
