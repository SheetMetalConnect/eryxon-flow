# ERY-54 Website Messaging and IA Brief

Date: 2026-05-24
Owner: CMO
Issue: [ERY-54](/ERY/issues/ERY-54)
Parent: [ERY-49](/ERY/issues/ERY-49)
Related: [ERY-52](/ERY/issues/ERY-52), [ERY-53](/ERY/issues/ERY-53), [ERY-6](/ERY/issues/ERY-6), [ERY-9](/ERY/issues/ERY-9)

## Objective

Define the buyer-facing narrative, page structure, CTA hierarchy, and copy constraints for the Eryxon website redesign so UX and engineering can implement it inside the Astro site without inventing the story as they go.

This brief is the messaging and IA layer for the redesign. It is not final production copy, and it does not override the canonical design-system package.

## Decision Scope

This brief defines:

- audience priority
- narrative spine
- page roles
- CTA hierarchy
- claim boundaries
- template-specific content requirements

This brief does not define:

- tokens, spacing, motion, or component geometry
- final template composition rules from the design-system package
- responsive behavior beyond buyer-path intent
- implementation architecture beyond the Astro constraints already documented in [ERY-53](/ERY/issues/ERY-53)

If the package or [ERY-52](/ERY/issues/ERY-52) does not supply a narrative cue or template rule, the gap should be logged explicitly instead of backfilled with taste-based copy.

## Inputs Reviewed

- Canonical design-system files now available at:
  - `/Users/vanenkhuizen/Documents/GitHub/products/eryxon-flow-test/docs/Eryxon Design System`
- Current repo public surfaces:
  - `website/src/content/docs/index.mdx`
  - `website/src/content/docs/introduction.md`
  - `website/src/content/docs/managed-rollout.mdx`
  - `website/src/content/docs/guides/quick-start.md`
  - `website/src/content/docs/guides/deployment.md`
  - `website/src/content/docs/guides/changelog.md`
  - `website/src/config/menu.en.json`
  - `website/src/components/RolloutInquiry.astro`
  - `website/README.md`
- Existing strategy notes:
  - `website/strategy/2026-05-24-ery-53-astro-redesign-technical-execution-path.md`
  - `website/strategy/2026-05-24-ery-6-marketing-hiring-and-execution-brief.md`
  - `website/strategy/2026-05-24-ery-9-cta-instrumentation-and-inquiry-routing.md`
- Board-direction comments on [ERY-49](/ERY/issues/ERY-49) and [ERY-54](/ERY/issues/ERY-54)
- Design-system references used in this heartbeat:
  - `README.md`
  - `ui_kits/marketing/README.md`
  - `ui_kits/marketing/components.jsx`
  - `ui_kits/marketing/index.html`
  - `ui_kits/marketing/services.html`
  - `ui_kits/marketing/blog/post.html`
  - `ui_kits/marketing/blog/changelog.html`

## Canonical Constraint

Treat `Eryxon Design System (1).zip` as the source of truth for messaging cues, IA cues, and copy constraints in this redesign.

The package is now accessible through the shared filesystem path above, so the brief below includes package-derived marketing and editorial rules rather than only repo-local inference.

Two limits still apply:

1. the canonical files are still outside this repo, so implementation teams should not assume the path is durable in every workspace
2. [ERY-52](/ERY/issues/ERY-52) still owns the final UX/template translation into implementation-ready rules

This brief therefore now defines package-backed narrative and IA constraints, while [ERY-52](/ERY/issues/ERY-52) still owns final template/layout interpretation.

## Package-derived non-negotiables

The accessible design-system sources establish these constraints for the public website:

- Brand name standardises on `Eryxon`, not the legacy `ERYX` services identity.
- Voice is calm, precise, and operator-respecting. It should read like strong technical documentation, not hype marketing.
- Headings are sentence case. Lowercase wordmark treatment is for the mark itself, not for body-copy brand references.
- The public marketing surface is light-mode-primary.
- `Open source` is prohibited. Use `source-available`, `self-hostable`, or `BSL-licensed`.
- Marketing avoids decorative illustrations and stock-photo dependence. The kit sells the product with a product preview frame instead.
- The marketing shell already standardises around:
  - sticky header
  - five navigation items
  - `Sign in`
  - one primary CTA
