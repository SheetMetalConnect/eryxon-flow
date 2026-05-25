---
name: eryxon-design
description: Use this skill to generate well-branded interfaces and assets for Eryxon — the job-shop manufacturing product company behind Eryxon Flow (MES) and eryxon.eu. Use for production code, throwaway prototypes, mockups, slides, or any artifact that needs to look like Eryxon. Contains tokens (colors, type, spacing), brand assets (marks, wordmarks, favicon), and UI kits for the three Eryxon surfaces: shop-floor operator tablets (dark), desktop admin (light), and the marketing site (light).
user-invocable: true
---

Read the `README.md` file within this skill, then explore the other available files.

Key files:

- `README.md` — full brand context, content fundamentals, visual foundations, iconography rules. **Read this first.**
- `colors_and_type.css` — the single source of truth for design tokens. Drop in via `<link>` or copy values out for production code. Defines: brand colors (light + dark themes), foreground/background scale, MES status / severity / stage palettes, type scale, operator type scale, spacing, radius, shadow, motion.
- `assets/` — logos, marks, wordmarks. Use `eryxon-mark-flat.svg` inside the product, `favicon.svg` (gradient) for the public web only.
- `preview/` — small reference cards for every token group and component pattern. Open these to see how a thing looks before reaching for it.
- `ui_kits/flow-operator/` — tablet shop-floor screens (dark-mode primary, 56 px touch targets, glanceable from 1 m).
- `ui_kits/flow-admin/` — desktop MES admin screens (light-mode primary, dense tables, sidebar + main).
- `ui_kits/marketing/` — eryxon.eu marketing site (light-mode primary, calm utilitarian, no decorative noise). Includes `social/` for LinkedIn / X / square post templates and `blog/` for long-form article, blog index, and changelog layouts.
- `_source/` — mirrored snippets from the real `SheetMetalConnect/eryxon-flow` and `SheetMetalConnect/eryx-site` repos. Reference material — don't ship these.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy the assets and `colors_and_type.css` into your output folder and create static HTML files for the user to view.

If working on production code, read this skill's contents to become an expert designer for the Eryxon brand — but use the live tokens from `eryxon-flow`'s own `src/styles/design-system.css` as the runtime source of truth in that codebase.

Hard rules — these are load-bearing and you should not break them without checking with the user:

- **Never write "open source"** in Eryxon copy. Use "source-available", "self-hostable", or "BSL 1.1".
- **No gradients** on functional surfaces (buttons, cards, headings). The brand mark's gradient is reserved for the favicon and public-web header only.
- **No glass / backdrop-blur** on cards. The system uses solid surfaces + 1 px borders.
- **No celebratory animation or emoji** in product UI. The work is the reward.
- **Touch targets ≥ 44 px everywhere**, ≥ 56 px on operator screens.
- **Dark mode is primary on the shop floor; light mode is primary on admin and marketing.** Both must always work.
- **WCAG AA minimum.** Brand blue darkens to `#0066cc` on light surfaces for contrast.
- **i18n: EN / NL / DE.** Keep button labels short — the longest locale must still fit the touch target.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some specific questions (which surface — operator / admin / marketing? dark or light? screen mock or full prototype? do they have real content or should we use placeholders?), and then act as an expert designer who outputs HTML artifacts or production code, depending on the need.
