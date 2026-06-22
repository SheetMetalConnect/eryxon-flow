---
name: foss-blog-changelog
description: Write public blog posts, release notes, and changelog entries for the Eryxon Flow open-source project. Use whenever drafting or editing a website blog post (website/src/content/blog/), a release note (website/src/content/release-notes/), or the root CHANGELOG.md. Triggers on "blog post", "release note", "changelog", "announce a release", "write up vX.Y".
---

# FOSS blog & change notes

Public, open-source writing for Eryxon Flow. Readers are shop-floor owners, operators, and self-hosters — not the dev team. Every word ships to strangers.

## Principles

1. **Lead with intent, not features.** Open with the problem the change solves on a real shop floor, then what it does. "A planner should know where a part goes next" beats "Added current_cell_id column."
2. **Accurate to the CHANGELOG.** The root `CHANGELOG.md` is the source of truth for what shipped. Never claim more than it lists. If it's not released, don't say it is.
3. **No internal/dev chatter.** Never mention PR numbers, branch names, "release candidate", "approval separate from the pull request", CI, code review, or internal process. The reader does not care how the sausage is made.
4. **No competitor names, ever.** A FOSS project has no "competitors" in its copy. Describe what *we* do; never name another product.
5. **Honest about shipped vs planned.** Native apps "in development", not "coming soon". Bugfixes are bugfixes, not "improvements".
6. **FOSS tone.** Apache-2.0, self-hostable, no vendor lock-in, no hype. Confident and plain. Mention the hosted option (https://app.eryxon.eu) as a convenience, not a sales pitch.
7. **Humanized (mandatory).** No AI vocabulary: leverage, utilize, crucial, comprehensive, streamline, robust, delve, landscape, seamless, empower. Max 1 em dash per page. No filler openers ("In today's fast-paced…") or hollow closers ("Stay tuned!"). Short, direct sentences.
8. **Localized cleanly.** Dutch: no Nenglish (vendor→leverancier, stack→techniek, hands-on→praktisch). German: noun capitalization. Technical terms stay: API, MES, ERP, MCP, OEE, UNS, CNC, PWA.

## Files

- Blog post → `website/src/content/blog/<slug>.md` (Astro content collection; valid frontmatter required).
- Release note → `website/src/content/release-notes/<version>.md` (newest renders first at `/release-notes/`).
- Changelog → root `CHANGELOG.md` (Keep-a-Changelog style: `## [x.y.z] — date` with Added/Changed/Fixed).

Use the templates in this skill's `templates/` folder. After editing the website, run `cd website && npm run build` to verify.

## Pre-publish checklist

- [ ] Opens with the user-facing problem/intent, not the implementation.
- [ ] Every claim matches CHANGELOG.md; nothing unreleased stated as shipped.
- [ ] Zero PR numbers, branch names, "release candidate", or process talk.
- [ ] Zero competitor/other-product names.
- [ ] Humanizer pass done (no AI vocab, ≤1 em dash, no filler).
- [ ] Links resolve (hosted app = https://app.eryxon.eu).
- [ ] NL/DE clean (no Nenglish; DE noun caps).
- [ ] `cd website && npm run build` passes.