- The landing-page kit standardises around:
  - short claim
  - short lead
  - dual CTA
  - quiet trust row
  - product preview
  - numbered feature grid
  - three-step process section
  - testimonial/stat proof
  - dark API block
  - integrations
  - pricing
  - closing CTA band
  - structured footer
- The editorial kit standardises around:
  - blog index
  - long-form article template
  - changelog template
  - sticky top navigation
  - primary trial CTA in header
  - changelog entries using Added / Fixed / Changed / Removed tags

## Audience Priority

### Primary audience

- Owners and operations leaders at metalworking job shops
- Plant or implementation leads evaluating whether rollout risk is manageable

### Secondary audience

- Technical evaluators checking ERP integration, deployment model, and self-hosting fit

### Tertiary audience

- Operators and supervisors who need confidence the product will work on the shop floor

## Current-State Findings

### What is working

- The site already has real product proof: operator workflows, ERP integration, 3D viewer, batch management, capacity planning, self-hosting, API docs, and screenshots.
- The ICP is already visible: job shops, shop-floor tablets, QRM flow, ERP-connected production.
- The repo surfaces provide enough factual material to support a credible buyer story.
- `website/README.md` already establishes the docs site as the canonical home for release notes and changelog content.

### What is creating friction

1. The front door reads like a product status page before it reads like a buyer solution.
   Evidence:
   - `website/src/content/docs/index.mdx`
   - `website/src/content/docs/introduction.md`
   - repeated emphasis on Beta status, endpoint counts, and future mobile apps ahead of deployment/support context

2. Managed rollout exists as a route, but it is not yet a first-class information architecture choice.
   Evidence:
   - `website/src/content/docs/managed-rollout.mdx`
   - `website/src/config/menu.en.json`
   - `website/src/content/sections/call-to-action.md`

3. The site still mixes repository/community framing with commercial website framing.
   Evidence:
   - `website/src/config/menu.en.json` labels a footer section as `Open Source`
   - BSL 1.1 must never be framed as open source

4. Docs entry pages assume the visitor already knows which path to take.
   Evidence:
   - `website/src/content/docs/introduction.md`
   - `website/src/content/docs/guides/quick-start.md`
   - `website/src/content/docs/guides/deployment.md`

5. Public website surfaces still risk inheriting repo and docs status framing instead of the package-backed website positioning the board asked for.
   Evidence:
   - `README.md` contains maintenance and `development is currently on hold` language that must not be mirrored onto the public website
   - the docs intro and homepage repeatedly say Android and iOS are coming soon
   - `website/src/content/docs/guides/changelog.md` still leads with the same roadmap promise

6. The redesign now needs reusable landing, blog, and release-note templates, but the current site does not define those surfaces as a coordinated system.
   Evidence:
   - [ERY-53](/ERY/issues/ERY-53) explicitly notes there is no `src/pages/` marketing-route structure today
   - `website/README.md` says release notes belong in docs
   - there is no explicit blog/article template in the current website structure

## Narrative Spine

Every public entry surface should answer these three buyer questions in this order:

1. What is Eryxon, and is it built for my kind of shop?
2. What is my best next step: hosted trial, managed rollout, docs-guided evaluation, or release-specific proof?
3. What factual proof shows this will work in our environment?

## Recommended Core Message

### Positioning line

Eryxon is a manufacturing execution system for metalworking job shops that need better shop-floor visibility, operator adoption, and ERP-connected production tracking.

### Recommended homepage message hierarchy

- Eyebrow:
  `Manufacturing execution for metalworking job shops`
- H1:
  `Track jobs from ERP to shop floor without losing operator adoption`
- Support copy:
  `Eryxon gives job shops a tablet-friendly MES with three clear paths: open the hosted trial, plan a managed rollout, or evaluate it self-hosted.`
- Primary CTA:
  `Open hosted trial`
- Secondary CTA:
  `Plan a managed rollout`
- Tertiary CTA:
  `Review documentation`

### What not to lead with

- Beta badges
- endpoint counts
- transport/protocol lists
- future mobile promises
- freeze or maintenance framing such as `development is on hold`
- license terms

Those belong in proof, trust, or release-status context, not the first screen.

## Recommended Information Architecture

### Global navigation

