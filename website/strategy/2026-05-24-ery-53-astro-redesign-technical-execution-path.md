# ERY-53 Astro Website Redesign Technical Execution Path

Date: 2026-05-24
Owner: CTO
Issue: ERY-53

## Executive Decision

Keep `website/` on Astro, but do not treat the current Starlight-first shell as the long-term website architecture.

The fastest low-regret path is a staged rebuild:

1. preserve Astro, content collections, and working CTA/instrumentation utilities
2. replace the current Starlight-driven marketing shell and design tokens with explicit landing-page, blog-post, and release-note templates
3. migrate docs-entry surfaces and shared chrome into the new design system after UX and messaging handoff land

This keeps the team on the existing deployment/runtime path while avoiding a full rewrite of content plumbing that already works.

## Current-State Audit

### What exists today

- `website/` is a standalone Astro app using `@astrojs/starlight` plus custom override components in `website/src/components/override-components/`
- the site is documentation-first, not marketing-first:
  - 50 docs content files under `website/src/content/docs/`
  - 20 Starlight override components
  - no `src/pages/` marketing-route structure today
  - no custom layout system outside the Starlight shell
- current content/data plumbing already works:
  - locale config in `website/src/config/locals.json`
  - docs and i18n content collections in `website/src/content.config.ts`
  - CTA content collection in `website/src/content/sections/`
- there is no dedicated Astro blog-post or release-note template structure today:
  - no `website/src/pages/` marketing or editorial route layer exists yet
  - the closest existing release surface is `website/src/content/docs/guides/changelog.md`, which still points readers to GitHub release notes
- existing conversion plumbing should be preserved:
  - `website/src/components/Analytics.astro`
  - `website/src/components/RolloutInquiry.astro`
  - CTA tracking attributes in `website/src/components/LinkButton.astro`, `website/src/components/user-components/Button.astro`, and footer/menu surfaces

### What the current architecture is optimized for

- Starlight docs navigation and docs pages
- sidebar-driven documentation IA
- a docs splash homepage with product marketing mixed into docs content
- themefisher-inspired theme tokens and component styles

### What the redesign requires that the current architecture does not provide

- a canonical external design system as the source of tokens, spacing, components, and motion
- marketing-first routing and information architecture
- explicit responsive behavior defined by the external package instead of the current theme overrides
- a clean separation between reusable content/data plumbing and replaceable presentation chrome

## Canonical Artifact and Working Mirror

### Operational decision

- keep the parent attachment `Eryxon Design System (1).zip` on [ERY-49](/ERY/issues/ERY-49) as the immutable canonical archive
- use the repo-local markdown docs below as the shared working mirror for UX and engineering execution:
  - `website/src/content/docs/architecture/design-principles.md`
  - `website/src/content/docs/architecture/design-components.md`
  - `website/src/content/docs/architecture/design-tokens.md`
- treat `website/dist/architecture/` as derived preview output only, not as the authoring or implementation source of truth

### Why this path

- the raw ZIP path previously referenced from `/Users/vanenkhuizen/Downloads/` is still not readable from this execution runtime, so vendoring that binary is not the cleanest current path
- the repo-local markdown already captures the design principles, token rules, and component guidance engineers need for implementation slices
- keeping the working mirror in source control gives UX and engineering the same diffable reference without adding binary churn to the repo

### Coordination rule

- [ERY-52](/ERY/issues/ERY-52) owns keeping the repo-local working mirror aligned with the canonical parent attachment whenever UX updates the design bible
- [ERY-49](/ERY/issues/ERY-49) should remain blocked until UX, messaging, and engineering are all operating from this same source set

## Reuse vs Rebuild

### Reuse

- Astro runtime, package, and deployment path
- content collections in `website/src/content.config.ts`
- localized docs content and i18n assets, unless ERY-54 changes copy/IA
- existing screenshots and static assets that still match the new visual system
- CTA analytics adapter and rollout inquiry behavior
- any route-safe utility code under `website/src/lib/`

### Rebuild

- `website/astro.config.mjs` component override map as the primary shell strategy
- most of `website/src/components/override-components/`
- current theme token stack in `website/src/styles/global.css` and `website/src/config/theme.json`
- docs-first homepage/content entry composition in `website/src/content/docs/index.mdx`
- footer/header/navigation chrome tied to the current Starlight IA

### Treat as conditional

- `website/src/components/CTA.astro` and homepage sections:
  preserve only the event semantics and content hooks, not the visual implementation
- sidebar/menu config:
  preserve structure where it still maps to docs IA, but expect marketing navigation to move to a separate model

## Architecture Recommendation

### Recommended target shape

Build the redesigned site as two coordinated layers inside the existing Astro app:

1. **Design-system layer**
   shared tokens, primitives, layouts, and section components derived from the external package plus UX handoff

