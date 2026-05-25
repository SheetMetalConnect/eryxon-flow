# ERY-56 — Astro Redesign Foundation & Remaining Starlight Coupling

Date: 2026-05-24
Owner: Engineer
Issue: ERY-56 (Slice 1 of the ERY-53 execution path)
Inputs: ERY-52 canonical UX spec (`docs/website/canonical-astro-website-ux-spec.md`), ERY-53 technical brief

## What this slice delivers

A redesign-ready Astro foundation that is cleanly separated from the docs-first Starlight override
approach, without rewriting the working content/locale/analytics plumbing.

### New files

| File | Role |
|------|------|
| `src/styles/tokens.css` | Canonical design-token contract (light-mode primary, `#0066cc`, 4px spacing, 12px radius, 120/180/260ms motion, Inter + JetBrains Mono). Single source of truth for the redesign. |
| `src/lib/locale.ts` | Framework-free locale plumbing (detect / strip / localize / lang). Replaces logic currently copy-pasted across `Analytics.astro`, `RolloutInquiry.astro`, `Head.astro`. |
| `src/layouts/BaseLayout.astro` | Marketing-first HTML document. Owns `<html>/<head>/<body>` directly, mounts the preserved CTA analytics adapter, emits canonical/hreflang SEO, imports the token contract. Independent of Starlight. |
| `src/layouts/MarketingLayout.astro` | Marketing page frame on top of BaseLayout: sticky 64px header, 1200px container, product-centered footer, named `header`/`footer`/`head` slots. Frame only — Slice 2 fills the content. |
| `src/pages/foundation.astro` | `/foundation/` scaffolding smoke route. Proves the shell renders outside Starlight, the token contract applies, and the preserved CTA + rollout hooks still fire. Deletable once Slice 2 promotes the real landing page to `/`. |

### Deliberately preserved (reused, not rebuilt)

- `components/Analytics.astro` — vendor-neutral CTA event contract (ERY-33). Mounted by BaseLayout.
- `components/RolloutInquiry.astro` — managed-rollout inquiry instrumentation. Mounted on the smoke route.
- `data-cta-*` attribute contract on CTAs → `website_cta_clicked`.
- `content.config.ts` collections (`docs`, `i18n`, `ctaSection`) — untouched.
- `config/locals.json` locale model (`en` root, `nl`/`de` prefixed) — encoded in `lib/locale.ts`.

## Source-of-truth precedence (important)

The repo-local mirror `src/content/docs/architecture/design-{principles,tokens,components}.md`
describes the **retired** gradient / glass / orb / dark-first era and is explicitly listed by the
ERY-52 canonical spec as conflicting. **`tokens.css` is derived from the canonical UX spec, not
from that mirror.** ERY-52 owns realigning the mirror; this slice does not edit it.

Open input: the package `colors_and_type.css` binary is not readable from this runtime (per the
ERY-53 brief). Token values the canonical spec states explicitly are marked `[spec]` in
`tokens.css`; the neutral ramp and status hues are sensible light-first defaults marked
`[confirm]` and must be reconciled against the package before public launch.

## Verification (this slice)

- `npm run build` in `website/` → **110 pages built, Complete**.
- `/foundation/` built with `data-shell="redesign"`, `<html lang="en">`, the analytics adapter
  (`window.eryxonTrack`), `data-cta-id="foundation_primary"`, and the `rollout-email-intent`
  hook all present in output HTML.
- `#0066cc` present in the bundled foundation CSS.
- `/introduction/` and the full docs tree still build unchanged.
- Root `/` is still owned by the Starlight docs splash — **no route collision** with the new shell.

## Remaining Starlight coupling (for later slices)

The redesign shell coexists with Starlight today. Starlight still owns all docs routing, the docs
homepage, and the docs chrome. The following coupling must be replaced/migrated by later slices and
is NOT addressed here:

1. **Routing ownership of `/`.** The docs splash (`content/docs/index.mdx`) owns the site root.
   Slice 2 must promote the redesigned landing page to `/` — this requires moving the docs splash
   to a docs path (e.g. `/docs/`) or converting `index.mdx` so `src/pages/index.astro` can take `/`.
2. **Component override map** in `astro.config.mjs` (`Head`, `Header`, `Hero`, `Footer`, `PageFrame`,
   `Sidebar`, `PageSidebar`, `TwoColumnContent`, `ContentPanel`, `Pagination`). These still drive the
   docs presentation and must be re-pointed at token-driven equivalents in Slice 4.
3. **Legacy token stack.** `styles/global.css` + `config/theme.json` still encode the retired
   gradient/glass/orb dark-first tokens and Starlight variable mapping. Slice 4 maps Starlight
   variables onto `tokens.css` (light-mode primary) and retires the gradient/orb CSS.
4. **`Head.astro` duplication.** The Starlight `Head` override re-implements locale detection,
   hreflang, and analytics mounting that now also live in `lib/locale.ts` + `BaseLayout.astro`.
   When docs migrate to the new shell, fold `Head.astro` onto these shared helpers to remove the
   second implementation.
5. **`base.css` / `button.css`.** Tailwind `@apply` rules tied to legacy theme tokens
   (`bg-lightmode-body`, gradient buttons). Marketing surfaces use `tokens.css` directly; the docs
   shell still depends on these until Slice 4.
6. **Navigation models.** `config/menu.*.json` + `config/sidebar.json` serve docs IA. Marketing
   navigation (Slice 2) needs a separate model; reconcile during docs-chrome migration.

## Handoff

- **Slice 2 (Website Engineer, ERY-60):** build the real landing page + buyer-path routes on
  `MarketingLayout`, fill the header/footer slots, and resolve the `/` routing item above.
- **Slice 3 (Website Engineer, ERY-72):** blog-post + release-note templates on `BaseLayout`.
- **Slice 4 (Engineer, ERY-61):** migrate docs chrome onto `tokens.css` and retire items 2–6.