Use the package marketing-header shell as the starting point:

- `Product`
- `Documentation`
- `Pricing`
- `Guides`
- `Changelog`

Package-aligned CTA structure in the header:

- secondary action: `Sign in`
- primary action: `Start free trial`

Managed rollout should remain a first-class destination, but the design-system evidence suggests it belongs as a targeted CTA/page path within Product, Pricing, or Guides rather than replacing the entire top-nav shell.

### Homepage

The homepage should follow the package landing-page arc rather than a docs-index arc.

Recommended section order:

1. Hero:
   short claim, short lead, dual CTA, quiet trust row
2. Product preview:
   browser/product frame instead of decorative hero art
3. Numbered feature grid:
   hairline grid, six concrete capabilities
4. How it works:
   three-step operational flow
5. Proof section:
   testimonial plus supporting stats
6. Dark API block:
   technical evaluator proof with code sample
7. Integrations:
   real names, no fake logos
8. Pricing:
   deployment-style comparison
9. Closing CTA band:
   hosted path plus self-host/docs path
10. Footer:
   resource links, contact, and trust language

### Managed rollout page

This page should be the commercial conversation page.

It should answer:

- when a buyer should choose a managed rollout
- what support Eryxon can provide
- how hosted trial and self-hosting differ from a rollout conversation
- what information to include in the first outreach

The page should not read like pricing, a services catalog, or a generic contact page.

### Docs introduction page

The docs intro should become an evaluation gateway, not just a product description.

Recommended order:

1. one-sentence product summary
2. path chooser:
   hosted trial, managed rollout, self-hosted evaluation
3. short proof section for operators, admins, and technical evaluators
4. links into the right next documents

### Landing pages

Landing pages should inherit the package marketing shell and use the services/CTA template discipline where relevant.

They should:

- focus on one buyer problem or evaluation scenario
- keep one primary CTA only
- use documentation or screenshots as proof
- avoid repeating the full homepage story or docs index
- prefer a centered hero, structured comparison, and scoped conversion block when the page is service- or rollout-oriented

### Blog posts

Blog posts should follow the package article template, not a generic markdown post.

They should:

- teach something concrete first
- connect the topic back to metalworking job-shop operations
- include one context-appropriate CTA block near the end
- avoid reading like release notes or a generic company blog
- include real article scaffolding:
  eyebrow, H1, lead, author/date/reading-time meta, figures, callouts, share row, and next-article path

### Release notes

Release notes should stay inside the documentation surface, but follow the package changelog pattern for how a release is presented.

They should:

- state what changed
- separate shipped updates from Beta status and roadmap context
- link to the right proof pages or docs
- keep roadmap claims factual and dated
- use release headers with version, date, status badge, summary line, and Added / Fixed / Changed / Removed blocks

### Footer

The footer should reinforce trust and route visitors correctly.

Required changes at the IA level:

- rename the `Open Source` group to `Repository` or `Code & Community`
- keep `Managed rollout` in the contact or company column
- keep documentation and self-hosting links under resources
- keep BSL/source-available language factual and compact

## Page Briefs by Surface

### Homepage

Target audience:
- first-time buyers and evaluators

Primary user question:
- `Is this for my kind of shop, and what should I do next?`

Primary CTA:
- hosted trial

Secondary CTA:
- managed rollout

Proof required:
- operator UI screenshot
- ERP/integration proof
- deployment-choice explanation
- trust row or proof strip consistent with the package hero

Target files:
- `website/src/content/docs/index.mdx`
- `website/src/components/override-components/Hero.astro`
- `website/src/content/sections/call-to-action.md`

### Managed rollout page

Target audience:
- buyers who want guidance, integration help, or a safer rollout path

Primary user question:
- `Can Eryxon help us get this into production without us figuring everything out alone?`

Primary CTA:
- managed rollout inquiry

Secondary CTA:
- hosted trial or deployment docs, depending on intent

Proof required:
- scope of support
- deployment and ERP guidance examples
- expectation-setting on inquiry flow

Target files:
- `website/src/content/docs/managed-rollout.mdx`
- `website/src/components/RolloutInquiry.astro`

### Docs introduction

Target audience:
- evaluators entering through documentation

Primary user question:
- `Which path fits me: try it, talk to Eryxon, or self-host it?`

