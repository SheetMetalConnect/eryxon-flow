# ERY-281 Production Website Publication Audit

Issue: [ERY-281](/ERY/issues/ERY-281)
Parent: [ERY-280](/ERY/issues/ERY-280)

## Goal

Publish the completed Astro website work that already exists in the repository so `https://eryxon.com` reflects the real Eryxon Flow product story instead of the current placeholder.

## Live production audit

Audit date: 2026-05-27

- `https://eryxon.com/` currently returns a GoDaddy Website Builder placeholder.
- The page title is `eryxon.com`.
- The social description is `Launching Soon`.
- No live production surface currently exposes the shipped Eryxon Flow website copy, docs entry points, changelog, or managed-rollout path.

This means the current production gap is not a small messaging mismatch. The production domain is still pointing at a placeholder instead of the repository website.

## What is already ready in the repo

The repository already contains a publishable Astro website in `website/` with these core buyer-facing surfaces:

- `website/src/content/docs/index.mdx`
  Target audience: first-visit operators, shop owners, evaluators
  CTA: `Open Hosted Version`, `Read the Docs`
- `website/src/content/docs/introduction.md`
  Target audience: docs-first evaluators
  CTA: hosted trial, managed rollout, self-hosted evaluation
- `website/src/content/docs/guides/changelog.md`
  Target audience: technical evaluators validating release credibility
  CTA: release notes, hosted version, roadmap
- `website/src/content/docs/managed-rollout.mdx`
  Target audience: high-intent buyers who want deployment help
  CTA: managed rollout inquiry path

## Publish-now recommendation

Publish the existing Astro website to the production domain immediately, then run a narrow post-publish verification pass on the highest-intent URLs first.

Priority URLs:

1. `https://eryxon.com/`
2. `https://eryxon.com/introduction/`
3. `https://eryxon.com/guides/changelog/`
4. `https://eryxon.com/managed-rollout/`

## Implementation handoff for Website Engineer

Required outcome:

- the production domain resolves to the Astro site in `website/`
- the four priority URLs above render successfully
- the placeholder metadata is gone
- the homepage, docs entry, changelog, and managed-rollout pages are reachable from production navigation

Minimum verification evidence:

- one production screenshot or response capture for `/`
- one production screenshot or response capture for `/guides/changelog/`
- note the exact publish target used
- confirm whether redirects or DNS changes were needed

## Residual content risks after publish

These do not block replacing the placeholder, but they should be reviewed after the real site is live:

- homepage native-app language still needs a tighter pass against the latest shipped proof
- some website copy still uses open-source framing that should stay aligned with the actual license posture and product packaging
- production analytics and CTA routing verification still need a focused implementation and QA pass

## Decision

Do not leave `eryxon.com` on the placeholder while waiting for a larger website polish cycle. The highest-value move is to publish the real site now and iterate on message refinements on the live foundation.
