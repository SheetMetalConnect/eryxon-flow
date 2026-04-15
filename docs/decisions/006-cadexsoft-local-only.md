# ADR-006: CADEXsoft MTK integration is local-only

**Status:** Accepted
**Date:** 2026-04-15
**Context:** DevOps, Integration

## Decision

CADEXsoft Manufacturing Toolkit (MTK) is integrated as a **separate container
that binds to loopback by default** (`docker-compose.cadexsoft.yml`, profile
`cadexsoft`), not as a managed cloud service and not as a dependency of the
production Eryxon Flow deployment. The frontend reaches it via
`VITE_CADEXSOFT_URL`, which must resolve to a local or private-network address.

## Context

MTK is a licensed C++ SDK with a Python wrapper. Two constraints rule out a
cloud-first integration:

1. **Licensing.** The license activates against a specific environment; it is
   not architected for horizontally-scaled, ephemeral workers. Spreading it
   across cloud instances would violate the EULA.
2. **Data locality.** CAD files are customer IP. Routing them to a shared
   cloud analyser would pull us into the data-processing scope of every
   customer contract and make self-hosters unhappy for the same reasons.

Additionally MTK analyses are CPU-bound. Co-locating with the user avoids
shipping large CAD blobs across the public internet twice.

## Consequences

**Positive:**
- Self-hosters (the primary audience) get a deployment model that matches
  their existing single-host or private-cluster posture.
- The cloud deployment stays free of licensed C++ binaries and proprietary
  CAD files.
- The service is reversible — it is an opt-in compose overlay, not a schema
  change or a required dependency.
- Stub mode means the frontend integration can be built and reviewed before
  the license arrives.

**Negative:**
- No "turn it on from the SaaS dashboard" story. Operators must obtain a
  license and drop artifacts onto disk.
- Extra operational surface (another container, another health check).
- Cross-host deployments need operators to explicitly override
  `CADEXSOFT_BIND` and secure the network path themselves.

## Alternatives Considered

1. **Host MTK in Supabase Edge Functions.** Rejected — edge functions run on
   Deno in a cloud runtime we do not control. MTK is a C++ wheel; it cannot
   run there. Licensing scope would also be broken.
2. **Build a shared cloud "CAD analysis" microservice.** Rejected on
   licensing and data-locality grounds (see Context).
3. **Use the existing `byob` slot without calling CADEXsoft out specifically.**
   Rejected — CADEXsoft has a concrete, well-defined API surface (DFM,
   sheet-metal, CNC, turning, PMI) that deserves first-class types and a
   dedicated client. Keeping `byob` generic preserves a separate extension
   slot for future third-party services.
4. **Run the Python SDK in-process inside the existing Eryxon3D custom
   backend.** Rejected — Eryxon3D solves a different problem (geometry and
   PMI tessellation) and bundling two licensed C++ stacks into one container
   couples their release cycles and licensing boundaries.
