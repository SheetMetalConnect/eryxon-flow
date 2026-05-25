# ERY-9 CTA Instrumentation and Managed Rollout Inquiry Routing

Date: 2026-05-24
Owner: CTO
Issue: ERY-9

## Objective

Create the lightest technical foundation for Eryxon's first measurable website conversion path without sending the wrong visitors into the wrong workflow.

This note answers three questions:

1. Which website and docs-entry CTAs should be instrumented first?
2. What is the safest inquiry path for managed rollout and consulting conversations?
3. What source context can be preserved today, and where does that break down?

## Decision Summary

### Recommendation 1: Use one shared click event plus stable CTA ids

Implement a single event name:

- `website_cta_clicked`

Send it with stable properties:

- `cta_id`
- `surface`
- `locale`
- `source_page`
- `target_url`
- `target_kind` (`hosted_app`, `docs`, `github`, `email`, `external_site`, `rollout_page`)

This is the lightest useful instrumentation model because it avoids creating a separate analytics schema for every button while still letting marketing compare surfaces and intents.

### Recommendation 2: Do not route managed-rollout interest into hosted signup

The hosted app signup flow creates a tenant and trial immediately. That is appropriate for product exploration, but it is the wrong default for:

- managed rollout questions
- ERP integration scoping
- consulting-led deployment conversations

Those visitors need a conversation path, not a self-serve tenant.

### Recommendation 3: Add a first-party managed-rollout inquiry page, then open email from there

The lightest-weight inquiry route is:

1. Website CTA sends visitors to a first-party rollout page on `eryxon.eu`
2. That page explains when to choose hosted trial, managed rollout, or self-hosted evaluation
3. The page's primary inquiry action opens `mailto:office@vanenkhuizen.com`

Why this is the right first step:

- it keeps rollout leads out of the app signup funnel
- it gives marketing a link they can reference safely
- it creates one page that can hold the commercial framing and expectations
- it can be implemented inside the existing website without new SaaS dependencies

The page should become the destination for rollout-oriented CTAs before any form or CRM work exists.

## Current-State Findings

### Existing CTA surfaces already live in the repo

Homepage and splash surfaces:

- `website/src/components/override-components/Hero.astro`
- `website/src/content/docs/index.mdx`
- `website/src/content/docs/de/index.mdx`
- `website/src/content/docs/nl/index.mdx`
- `website/src/components/CTA.astro`
- `website/src/components/override-components/Footer.astro`

Docs-entry surfaces:

- `website/src/content/docs/introduction.md`
- `website/src/content/docs/de/introduction.md`
- `website/src/content/docs/nl/introduction.md`
- `website/src/content/docs/guides/quick-start.md`
- `website/src/content/docs/guides/deployment.md`
- localized quick-start pages should be treated as follow-on coverage

### Current destinations

Today the primary public exits are:

- hosted app: `https://app.eryxon.eu`
- documentation pages
- GitHub
- `mailto:office@vanenkhuizen.com`
- `https://www.vanenkhuizen.com/`

There is no analytics layer in the website today and no dedicated rollout inquiry route.

## CTA Scope for Phase 1

### Track these CTA ids first

#### Homepage and splash

| CTA ID | Surface | Current destination |
| --- | --- | --- |
| `hero_hosted_pill` | global splash hero pill in `Hero.astro` | hosted app |
| `home_hero_primary_hosted` | homepage hero primary action | hosted app |
| `home_hero_secondary_docs` | homepage hero secondary action | docs intro |
| `home_final_primary_hosted` | homepage final CTA cluster primary action | hosted app |
| `home_final_secondary_quickstart` | homepage final CTA cluster quick-start action | quick-start guide |
| `home_final_secondary_github` | homepage final CTA cluster GitHub action | GitHub |
| `home_cta_band_primary_hosted` | CTA section primary button | hosted app |
| `home_cta_band_secondary_quickstart` | CTA section secondary button | quick-start guide |
| `footer_resources_hosted` | footer resources column | hosted app |
| `footer_contact_email` | footer contact column | email |
| `footer_contact_consulting_site` | footer contact column | external consulting site |

#### Docs-entry

| CTA ID | Surface | Current destination |
| --- | --- | --- |
| `docs_intro_hosted_try_now_en` | English intro top callout | hosted app |
| `docs_intro_hosted_try_now_de` | German intro top callout | hosted app |
| `docs_intro_hosted_try_now_nl` | Dutch intro top callout | hosted app |
| `docs_quickstart_hosted_explore_en` | English quick-start top callout | hosted app |
| `docs_deployment_hosted_try_first_en` | deployment guide top callout | hosted app |

### Defer these until after Phase 1

- deep in-doc feature links such as "Learn more"
- social icons
- low-intent footer navigation

Those are useful later, but they are not the first measurement set needed for marketing decision-making.

## Event Contract

### Required event names