Primary CTA:
- choose-a-path CTA block

Secondary CTA:
- hosted trial

Proof required:
- short summaries for operators, admins, and technical evaluators

Target files:
- `website/src/content/docs/introduction.md`
- `website/src/content/docs/de/introduction.md`
- `website/src/content/docs/nl/introduction.md`

### Quick Start

Target audience:
- technical evaluators and self-serve implementers

Primary user question:
- `How fast can I explore or stand this up myself?`

Primary CTA:
- hosted trial for exploration

Secondary CTA:
- self-hosting or deployment docs

Target files:
- `website/src/content/docs/guides/quick-start.md`

### Deployment Guide

Target audience:
- self-hosting evaluators and technical implementers

Primary user question:
- `How do I deploy this if I want to run it myself?`

Primary CTA:
- continue deployment steps

Secondary CTA:
- managed rollout for guided help

Target files:
- `website/src/content/docs/guides/deployment.md`

### Landing page template

Target audience:
- search, outbound, or referral visitors entering on one specific problem or evaluation scenario

Primary user question:
- `Is Eryxon relevant to this exact problem, and what should I do next?`

Primary CTA:
- exactly one of:
  - hosted trial
  - managed rollout
  - docs-guided evaluation

Secondary CTA:
- proof link into docs, screenshots, or deployment guidance

Proof required:
- one clear buyer problem
- one concrete screenshot or product proof block
- one deployment-path explanation matched to the CTA
- one scoped conversion section, not a general-site footer pitch

Target surfaces:
- new Astro marketing route template under `website/src/pages/` or equivalent implementation introduced by [ERY-60](/ERY/issues/ERY-60)
- shared CTA/content sections reused by those routes

Acceptance criteria:
- a campaign page can be created without inventing a new narrative hierarchy
- the page keeps one primary CTA instead of equal-weight options
- the page can inherit the package visual system once [ERY-52](/ERY/issues/ERY-52) lands
- the page can also support the services-template pattern: centered hero, plan grid, comparison table, and structured inquiry block when rollout/consulting intent is the focus

### Blog post template

Target audience:
- organic-search readers, evaluators researching MES topics, and implementation-minded partners

Primary user question:
- `Did I learn something useful here, and what is the lowest-friction next step?`

Primary CTA:
- docs or hosted trial, depending on article intent

Secondary CTA:
- managed rollout only when the article clearly points to implementation support

Proof required:
- practical insight anchored in a real workflow, doc, screenshot, or release artifact
- a short CTA block near the end
- related links into docs or product proof
- package article structure:
  eyebrow, lead, author/date/reading-time, figures, callouts, TOC, share row, and up-next card

Target surfaces:
- reusable article template for future marketing/content routes in Astro

Acceptance criteria:
- the post educates first and converts second
- the CTA matches article intent instead of defaulting to a generic sales push
- the surface stays distinct from release notes and docs reference pages
- the article can support case-study style storytelling like the package example, not only abstract thought-leadership posts

### Release-note template

Target audience:
- current evaluators, self-hosting implementers, and existing users checking product credibility

Primary user question:
- `What changed, what is live now, and where do I go for proof or setup details?`

Primary CTA:
- relevant docs page or hosted trial, depending on the release item

Secondary CTA:
- GitHub release notes or repo changelog for deeper technical detail

Proof required:
- version and date
- shipped changes separated from Beta status or roadmap context
- direct links to setup, feature, or deployment docs
- package release structure:
  version/date rail, stable or preview badge, one-sentence release summary, and Added / Fixed / Changed / Removed item groups

Target files:
- `website/src/content/docs/guides/changelog.md`
- linked GitHub release notes and repo changelog references already surfaced there

Acceptance criteria:
- release notes remain inside the docs system per `website/README.md`
- shipped status, Beta status, and roadmap language are clearly separated
- no unapproved future promises appear in the summary block

### Navigation and footer

Target audience:
- visitors who are still orienting themselves

Primary user question:
- `Where do I go next?`

Primary CTA:
- hosted trial or managed rollout depending on section

Target files:
- `website/src/config/menu.en.json`
- `website/src/config/menu.de.json`
- `website/src/config/menu.nl.json`
- `website/src/components/override-components/Footer.astro`

## Copy Constraints