2. **Content layer**
   marketing pages, docs-entry pages, localized content, CTA content, and existing documentation collections

### Routing stance

- add explicit marketing routes/pages instead of forcing the redesign through Starlight overrides only
- treat the landing page, blog post template, and release note template as first-class Astro surfaces instead of implied docs variants
- keep documentation content operational during the transition
- redesign the public front door first, then migrate docs chrome and entry pages into the same system

This sequencing protects time-to-first-user-value and reduces lock-in to the current docs-shell assumptions.

## Execution Slices

### Slice 0: Canonical inputs and readiness gate

Owner:
- UXDesigner on [ERY-52](/ERY/issues/ERY-52)
- CMO on [ERY-54](/ERY/issues/ERY-54)

Needed before implementation starts:
- external design package translated into concrete tokens, components, states, responsive rules, and prohibited deviations
- messaging and IA handoff for homepage, primary nav, buyer paths, blog/release-note framing, and docs-entry framing

### Slice 1: Astro shell and token foundation

Recommended owner:
- Engineer

Scope:
- introduce redesign-ready page/layout structure
- isolate reusable content plumbing from current Starlight-specific presentation
- establish the token/theme contract that maps the external design package into Astro
- preserve analytics and rollout inquiry hooks during refactor

### Slice 2: Landing-page template and buyer-path routes

Recommended owner:
- Website Engineer
- Engineer if the website specialist becomes unavailable again before execution begins

Scope:
- rebuild the homepage/landing-page template and key marketing/decision surfaces against the new design system
- integrate CTA routing, analytics semantics, and localized content
- implement the new public information architecture supplied by CMO and UXDesigner

### Slice 3: Blog post and release-note templates

Recommended owner:
- Website Engineer

Scope:
- introduce explicit Astro templates and route/content-model wiring for blog posts and release notes
- align editorial surfaces with the approved design-system primitives instead of treating them as docs-only overflow pages
- preserve any shared analytics, CTA, and locale-safe plumbing needed by those templates
- provide the smallest verification fixture needed to prove one blog-post surface and one release-note surface can render on the redesign foundation

### Slice 4: Docs-entry and shared chrome migration

Recommended owner:
- Engineer

Scope:
- migrate header, footer, docs entry pages, and shared page chrome into the new design system
- preserve docs content availability while aligning docs entry surfaces with the redesign
- keep locale behavior and content collections intact

### Slice 5: Verification and release readiness

Recommended owner:
- Engineer for implementation verification
- manual reviewer path required because no QA agent is currently available

Scope:
- `npm run build` inside `website/`
- responsive smoke check on homepage, managed-rollout path, docs intro, and one deep docs page per locale
- CTA event contract verification for hosted, docs, GitHub, and rollout flows

## Ownership Decision

Use **Engineer** for foundation and docs-preservation slices, with **Website Engineer** owning the public-template implementation slices.

Reasoning:

- the foundation and docs-preservation work still crosses architecture, content plumbing, and shell migration, which is the best fit for Engineer
- `Website Engineer` is now back in `idle` status and is the better specialty match for landing-page plus editorial template implementation
- if `Website Engineer` regresses before Slice 2 or Slice 3 begins, Engineer can absorb those slices without changing the overall plan

## Blockers and Risks

### Active blockers

- [ERY-52](/ERY/issues/ERY-52): engineering still needs the external package translated into concrete design rules
- [ERY-54](/ERY/issues/ERY-54): engineering still needs final homepage/IA/message direction

### Execution risks

1. The canonical design-system ZIP remains outside the checked-out workspace runtime, so any future design updates must be mirrored into the repo-local markdown source before implementation starts.
2. The current site is tightly coupled to Starlight overrides, so trying to restyle in place without introducing a new shell would increase drift risk.
3. `Website Engineer` is available again, but this is the first redesign planning pass after earlier instability, so Engineer remains the fallback owner if specialist availability regresses.
4. There is no dedicated QA agent yet, so verification must be explicitly planned as manual engineering evidence until that gap is filled.

## Child-Issue Plan

1. Engineer foundation issue:
   create the redesign-ready Astro shell and token/layout foundation after ERY-52 and ERY-54 resolve.
2. Website Engineer landing-template issue:
   build the landing-page template, CTA integrations, and public buyer-path routes on top of that foundation.
3. Website Engineer editorial-template issue:
   build explicit blog-post and release-note templates on the redesign foundation without collapsing them back into the legacy docs shell.
4. Engineer docs/chrome issue:
   migrate docs-entry surfaces and shared chrome while preserving docs content availability.

These child issues should carry first-class blockers instead of waiting on comments or polling.

## Smallest Convincing Verification

This issue is complete when all of the following exist:

- a written repo-local execution brief
- child issues with owners and blockers
- explicit ownership for landing-page, blog-post, release-note, and docs-preservation slices
- a named validation plan for the first implementation pass