- `website_cta_clicked`
- `website_rollout_page_viewed`
- `website_rollout_email_intent_opened`

### Event properties

#### `website_cta_clicked`

| Property | Purpose |
| --- | --- |
| `cta_id` | stable comparison key across releases |
| `surface` | hero, homepage_final, cta_band, footer, docs_intro, quickstart, deployment |
| `locale` | `en`, `de`, `nl` |
| `source_page` | pathname where click happened |
| `target_url` | destination for debugging and audits |
| `target_kind` | hosted app, docs, github, email, external site, rollout page |

#### `website_rollout_page_viewed`

| Property | Purpose |
| --- | --- |
| `entry_cta_id` | which CTA led here |
| `source_page` | prior page if passed via query string |
| `locale` | page locale |

#### `website_rollout_email_intent_opened`

| Property | Purpose |
| --- | --- |
| `entry_cta_id` | originating CTA if known |
| `source_page` | originating page if known |
| `locale` | page locale |

## Inquiry Routing Recommendation

### Recommended public paths

Use three distinct routes in messaging:

1. Hosted trial
   For users who want to click into the product immediately.
2. Managed rollout
   For shops that want help with deployment, ERP integration, or rollout sequencing.
3. Self-hosted evaluation
   For technical evaluators comparing deployment models.

### Route behavior

Hosted trial CTA:

- goes directly to `https://app.eryxon.eu`
- remains the fastest route for product exploration

Managed rollout CTA:

- goes to a first-party rollout page on the website
- rollout page primary action opens monitored email
- rollout page can later upgrade to a form without changing top-level CTA copy

Self-hosted evaluation CTA:

- goes to docs content such as deployment or self-hosting guides

### Why not send rollout interest to the hosted app

- signup creates a trial tenant immediately
- there is no current field for rollout intent, source campaign, or expected deployment model
- internal notification email does not include marketing attribution
- a rollout lead who only wanted a conversation becomes operational noise inside the product

## Attribution and Source Preservation

### What can be preserved today

| Step | Can preserve source today? | Notes |
| --- | --- | --- |
| website CTA click | yes | via `website_cta_clicked` |
| CTA to first-party rollout page | yes | via query params plus page-view event |
| rollout page to email intent | partial | can include context in mailto subject/body, but send is not guaranteed |
| website to hosted app landing URL | partial | query params can be appended to the URL, but the app does not store them today |
| hosted app signup to internal notification email | no | signup notification includes company/contact details, not marketing attribution |

### Hosted signup constraint

Current hosted signup behavior:

- `src/contexts/AuthContext.tsx` passes `username`, `full_name`, `role`, `tenant_id`, `company_name`, and `tenant_status`
- `public.handle_new_user()` in `supabase/migrations/20260121175020_remote_schema.sql` creates the tenant and profile
- `supabase/functions/notify-new-signup/index.ts` emails the internal notification

There is no current persistence for:

- CTA id
- source page
- UTM data
- rollout intent

If Eryxon wants end-to-end attribution through hosted signup, that is a later product change, not a copy-only change.

## Change Reasoning and Blast Radius

### First-order effects

If we implement Phase 1 instrumentation, the direct touchpoints are:

- `website/src/components/override-components/Hero.astro`
- `website/src/components/LinkButton.astro`
- `website/src/components/user-components/Button.astro`
- `website/src/components/override-components/Footer.astro`
- docs-entry markdown links in intro and quick-start pages

### Second-order effects

- changing `LinkButton.astro` affects the CTA cluster in all three localized homepage splash pages
- changing `Hero.astro` affects every page using the splash hero override, not just the homepage
- changing footer links affects every non-sidebar page using the global footer
- changing the hosted signup path in `AuthContext` affects app auth behavior and existing auth tests

### Third-order effects

If Eryxon later chooses full hosted attribution persistence, the cascade reaches:

- Supabase auth metadata handling
- `handle_new_user()` semantics
- signup notification email content
- privacy and retention expectations for marketing metadata
- possible admin surfaces if staff need to see inquiry source inside the product

That is why the recommended first pass keeps managed-rollout intent out of the app signup flow.

## Suggested Implementation Sequence

1. Add the shared CTA event adapter and instrument the Phase 1 CTA ids.
2. Add a first-party managed-rollout page and route rollout-oriented CTA copy to it.
3. Add mailto-based inquiry intent tracking from that page.
4. Validate desktop and mobile conversion paths.
5. Revisit full hosted-signup attribution only after the first rollout conversations justify product-side lead capture.

## Specialist Gaps

Two execution gaps remain after this technical scoping work:

- Website engineer capacity is missing for implementing the website analytics adapter, CTA wiring, and rollout page.
- QA capacity is missing for browser validation of the new conversion paths across desktop and mobile.

Until those roles exist, marketing can reference the recommended path in planning, but implementation throughput remains constrained.