### Commercial truth

- Lead with hosted, managed, and supported deployment plus consulting.
- Do not imply license sales as the main commercial motion.
- Do not route managed-rollout intent into self-serve signup language.

### License truth

- Describe BSL 1.1 as `source-available` and `free for internal use` when accurate.
- Never describe BSL 1.1 as open source.

### Market specificity

- Write for metalworking and fabrication shops, not generic SaaS or generic factory software audiences.
- Prefer shop-floor language over abstract digital-transformation language.

### Proof standard

- Anchor claims in screenshots, docs, supported workflows, or known deployment paths.
- Avoid ungrounded claims such as `complete platform`, `all-in-one`, or `works for every manufacturer`.

### Public website positioning

- Homepage, landing pages, blog posts, and release-note summaries must not state freeze, maintenance-mode, or `development is on hold` messaging.
- Public website positioning should read as an actively presented product story grounded in real current capability and valid deployment paths.
- If a repo, changelog, or technical note uses maintenance language for release bookkeeping, that phrasing must not be promoted into public marketing surfaces by default.
- Package wording should be preferred when it exists, for example:
  `A calm MES for job shops that ship.`
  `What shipped, when.`

### Template discipline

- Landing pages get one primary CTA and one buyer problem, not a full-site menu in disguise.
- Blog posts should educate first, then route readers into the next relevant proof or CTA.
- Release-note summaries must distinguish shipped facts from roadmap context and include dates.

### Legitimate `on hold` usage

- The phrase `on hold` may still appear inside product-domain or operational documentation when it describes an actual workflow, queue state, or feature-specific behavior.
- That usage must be clearly contextual and must not be repurposed as company-level product positioning.

### Roadmap caution

- Do not promise launch timing for native mobile apps unless CTO and CEO confirm that promise is still accurate.
- If mobile is mentioned, position it as roadmap context, not primary value.

### Localization sequencing

- Finalize English narrative and IA first.
- Update German and Dutch only after English structure is approved.
- Do not localize outdated English framing.

## Missing Assets and Open Decisions

1. The canonical design-system files are now accessible through a shared path, but they are still not mirrored into this repo.
   Unblock owner:
   UXDesigner or CEO
   Needed action:
   mirror the canonical package or its approved distilled outputs into a repo-local or issue-local artifact so downstream implementation does not depend on one machine path

2. [ERY-52](/ERY/issues/ERY-52) still needs to translate the accessible package into implementation-ready template rules for engineering.
   Unblock owner:
   UXDesigner
   Needed action:
   publish the package-derived non-negotiables for those templates so engineering can implement without interpreting raw HTML mockups ad hoc

3. The site still lacks customer proof assets.
   Impact:
   the redesign will rely on product proof rather than testimonials until case studies exist

4. The website still needs approved forward-facing status language for homepage, intro, landing, blog, and release-note summary surfaces.
   Impact:
   public website messaging must avoid freeze or maintenance framing while still staying truthful about what is live today

5. Managed rollout scope still needs a public-facing approval pass.
   Impact:
   messaging should not overstate what support is operationally ready today

6. CTA measurement and inquiry routing still depend on [ERY-9](/ERY/issues/ERY-9).

## Recommended Execution Sequence

1. CEO or board reviewer approves the updated [ERY-54 plan](/ERY/issues/ERY-54#document-plan).
2. UXDesigner confirms package-specific template/layout constraints for homepage, landing, blog, and release-note surfaces in [ERY-52](/ERY/issues/ERY-52).
3. CTO and engineering implement the English homepage, managed-rollout page, docs-entry framing, landing template, blog template, and release-note template in Astro.
4. Engineering or manual review validates CTA routes, labeling, and release-note status truth until a QA path exists.
5. Localization follows after the English structure is stable.

## Acceptance Criteria for This Brief

- Core website narrative is defined in buyer language.
- Homepage, managed rollout, docs intro, landing-page template, blog template, and release-note template each have a clear role, target audience, and CTA.
- BSL/source-available language constraints are explicit.
- Docs preservation and release-note placement are explicit.
- Missing assets and unresolved decisions are named.
- UX and engineering can implement without guessing what each surface is for, while still deferring package-specific template rules to [ERY-52](/ERY/issues/ERY-52).
