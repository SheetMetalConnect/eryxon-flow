# Eryxon Astro Website Canonical UX Spec

Updated: 2026-05-24
Owner: UX / Principal Product Design

## Purpose

This document turns the external design-system package `Eryxon Design System (1).zip` into an execution-ready spec for the Astro website.

Precedence:

1. The external package is canonical.
2. This document translates that package into website-specific rules and handoff criteria.
3. The current Astro implementation is reference material only and does not win conflicts.

## Canonical Inputs

Use these package files as the design source of truth:

- `README.md`
- `colors_and_type.css`
- `assets/`
- `preview/`
- `ui_kits/marketing/`
- `ui_kits/marketing/blog/`
- `ui_kits/marketing/social/`

## Verified Baseline

Rendered in this run:

- Live Astro source at `http://127.0.0.1:4322/` on desktop and iPhone 13
- Live Astro docs route at `http://127.0.0.1:4322/introduction/` on desktop and iPhone 13
- Canonical marketing kit at `http://127.0.0.1:4323/ui_kits/marketing/index.html` on desktop and iPhone 13

Observed repo reality:

- The live Astro site is dark-first on both homepage and docs.
- The homepage is a long docs-heavy product scroll, not the calmer marketing sequence shown in the canonical kit.
- The docs page uses a separate visual language from the canonical light-mode marketing kit.
- `website/dist` is stale and does not match the current Astro source. Do not use it as a QA or design reference.

## Design Lenses Driving This Spec

- `Cognitive Load`, `Selective Attention`, `Progressive Disclosure`: the homepage must tell one product story at a time and push detailed reference content into docs.
- `Jakob's Law`, `Recognition over Recall`, `Information Scent`: public-site navigation should follow familiar marketing-site patterns, while docs keep clear section labels and visible wayfinding.
- `Gestalt / Common Region`: feature grids and pricing/deployment cards should read as grouped systems, not isolated floating cards.
- `WCAG POUR`, `color-independence`, `motor accessibility`: contrast, focus states, and touch targets are non-negotiable.
- `Doherty Threshold`, `motion & perceived performance`: motion is short and functional only.

## Non-Negotiable Website Rules

### Theme and surfaces

- Public marketing and docs are light-mode primary.
- Dark surfaces are reserved for product preview frames, code/API sections, and code blocks where contrast materially helps.
- No ambient orb backgrounds on the website.
- No glassmorphism, no `backdrop-filter` cards, and no translucent panes as a default treatment.

### Color

- Use light-surface brand blue `#0066cc` for primary website actions and links.
- Use dark-surface brand blue `#1e90ff` only inside intentionally dark sections.
- Use borders for separation first, shadows second.
- Never use brand blue to communicate status.

### Typography

- Sans: Inter.
- Mono: JetBrains Mono for code, pills, technical metadata, and version strings.
- Sentence case only for headings and UI labels.
- No gradient text headings.

### Layout

- 4 px spacing scale only.
- Marketing page padding should step from 16 / 24 / 32 and open up toward large hero sections.
- Default card radius is 12 px.
- Minimum touch target is 44 px across the site.
- Operator previews shown on the marketing site should visually imply 56 px touch comfort.

### Motion

- Use only 120 / 180 / 260 ms durations.
- Hover states tint or border-shift; they do not scale.
- No bounce, no spring, no celebratory motion, no confetti.

### Copy and brand language

- Use calm, precise, operator-respecting copy.
- Use second person and plain technical manufacturing language.
- Eryxon Flow is open source under Apache 2.0. Use `open source`, `Apache 2.0`, or `self-hostable`. Do not use `source-available` or `BSL`.
- No hype terms such as `revolutionary`, `magical`, or `seamless`.
- No emoji in product-facing website UI.
- Brand in body copy is `Eryxon` and `Eryxon Flow`.
- The lowercase wordmark treatment belongs to the mark itself, not to arbitrary body-copy casing.

### Repo visibility guardrail

- Do not put customer names, testimonial identities, pricing figures, contracts, or other commercial details into repo-visible copy or docs.
- The website may reserve layout slots for trust, testimonial, and pricing blocks, but production content for those blocks must be approved and supplied outside GitHub/Linear-visible planning artifacts.

## Allowed System-Level Exceptions

These are acceptable departures from the raw marketing kit because they preserve platform fit without creating a second design system:

- Starlight sidebar and TOC patterns may remain for docs, but must inherit the same token system and header/footer language.
- Code examples may stay dark even when the page chrome is light.
- A homepage product frame may present a dark operator screenshot inside a light marketing page.

## Canonical Information Architecture

### Top-level website model

- `Home`: concise product narrative and conversion path
- `Docs`: reference content and onboarding
- `Guides`: task-oriented education
- `Changelog`: release communication
- `Pricing` or `Deployment options`: layout allowed, commercial content injected later
- `Sign in`
- Primary CTA

### Homepage section order

Use the marketing kit sequence as the canonical page skeleton:

1. Sticky header
2. Hero
3. Product preview frame
4. Feature grid
5. How it works
6. Social proof or proof-of-value block
7. API block
8. Integrations grid
9. Pricing or deployment model block
10. Closing CTA band
11. Footer

