---
# COPY THIS FILE to publish a new article.
#   1. Duplicate _template.md as a new file in this folder, e.g. articles/operator-rollout-in-two-weeks.md
#   2. The filename (without .md) becomes the URL slug: /articles/operator-rollout-in-two-weeks/
#   3. Create the social asset folder: website/public/social/blog/<slug>/
#      Required files: og.png (1200x630), linkedin.png (1200x627), x.png (1600x900), square.png (1080x1080)
#      Workflow brief: website/plans/2026-05-26-ery-228-blog-social-image-workflow.md
#   4. Fill in title + description, write the body, delete these comment lines.
#   5. The article appears automatically in the Articles sidebar group and at /articles/ — no config edits.
#
# Underscore-prefixed files (like this one) are ignored by Astro and never published.
title: Article title — keep it concrete and proof-led
description: One or two sentences. Used for SEO and social previews. Lead with the buyer-relevant outcome, anchored in a shipped capability.
# Optional: hide the right-hand table of contents for short pieces.
# tableOfContents: false
# Required per-article metadata wiring:
# head:
#   - tag: meta
#     attrs:
#       property: og:image
#       content: /social/blog/<slug>/og.svg
#   - tag: meta
#     attrs:
#       name: twitter:image
#       content: /social/blog/<slug>/linkedin.svg
# Optional: set a publish date in the body or rely on Git history until the redesign adds dated metadata (ERY-49).
---

Open with the operator/operations problem, not the product. Who is this for and what hurts today?

## Social image brief

Complete this before publish review:

- Target audience:
- Main claim for `og.png`:
- Main hook for `linkedin.png`:
- Main hook for `x.png`:
- Proof / stat / claim for `square.png`:
- Primary CTA destination:

If bespoke render tooling is blocked, publish with safe default assets in `website/public/social/blog/<slug>/` first, then track custom render upgrades in a separate follow-up issue.

## What changed

Anchor the claim in something real: a shipped feature, a docs reference, a screenshot, or a release note. If you describe Eryxon Flow as open source, tie it explicitly to Apache 2.0 and keep buyer-facing value on rollout control, deployment choice, and support options.

## Proof

Show it. Link to the relevant doc, capability, or changelog entry. Keep "coming soon" as supporting context only — it must not carry the article.

## Where to go next

Close with one clear next step. Reuse an existing CTA destination:

- Try it: [hosted version](https://app.eryxon.eu)
- Talk to us: [Managed Rollout](/managed-rollout/)
