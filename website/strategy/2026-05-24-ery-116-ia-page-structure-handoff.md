# ERY-116 IA and Page-Structure Handoff

Date: 2026-05-24
Owner: UXDesigner
Issue: [ERY-116](/ERY/issues/ERY-116)
Parent: [ERY-54](/ERY/issues/ERY-54)
Program: [ERY-49](/ERY/issues/ERY-49)
Implementation tracks: [ERY-60](/ERY/issues/ERY-60), [ERY-61](/ERY/issues/ERY-61), [ERY-72](/ERY/issues/ERY-72)

## Objective

Translate the shared design-system package into a concrete IA/page map for the Astro public site so CMO can finalize messaging on [ERY-54](/ERY/issues/ERY-54) and engineering can implement without template guesswork.

## Inputs reviewed

Canonical package path:

- `/Users/vanenkhuizen/Documents/GitHub/products/eryxon-flow-test/docs/Eryxon Design System`

Files reviewed from the package:

- `README.md`
- `colors_and_type.css`
- `ui_kits/marketing/README.md`
- `ui_kits/marketing/index.html`
- `ui_kits/marketing/components.jsx`
- `ui_kits/marketing/services.html`
- `ui_kits/marketing/blog/index.html`
- `ui_kits/marketing/blog/post.html`
- `ui_kits/marketing/blog/changelog.html`
- `preview/*` (token and component preview set)

Astro surfaces reviewed for implementation alignment:

- `website/src/pages/index.astro`
- `website/src/pages/blog/index.astro`
- `website/src/pages/blog/[...slug].astro`
- `website/src/pages/release-notes/index.astro`
- `website/src/pages/release-notes/[...slug].astro`
- `website/src/content/docs/introduction.md`
- `website/src/content/docs/managed-rollout.mdx`
- `website/src/components/marketing/SiteHeader.astro`
- `website/src/components/marketing/SiteFooter.astro`
- `website/src/components/EditorialCta.astro`

## Viewport verification in this run

Rendered at desktop and iPhone 13 viewports:

- Package templates via `http://127.0.0.1:4323/`:
  - `/ui_kits/marketing/index.html`
  - `/ui_kits/marketing/blog/post.html`
  - `/ui_kits/marketing/blog/changelog.html`
- Current Astro routes via `http://127.0.0.1:4322/`:
  - `/`
  - `/introduction/`
  - `/blog/`
  - `/release-notes/`

Screenshots captured to:

- `.paperclip-tmp/ery-116-screens/`
- `.paperclip-tmp/ery-116-screens/current/`

## Design-lens rationale

- `Jakob's Law`: keep one predictable global shell across landing, docs entry, blog, and release notes.
- `Hick's Law`: reduce primary choices per surface to one dominant next action.
- `Progressive Disclosure`: move deep technical detail below initial buyer orientation.
- `Recognition over Recall`: keep repeated section labels/structure so users do not re-learn per route.
- `Information Scent`: make each page's next step obvious from header/hero and CTA labels.
- `WCAG POUR`: preserve semantic heading order, focus visibility, and color-independent status meaning.

## Change impact (1st/2nd/3rd order)

- 1st order: this is a strategy artifact only (`website/strategy/`), no runtime code path changes.
- 2nd order: this file sets IA and slot constraints for [ERY-54](/ERY/issues/ERY-54), [ERY-60](/ERY/issues/ERY-60), [ERY-61](/ERY/issues/ERY-61), and [ERY-72](/ERY/issues/ERY-72).
- 3rd order: nav-label and route decisions here cascade into CTA tracking IDs, localized menu models, and docs/marketing cross-link consistency.

## Canonical sitemap and hierarchy

### Tier 1: primary public destinations

- `/` — landing page (buyer orientation + path choice)
- `/introduction/` — docs entry surface
- `/managed-rollout/` — rollout decision surface
- `/blog/` — editorial index
- `/release-notes/` — changelog/release index

### Tier 2: detail templates and decision depth

- `/blog/[slug]/` — article template
- `/release-notes/[slug]/` — release detail template
- `/guides/quick-start/` — self-serve onboarding depth
- `/guides/deployment/` — self-host/deployment depth
- `/guides/self-hosting/` — deployment decision support

## Global navigation mapping (package -> Astro)

| Package nav intent | Astro route target now | Owner | Note |
|---|---|---|---|
| Product | `/#product` (section anchor) | CTO / ERY-60 | Avoids creating a duplicate product route in this phase. |
| Docs | `/introduction/` | CTO / ERY-61 | Docs entry remains explicit and stable. |
| Pricing | `/#pricing` (or dedicated `/pricing/` when approved) | CTO + CMO | `services.html` is template-only; final pricing page scope still open. |
| Guides | `/guides/quick-start/` | CTO / ERY-61 | Use task-oriented entry, not a docs dump. |
| Changelog | `/release-notes/` | CTO / ERY-72 | Label/URL must be intentionally mapped (see gaps). |
| Secondary action | external sign-in (`https://app.eryxon.eu`) | CTO | Keep as low-friction utility action. |
| Primary action | hosted trial CTA | CTO | One primary header CTA only. |

## Page structure and slot inventory

### 1) Landing page (`/`)

Canonical package sequence (non-negotiable order):

