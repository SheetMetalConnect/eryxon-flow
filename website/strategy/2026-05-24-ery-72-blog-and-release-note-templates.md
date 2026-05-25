# ERY-72 — Blog-Post & Release-Note Templates (Redesign Slice 3)

Date: 2026-05-24
Owner: Website Engineer
Issue: ERY-72 (Slice 3 of the ERY-53 execution path)
Builds on: ERY-56 foundation (`BaseLayout`/`MarketingLayout`, `tokens.css`, `lib/locale.ts`)
Aligns to: ERY-54 messaging brief, ERY-52 canonical UX spec

## What this slice delivers

Explicit, owned Astro **blog-post** and **release-note** templates on the redesign foundation —
not implied docs variants, and not collapsed back into the legacy Starlight docs shell. Both
editorial surfaces render end-to-end through the redesign shell and reuse the preserved CTA
analytics contract.

### New files

| File | Role |
|------|------|
| `src/content.config.ts` (extended) | Adds `blog` and `releaseNotes` glob collections. Blog: title/description/pubDate/author/tags/`ctaIntent`/relatedLinks/draft. Release notes: version/date/status + **separated** `shipped`/`beta`/`roadmap` arrays + `docsLinks` + `githubUrl` + `ctaIntent`. |
| `src/layouts/EditorialLayout.astro` | Shared editorial chrome on top of `MarketingLayout`: ~760px reading column, back-link, and the `.ery-prose` markdown typography contract. Frame only — surfaces own their header + CTA. |
| `src/components/EditorialCta.astro` | One intent-matched conversion block (`docs` / `trial` / `rollout`) per the ERY-54 CTA-precedence rule. Emits the preserved `data-cta-*` → `website_cta_clicked` contract (ERY-33). Links only to real existing routes. |
| `src/pages/blog/index.astro` | `/blog/` listing, newest-first, drafts excluded. |
| `src/pages/blog/[...slug].astro` | Blog-post template: eyebrow/tags, title, lede, author+date meta, rendered body, intent CTA, related links. |
| `src/pages/release-notes/index.astro` | `/release-notes/` listing with version + date + channel badge. |
| `src/pages/release-notes/[...slug].astro` | Release-note template: version/date/channel header, **shipped vs Beta vs roadmap** groups (status hues, never brand blue), docs proof links, intent CTA, GitHub secondary CTA. |
| `src/content/blog/job-router-traveler-without-paper.md` | Verification fixture — one representative blog post. |
| `src/content/release-notes/v0-6.md` | Verification fixture — one representative release note. |
| `src/content/docs/guides/changelog.md` (cross-link) | Docs changelog now links to `/release-notes/`, keeping release notes anchored in the docs system per ERY-54. |

### Reused, not rebuilt

- `data-cta-*` analytics contract (ERY-33) via every editorial CTA — no new tracking introduced.
- `BaseLayout` locale-correct `<html lang>` + canonical/hreflang SEO and the mounted analytics adapter.
- `tokens.css` design contract directly (light-mode primary, 4px spacing, 12px radius, status hues that never use brand blue).

## Messaging discipline (ERY-54)

- Blog template teaches first, anchors to metalworking job-shop operations, and ends with **one**
  intent-matched CTA (fixture uses `docs`).
- Release-note template enforces the shipped / Beta / dated-roadmap separation, links to setup
  docs, and offers GitHub as the secondary deeper-detail CTA.
- **No freeze / maintenance / "development is on hold" framing** appears on these public surfaces
  (verified by grep over built output). Copy stays truthful about what is live vs Beta vs roadmap.

## Verification (this slice)

- `npm run build` in `website/` → **120 pages built, Complete** (was 110 at the ERY-56 foundation slice).
- Blog post (`/blog/job-router-traveler-without-paper/`): `data-shell="redesign"`,
  `<html lang="en">`, `data-cta-id="blog_article_docs"`, `data-cta-surface="blog_article"`,
  article body rendered.
- Release note (`/release-notes/v0-6/`): `data-status="beta"`, the three separated groups
  ("Shipped — live now", "In Beta", "On the roadmap"), `data-cta-id="release_note_trial"`, and
  `data-cta-id="release_note_github"` secondary CTA all present in output HTML.
- `grep` over built `blog/` + `release-notes/` HTML → **no** freeze/maintenance/"on hold" language.
- `astro check` → **0 errors in any ERY-72 file**. (4 pre-existing errors remain in
  `override-components/Hero.astro` and `user-components/ListCard.astro` — legacy Starlight chrome,
  out of scope here, owned by the Slice 4 docs-chrome migration ERY-61.)

## Handoff / coordination

- Global marketing nav + footer content is **Slice 2 (ERY-60)**. These editorial surfaces use the
  `MarketingLayout` default header/footer; when Slice 2 lands the real nav, `/blog/` and
  `/release-notes/` pick it up automatically (shared layout).
- Docs-chrome migration and retiring the legacy override components (incl. the pre-existing
  `Hero`/`ListCard` type errors) stays scoped to **Slice 4 (ERY-61)**.
- Astro remains the runtime; no docs routes were migrated by this slice.