Rules:

- The hero is words plus CTA, not a docs search experience.
- The homepage should not try to inline large portions of the documentation IA.
- Deep feature detail, setup steps, API specifics, and roadmap depth belong in docs and guides.

### Docs model

- Keep sidebar + content + TOC.
- Shift docs chrome to light-mode primary so docs feel like the same brand as marketing.
- Keep search in the global header for docs, not as the dominant homepage affordance.
- Docs landing pages should use compact intros, not splash-page theatrics.

## Engineering Handoff For CTO

### Component mapping

Use or create Astro components that map to the canonical kit:

- `Header.astro` → marketing header with sticky border treatment
- `Hero.astro` → text-first hero with dual CTA and trust row
- New sections or equivalents for `ProductFrame`, `FeatureGrid`, `HowItWorks`, `Testimonial`, `ApiBlock`, `Integrations`, `Pricing`, `CtaBanner`
- `Footer.astro` → product-centered footer aligned to the kit
- `PageFrame.astro`, `ContentPanel.astro`, `Sidebar.astro`, `PageSidebar.astro`, `Pagination.astro`, `Search.astro` → restyled docs shell using the same tokens

### Token work

- Import the token model from `colors_and_type.css` into the website styling layer.
- Map Starlight variables to the light-mode token set by default.
- Remove gradient-dependent button and outline treatments.
- Replace blurred, translucent, or orb-based backgrounds with solid surfaces and hairline borders.

### States and behaviors

- Header stays sticky with a 64 px rhythm and hairline separation.
- Primary buttons are solid brand fill on light surfaces.
- Secondary buttons are 1 px bordered, no gradient rims.
- Feature groups use a shared lattice or bordered grid, not disconnected floating cards.
- API block is the main dark section break.
- Footer must read as product/site navigation, not as consulting overflow.

### Files that conflict with the canonical system today

- `website/src/content/docs/architecture/design-principles.md`
- `website/src/content/docs/architecture/design-tokens.md`
- `website/src/content/docs/architecture/design-components.md`
- `website/src/styles/global.css`
- `website/src/styles/button.css`
- `website/src/components/LinkButton.astro`
- `website/src/config/menu.en.json`
- `website/src/components/override-components/Footer.astro`
- `website/src/components/override-components/SiteTitle.astro`

### Engineering acceptance criteria

- Homepage renders in light mode as the default public experience.
- Homepage section order matches the canonical kit unless an approved exception is documented.
- No gradient buttons, gradient heading text, blur cards, or orb backgrounds remain on public website surfaces.
- Docs shell visually belongs to the same brand system as marketing.
- Search is present where useful, but it is not the primary homepage hero pattern.
- Desktop and mobile renders pass visual review before approval.

## Marketing Handoff For CMO

### Copy constraints

- Lead with the operational outcome, not abstract transformation language.
- Keep the hero to one claim, one support paragraph, and two CTAs.
- Use sentence case throughout.
- Keep labels short enough for EN / NL / DE.
- Treat `Beta` and `Coming soon` as status markers, not as recurring homepage decoration.
- Avoid stacking multiple future-looking badges in the hero.

### Content structure

- Trust row: only approved public references; otherwise omit.
- Testimonial block: structure is approved, but the final quote and identity must come through approved public-proof workflow.
- Pricing/deployment block: structure is approved, but no figures live in repo-visible specs.
- Integrations block: show real integration categories or approved public names only.

### IA clean-up required from current site

- Remove consultant-personal framing from the core product homepage.
- Move support, services, and contact content into a deliberate product/company pattern instead of appending them to a docs-heavy scroll.
- `Open Source` footer/resource wording is accurate — Eryxon Flow is Apache 2.0. Keep or pair it with the license name.

## Gap List: Current Repo vs Canonical Package

1. The live Astro homepage is dark-first and visually close to the retired gradient/glass era; the canonical package is light-first and calmer.
2. The homepage currently behaves like a blended marketing page and docs index; the canonical kit separates marketing narrative from reference depth.
3. The current hero includes a large search bar and popular-doc chips; the canonical marketing hero does not.
4. The current docs route is dark-first, while the package defines marketing/docs as light-mode primary.
5. The current architecture docs explicitly document gradients, glass cards, and animated orbs; those motifs are retired.
6. Current button primitives still rely on gradient fills and gradient-border outlines.
7. Current footer/menu config still contains banned `Open Source` wording and product-diluting link clutter.
8. Current wordmark treatment still reflects older branding conventions instead of the canonical Eryxon standard.
9. `website/dist` is stale and should not be used to judge implementation completeness.

## Review Bar

No UX approval without live render checks at real viewports.

Required review set:

- Homepage desktop
- Homepage mobile
- One docs page desktop
- One docs page mobile

Check for:

- visible hierarchy
- consistent spacing
- token compliance
- sentence-case copy
- accessible contrast and focus states
- light-mode primary behavior on public surfaces
- absence of deprecated motifs

## Done Means

This issue is complete when:

- The external package has been translated into concrete website rules.
- CTO has explicit component, token, and state guidance.
- CMO has explicit IA and copy constraints.
- Current repo conflicts are named.
- Approval criteria name the exact viewports that must be rechecked.
