# Eryxon Design System

Design system for **Eryxon** — a product company building software for job-shop manufacturing.
This system covers every Eryxon surface in one shared visual language.

> **Brand note.** Two brand names appear in the source repos: the company /
> product is **Eryxon** (eryxon.eu, Eryxon Flow), the older joint-venture
> services brand is **ERYX**. This system standardises on **Eryxon**. Where
> the legacy ERYX site uses tier branding (Bronze / Silver / Gold), that is
> sales packaging — not a brand color system — and is not surfaced here.

---

## Products in scope

| Surface | Primary device | Default mode | Source |
|---|---|---|---|
| **Eryxon Flow — Operator** | Tablet / shop-floor terminal | **Dark** | [`SheetMetalConnect/eryxon-flow`](https://github.com/SheetMetalConnect/eryxon-flow) |
| **Eryxon Flow — Admin** | Desktop | Light | same repo |
| **eryxon.eu — Marketing / docs** | Desktop | Light | [`SheetMetalConnect/eryx-site`](https://github.com/SheetMetalConnect/eryx-site) |
| **Future Eryxon products** (connectors, UNS tools, visualisers, schedulers) | varies | follows the system | — |

**Eryxon Flow** is the flagship: a Manufacturing Execution System (MES) for high-mix, low-volume job shops — sheet metal, machine shops, custom fabrication. It tracks jobs through cutting, bending, welding, assembly, finishing; runs on touch-friendly operator terminals; and includes a 3D STEP viewer, planning integrations (FrePPLe, Odoo MRP), MQTT/UMH connectivity, and a 30+ endpoint REST API.

> **License copy reminder.** Eryxon Flow is **fully open source under the
> Apache License 2.0**. Say "open source", "Apache 2.0", or "self-hostable".
> Do not describe it as "source-available" or "BSL" — that is no longer true.

### Source repos (browse for deeper context)

The system below was derived from these repositories. The reader of this
README likely **does not** have access to private repos — references are
preserved so anyone who does can deepen the work.

- **`SheetMetalConnect/eryxon-flow`** — flagship MES app (public).
  https://github.com/SheetMetalConnect/eryxon-flow
- **`SheetMetalConnect/eryx-site`** — legacy ERYX marketing site (private).
  https://github.com/SheetMetalConnect/eryx-site

Local mirrors of the relevant source files are in `_source/` for offline
inspection. Anything in `_source/` is reference material, **not** part of the
delivered system.

---

## Content fundamentals

The Eryxon voice is **calm, precise, and operator-respecting**. It reads
like good documentation, not marketing.

- **Person.** Direct, second person ("you", "your shop"). The product never
  refers to itself in the first person — no "I'll help you…", no chatty
  framing. Speak _about_ the work, not _from_ the software.
- **Voice.** Industrial and technical. The reader knows their domain;
  don't over-explain manufacturing terms. Use **WO-**, **PN-**, **NCR**,
  **WIP**, **cell**, **routing**, **operation** as first-class vocabulary.
- **Headings.** Sentence case. Never title case. Never ALL CAPS except
  for short status badges (`OVERDUE`, `TODAY`, `SOON`) and stage codes.
- **Tone in error states.** Plain and accurate. Tell the operator what
  went wrong and what to do — never apologise. _"Time entry already open
  for this part. Stop it before starting a new one."_ — not _"Oops!"_
- **No celebration.** No 🎉, no confetti, no "Great job!". Completing an
  operation reduces a counter; that is the reward.
- **Numbers and units.** Always show units (`12h`, `4.5h`, `200 pcs`,
  `Ø 12 mm`). Decimals: `1.5h` not `1,5h` in English; `1,5 h` in NL/DE.
  Currencies follow locale. Time in 24h.
- **Casing of brand names.** **Eryxon** (capital E only). **Eryxon Flow**
  (both capitalised). The mark/wordmark uses all-lowercase _eryxon_ as
  shown in the wordmark SVGs — the company name remains capital E in
  body copy.
- **Emoji.** Not used in product UI. Allowed sparingly in changelog
  bullets and internal docs (`✓`, `→`) but the system has no emoji set.
- **Internationalisation.** EN, NL, DE. Avoid idiom. Keep button labels
  ≤ 2 words where possible — the longest of the three locales must still
  fit the touch target.
- **Prohibited copy.**
  - "Source-available" / "BSL" → Eryxon Flow is open source (Apache 2.0); say so.
  - "Revolutionary", "seamless", "magical", "delightful" → cut.
  - "Powered by AI" → say what it does instead.

**Examples**

| ✗ Don't | ✓ Do |
|---|---|
| Awesome! Job created 🎉 | Job WO-4218 created. |
| Oops, something went wrong | Time entry already open on PN-902 — stop it first. |
| Our revolutionary platform unifies your shop floor. | Track jobs across cutting, bending, welding, and assembly from one tablet. |
| Proprietary MES, license per seat | Open-source MES for fabricators. Self-host for free or use the hosted version. |
| Welcome back, John! Ready to crush some jobs? | Hi John. 4 operations on your queue. |

---

## Visual foundations

Eryxon's surfaces are **utilitarian first**. Decoration is removed; type,
hierarchy, and color do the work. The Flow operator screens in particular
are read from ~1 metre under shop-floor lighting — every visual decision
optimises for **glanceability and durability**, not delight.

### Deliberate departures from the existing codebase

The current Eryxon Flow CSS (`_source/eryxon-flow/src/styles/design-system.css`) carries some 2024-era motifs the brief asks us to retire across the brand going forward:

- ✗ Animated radial gradient orbs in the page background.
- ✗ Glass-morphism cards (`backdrop-filter`) on every surface.
- ✗ Gradient buttons (`linear-gradient(135deg, …)`) for primary actions.
- ✗ Gradient text headings.

This system replaces all of the above with **solid surfaces, hairline
borders, and flat fills**. The change is intentional. Components built
against the tokens here will look noticeably calmer than today's app —
that is the goal.

### Colors

- **Brand: Eryxon blue.** Dark mode `#1e90ff` (HSL 211 100% 56). Light
  mode `#0066cc` (HSL 211 100% 38) — deeper to maintain WCAG AA contrast
  on white. Used for: primary actions, links, focus rings, selected
  states, brand mark. Never used for status indication.
- **Backgrounds.** Dark = `#0a0a0a` app, `#141414` card, `#1f1f1f`
  elevated. Light = `#ffffff` app, white card with 1px border (no
  shadow-on-shadow stacking).
- **Foreground scale.** Three steps only: `--fg` / `--fg-muted` /
  `--fg-subtle`. Don't invent extras.
- **Semantic feedback.** Green / amber / red / cyan — used in alerts,
  status bars, validation. Same hues across both themes, saturation
  adjusted per theme for contrast.
- **MES domain colors** (status / severity / stage) live in their own
  token family so they don't collide with semantic feedback. See the
  Colors / "MES status" cards in the preview.
- **No gradients on functional surfaces.** The brand mark keeps its
  blue→cyan gradient on the public web only (favicon, marketing
  header). Inside the product, the flat `eryxon-mark-flat.svg` is
  preferred.
- **Imagery temperature.** When photography is used (marketing only):
  cool, slightly desaturated, no warm-orange grading. Subjects are
  metal, machinery, and people working — no abstract stock.

### Typography

- **Sans:** Inter (400 / 500 / 600 / 700). Inter is the existing pick
  in `package.json` (`@fontsource/inter`). Loaded from Google Fonts in
  the previews — **substitute with self-hosted `@fontsource/inter` in
  production** to honour CSP. No font files are bundled in this design
  system folder; flag if you need TTFs vendored.
- **Mono:** JetBrains Mono (400 / 500). The codebase declares
  `SF Mono / Monaco / …` as a stack — we promote JetBrains Mono as the
  webfont anchor so non-Apple devices match the look. Substitute
  flagged ⚠ — confirm with brand owner before shipping.
- **Scale:** Major Second (1.125). See `colors_and_type.css` lines
  `--text-xs` … `--text-6xl`.
- **Operator scale.** A second, larger scale applies inside
  `.operator-surface`: 16 → 20 → 32 px instead of 14 → 16 → 24. Touch
  targets are ≥ 56 px (above the 44 px WCAG floor).
- **Heading case.** Sentence case throughout. `tracking-tight` (-0.02em)
  for h1/h2 — Inter benefits from a slight squeeze at large sizes.
- **Numerals.** Use `font-feature-settings: 'tnum'` for tabular numbers
  in tables, timing readouts, counters. (Helper class
  `.font-tabular`.)

### Spacing & layout

- **4 px base.** Tokens at 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.
- **Page padding.** Operator: 16 px on tablet portrait, 24 px on
  landscape. Admin: 24 px. Marketing: 16/24/32 fluid → 96 px on hero
  sections.
- **Card padding.** 12 px (`--space-3`) on compact lists, 16 px
  (`--space-4`) standard, 24 px (`--space-6`) for hero / settings
  cards. From the Flow `card.tsx` source: `p-3 sm:p-4`.
- **Touch targets.** Operator floor is 56 px (`--touch-comfortable`).
  Never go below 44 px anywhere in the system.
- **Layout primitives.** CSS Grid for app shells (sidebar + main).
  Flex with `gap` for everything inline. No floats, no negative margins.
- **Fixed elements.** Operator: bottom action bar fixed
  (`OperatorFooterBar`-style). Admin: sidebar 240 px collapsed, 280 px
  expanded; top app header 56 px. Marketing: sticky header 64 px with
  hairline bottom border on scroll, no shadow.

### Borders, corners, elevation

- **Corners.** Compact: 4 / 6 / 8 / 10 / 12 / 16 px. **12 px is the
  card default.** Pills (`--radius-full`) are reserved for badges and
  avatars.
- **Borders.** 1 px hairline. Dark uses `--border` = 22% light;
  light uses 90% light. **Borders carry separation, not shadows.** A
  light-mode card has `border: 1px solid var(--border)` + `shadow-sm` at
  most. Never both a heavy shadow and a strong border.
- **Shadows.** 5-step scale, theme-aware (heavier in dark).
  `--shadow-sm` is the default card lift. `--shadow-lg`+ is reserved for
  popovers / dropdowns. Modal backdrops use a 60% black overlay, no
  blur on the modal itself.
- **No glass / blur.** `backdrop-filter` is **off** for the system.
  Saves GPU on cheap shop-floor tablets and reads cleaner.

### Motion

Calm, short, functional. Three durations: 120 / 180 / 260 ms with a
single ease curve (`cubic-bezier(0.4, 0, 0.2, 1)`).

- **Hover.** Background tints up one step (e.g. `--surface` →
  `--surface-hover`). No transforms, no scale-on-hover.
- **Press.** Brightness drops 4 %, no shrink animation.
- **Enter/exit.** Fade + 4 px translate for modals, popovers,
  toasts. No bounce, no spring.
- **No celebratory animation.** Completing a job ticks a counter and
  removes the card — that is the feedback.
- **Loaders.** `Loader2` from Lucide, spinning at 1.2s linear. No
  skeleton shimmer (too distracting on a shop-floor terminal); use a
  static `bg-surface-2 rounded animate-pulse` block at 50% opacity max.

### Transparency

Used sparingly:

- Alert backgrounds: 8–10% brand colour tint.
- Selected nav item (dark): 12% white.
- Hovered nav item (dark): 6% white.
- Modal scrim: 60% black.
- That is the entire list. No translucent cards, no see-through
  sidebars.

---

## Iconography

Eryxon uses **[Lucide](https://lucide.dev)** (the `lucide-react` package,
already a dependency in `eryxon-flow`). Lucide is a feather-style 24×24
line icon set, 1.5 px stroke, rounded caps and joins — matching the calm
utilitarian voice.

- **Default size:** 16 px in dense UI (tables, badges), 20 px in
  buttons, 24 px in nav, 32 px in empty-states.
- **Stroke width:** 1.5 px (the Lucide default — do not override).
- **Color:** Inherits `currentColor` from the parent's `color`. Status
  icons override (`text-status-blocked`, `text-severity-high`, etc).
- **No filled icons.** Outline only. The two exceptions baked into the
  current product: `Loader2` (spinner) and `Pin` (when a row is pinned).
- **SVG vs PNG.** Always SVG. The only raster asset in the system is
  `favicon.ico` for legacy browsers. No PNG icons anywhere.
- **No emoji.** Never used as iconography. If a domain concept lacks a
  Lucide icon, compose two Lucide icons (e.g. `Wrench` + `AlertTriangle`)
  rather than reaching for emoji.
- **No icon fonts.** Lucide is imported as React components or as raw
  SVG. The marketing site can use a CDN copy: `https://cdn.jsdelivr.net/npm/lucide@latest`.
- **Brand mark.** `assets/eryxon-mark-flat.svg` (flat blue — for product
  chrome) or `assets/favicon.svg` (gradient — for the public web /
  favicons). Wordmarks: `eryxon-wordmark-dark.svg` /
  `eryxon-wordmark-light.svg`.
- **Stage / cell colours** are **not** icons. They are 4-px dots or
  pills with the cell name. Never draw a unique icon per cell.

> ⚠ **Flagged substitution: JetBrains Mono.** The codebase doesn't
> currently ship a mono webfont; it falls back to system SF Mono /
> Monaco. We pick JetBrains Mono as the system default so the look is
> consistent on non-Apple shop-floor tablets. **Please confirm or send a
> replacement TTF.**

> ⚠ **Flagged substitution: marketing photography.** No real
> photography ships with these repos — `placeholder.jpg` only. The
> marketing UI kit uses a generic placeholder block. **Please provide a
> short library of shop-floor photos** (cool tone, ~ 16:9, ≥ 2000 px
> wide) for the hero and feature blocks.

---

## Project layout — file index

```
.
├── README.md                       — this document
├── SKILL.md                        — agent-skill entrypoint (Claude Code compatible)
├── colors_and_type.css             — single source of truth for tokens
├── assets/                         — logos, marks, wordmarks
│   ├── eryxon-mark-flat.svg          flat brand mark (preferred in product)
│   ├── eryxon-mark-light.svg         flat brand mark for light surfaces
│   ├── eryxon-wordmark-dark.svg      wordmark + mark, on dark
│   ├── eryxon-wordmark-light.svg     wordmark + mark, on light
│   ├── eryxon-flow-banner-dark.svg   legacy "ERYX.ON FLOW" banner (kept for ref)
│   └── favicon.svg                   gradient mark — favicon / public web only
├── fonts/                          — (none vendored; Inter + JetBrains Mono via Google Fonts; see flag)
├── preview/                        — design system cards (rendered on the Design System tab)
│   ├── type-*.html
│   ├── colors-*.html
│   ├── spacing-*.html
│   ├── component-*.html
│   └── brand-*.html
├── ui_kits/
│   ├── flow-operator/              — tablet shop-floor UI kit (dark)
│   │   ├── README.md
│   │   ├── index.html
│   │   └── *.jsx
│   ├── flow-admin/                 — desktop admin UI kit (light)
│   │   ├── README.md
│   │   ├── index.html
│   │   └── *.jsx
│   └── marketing/                  — eryxon.eu marketing UI kit
│       ├── README.md
│       ├── index.html              — full landing (hero, features, how-it-works,
│       │                             testimonial, API, integrations, pricing,
│       │                             CTA banner, footer)
│       ├── social/                 — social post templates
│       │   ├── linkedin-announcement.html  (1200×627)
│       │   ├── linkedin-feature.html       (1200×627 · product peek)
│       │   ├── linkedin-quote.html         (1200×627 · customer quote)
│       │   ├── square-stat.html            (1080×1080 · big stat, light)
│       │   ├── square-claim.html           (1080×1080 · carousel cover)
│       │   └── x-changelog.html            (1600×900 · release card)
│       └── blog/                   — long-form / editorial formats
│           ├── index.html          — blog list (featured + 3-col grid + tabs)
│           ├── post.html           — article with TOC, callouts, code, figures
│           └── changelog.html      — release notes (Added / Fixed / Changed / Removed)
└── _source/                        — mirrors of source repos (reference only)
    ├── eryxon-flow/
    └── eryx-site/
```

---

## Quick links

| Task | Where to look |
|---|---|
| "What blue do we use?" | `colors_and_type.css` → `--brand`, or `preview/colors-brand.html` |
| "What's the font?" | This README → Typography, or `preview/type-specimen.html` |
| "What are the status colours?" | `preview/colors-mes-status.html` |
| "What does a button look like?" | `preview/component-buttons.html` |
| "Show me a real operator screen" | `ui_kits/flow-operator/index.html` |
| "Show me the admin app" | `ui_kits/flow-admin/index.html` |
| "Show me the marketing site" | `ui_kits/marketing/index.html` |
| "Can I download this as a Claude Code skill?" | `SKILL.md` |

---

## Caveats & open questions

See the end of this conversation for the running list. Headline items:

1. **JetBrains Mono is a proposed substitution** — no mono webfont in
   the source repos. Confirm or replace.
2. **Marketing photography is missing** — placeholder blocks used.
3. **The light-mode admin treatment is partially extrapolated** —
   `_source/eryxon-flow/src/styles/design-system.css` defines light-mode
   tokens, but most operator-facing screens are exercised in dark. The
   light kit follows the tokens; please review.
4. **"Calm UI" departs from the current Flow visual** — gradient
   backgrounds, glass cards, and gradient buttons in the source are
   intentionally **removed** here. Confirm direction.