1. `Hero`
2. `ProductFrame`
3. `FeatureGrid` (6 items)
4. `HowItWorks` (3 steps)
5. `Testimonial` (+ 2 stats)
6. `ApiBlock`
7. `Integrations`
8. `Pricing`
9. `CtaBanner`
10. Footer

Required content slots:

- eyebrow (ICP framing)
- H1 (single clear outcome)
- short lead (<= 2 sentences)
- trust row
- buyer-path chooser (hosted / rollout / self-host)
- visual product proof cards
- technical proof block (dark section)
- integrations grid with real names
- deployment/pricing comparison
- closing CTA cluster

### 2) Docs entry surface (`/introduction/`)

Required content slots:

- concise product summary (no feature wall)
- explicit 3-path chooser:
  - hosted trial
  - managed rollout
  - self-hosted evaluation
- role-based next links:
  - operator path
  - admin/planner path
  - technical evaluator path
- link-outs to quick start, deployment, and self-hosting

### 3) Blog article template (`/blog/[slug]/`)

Canonical source: `ui_kits/marketing/blog/post.html`.

Required content slots:

- category/eyebrow line
- H1 + lede
- author/date/reading-time metadata
- article body with `h2/h3`, lists, and code blocks
- figure + caption support
- callouts (`info`, `success`, `warning`)
- desktop TOC rail
- share row + up-next slot
- one intent-matched CTA block near the end
- related links block

### 4) Release note template (`/release-notes/[slug]/`)

Canonical source: `ui_kits/marketing/blog/changelog.html`.

Required content slots:

- version/date/channel header
- release summary
- grouped change list with tags:
  - `Added`
  - `Fixed`
  - `Changed`
  - `Removed`
- roadmap context visually separated from shipped changes
- docs proof links
- one intent-matched CTA block
- GitHub full-notes secondary link

## CTA placement matrix

| Surface | Primary CTA | Secondary CTA | Supporting CTA / utility |
|---|---|---|---|
| Header (global) | `Open hosted trial` | `Sign in` | nav links (`Product`, `Docs`, `Pricing`, `Guides`, `Changelog`) |
| Landing hero | `Open hosted trial` | `Plan a managed rollout` | `Review documentation` |
| Landing final band | `Open hosted trial` | `Plan a managed rollout` | `Review documentation` |
| Docs entry | path chooser action per card | `Plan a managed rollout` | `Quick start` / `Deployment` / `Self-hosting` deep links |
| Blog article | intent-driven (`docs` or `trial` or `rollout`) | none by default | related links + share row |
| Release note detail | intent-driven (`docs` or `trial` or `rollout`) | `Full release notes on GitHub` | docs proof links |

## Missing assets, unresolved decisions, package gaps

1. No explicit docs-entry template exists in the package. `marketing` covers landing/blog/changelog, but docs-entry structure is inferred.
Owner: UXDesigner + CMO. Action: approve docs-entry slot model in this handoff.

2. `ui_kits/marketing/services.html` is intentionally placeholder/template content, not production copy.
Owner: CMO. Action: provide approved messaging + pricing/deployment copy source.

3. Testimonial names, trust logos, and pricing figures in package examples are demo/filler and cannot be shipped as-is.
Owner: CMO + CEO. Action: provide publishable proof assets or approve anonymized placeholders.

4. Changelog naming mismatch: package uses `Changelog` label, Astro route is `/release-notes/`.
Owner: CTO + CMO. Action: decide canonical nav label and add alias/redirect if needed.

5. Multi-locale parity gap: package templates are EN-only; current site supports EN/NL/DE docs.
Owner: CMO + CTO. Action: decide phased localization plan for marketing/editorial templates.

6. CTA route hygiene gap: `website/src/components/EditorialCta.astro` uses `/getting-started/introduction/overview/` for trial intent, while current docs entry pattern is `/introduction/` and `/guides/*`.
Owner: CTO. Action: normalize CTA target to a real route before broad editorial rollout.

## Feasibility note (avoidable rework)

- [ERY-60](/ERY/issues/ERY-60): avoid rework by locking global nav labels + route mapping before additional homepage/nav refactors.
- [ERY-61](/ERY/issues/ERY-61): do not merge docs-chrome migration until docs-entry slot model above is adopted, or docs IA will drift from marketing IA.
- [ERY-72](/ERY/issues/ERY-72): keep release-note taxonomy and blog slot schema unchanged (`Added/Fixed/Changed/Removed`, single intent CTA) so content tooling and analytics remain stable.
- Cross-cutting: preserve one CTA tracking contract (`data-cta-*`) across marketing/docs/editorial to prevent attribution drift.

## Implementation handoff (CTO and engineering)

Use this file as the IA acceptance source for implementation tickets.

Acceptance criteria:

1. All four required surfaces (landing, docs entry, blog article, release note detail) follow the slot inventory in this document.
2. Global nav maps intentionally to package intent (not ad-hoc labels per page).
3. CTA hierarchy is consistent per surface and preserves the analytics contract.
4. Shipped vs Beta vs roadmap separation remains explicit on release-note pages.
5. Public copy uses `source-available`/`self-hostable`/`BSL` wording and avoids `open source` claims.

## Final UX disposition for this issue

The IA map, page hierarchy, CTA placement guidance, package gaps, and feasibility notes required by [ERY-116](/ERY/issues/ERY-116) are complete and ready to hand back into [ERY-54](/ERY/issues/ERY-54) for final messaging convergence.
