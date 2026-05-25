# eryxon.eu — Marketing UI kit

Light-mode-primary marketing surfaces — landing page, product
explanations, pricing, footer. Calm, utilitarian, no decorative
illustrations.

## Files

- `index.html` — full landing-page demo (hero → product preview →
  features → how-it-works → testimonial → API block → integrations →
  pricing → CTA banner → footer).
- `components.jsx` — React components (header, hero, sections,
  HowItWorks, Testimonial, Integrations, CtaBanner, footer).
- `styles.css` — marketing layout & component CSS.
- `social/` — six standalone social-post templates (LinkedIn 1200×627,
  square 1080×1080, X 1600×900). Each is a single self-contained HTML
  file using the same brand tokens — ready to render to PNG/JPG for
  publishing.
- `blog/` — three editorial formats: blog index, long-form article
  post, and changelog. Shared `blog.css`.

## What's in this kit

| Component | Purpose |
|---|---|
| `MarketingHeader` | Sticky top nav, brand + 5 nav items + sign-in + primary CTA |
| `Hero` | Centered headline + lead + dual CTA + trust row |
| `ProductFrame` | Browser chrome around a dark-mode operator screenshot — sells the product without a real image |
| `FeatureGrid` | 3 × 2 numbered features inside a hairline grid |
| `HowItWorks` | 3 numbered process steps with integration tags |
| `Testimonial` | Big-quote section with two supporting customer stats |
| `ApiBlock` | Dark-section split: copy + cURL code sample |
| `Integrations` | 4×3 logo grid (real integration names, no fake logos) |
| `Pricing` | 3-tier pricing with one featured tier ("Most shops pick this") |
| `CtaBanner` | Dark closing CTA band with secondary "Self-host" CTA |
| `MarketingFooter` | 4-column footer + legal row |

## Social posts (`social/`)

Single-file, brand-token-driven post templates ready to render to image
for LinkedIn / X / Instagram.

| File | Size | Use |
|---|---|---|
| `linkedin-announcement.html` | 1200 × 627 | Release / version drop / "now available" |
| `linkedin-feature.html` | 1200 × 627 | Feature highlight with embedded product peek |
| `linkedin-quote.html` | 1200 × 627 | Customer quote / testimonial pull |
| `square-stat.html` | 1080 × 1080 | One big number, light treatment |
| `square-claim.html` | 1080 × 1080 | Carousel cover ("Swipe →") |
| `x-changelog.html` | 1600 × 900 | Multi-item release card |

Conventions across the set:

- **Brand mark top-left, URL or tagline bottom-right.** Consistent
  signature.
- **One big idea per post.** No co-promotions.
- **Sentence-case headlines, lowercase wordmark, brand-blue accent.**
- **Mono for version strings + meta tags.**
- **Render via headless screenshot** — every file is a fixed-size
  canvas (`<body>` is the exact post dimensions) so a single-shot
  capture is the export.

## Blog formats (`blog/`)

Three long-form / editorial layouts sharing one stylesheet
(`blog.css`).

| File | Purpose |
|---|---|
| `index.html` | Blog list — sticky header, eyebrow + lead, tabs (with counts), featured post, 3-column grid of post cards |
| `post.html` | Article — eyebrow, h1, lead, author + date + reading-time meta, h2/h3 hierarchy, paragraph copy, ordered/unordered lists, blockquote, image figures with captions, three callout variants (info / success / warning), syntax-highlighted code blocks, share row, "up next" card, sticky TOC sidebar |
| `changelog.html` | Release notes — sticky version + date column, per-release header, Added / Fixed / Changed / Removed tags |

## Design rules in this kit

- **No marketing photography in this kit** — the existing site ships
  `placeholder.jpg` only. The hero shows a *product* preview (operator
  screenshot) instead of stock photos. ⚠ Substitute when real photos
  are provided.
- **The hero is words, not graphics.** A short claim, a short lead,
  two CTAs, a quiet trust row.
- **Feature grid uses a hairline border lattice** rather than card
  shadows — calm, utilitarian, reads as one block.
- **API section is dark** — a one-section colour break that re-uses
  the dark tokens directly.
- **Code samples use the monospace token** (JetBrains Mono).
- **Headlines: sentence case.** Brand: lowercase wordmark, capital E
  in body copy.
- **No "open source" anywhere** — copy uses "source-available",
  "self-hostable", and "BSL 1.1".

## Source

The current eryxon.eu source (`SheetMetalConnect/eryx-site`) is a
small Next.js scaffold with hero / pricing tiers (Bronze / Silver /
Gold) and an industrial palette. **This kit is a forward-looking
redesign** following the user's brief (calm, utilitarian, shadcn-style)
rather than a 1-to-1 recreation. The earlier industrial tier branding
is preserved in `_source/eryx-site/` for reference.
