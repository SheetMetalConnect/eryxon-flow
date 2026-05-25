# ERY-6 Marketing Hiring Proposal and 30-Day Execution Brief

Date: 2026-05-24
Owner: CMO
Issue: ERY-6

## Objective

Make Eryxon's public story immediately clear to three buyer-side audiences:

- Metalworking job shop owners and operations leaders evaluating MES rollout risk
- Technical evaluators responsible for ERP integration and deployment
- Operators and supervisors who need confidence that the product will work on the shop floor

The public narrative should lead with hosted, managed, and supported deployment plus consulting, while still preserving self-hosted and source-available details for technical evaluators. The current site already contains strong product proof. The next 30 days should reorganize that proof into a buyer path instead of adding more feature volume.

## Current-State Findings

### What is already strong

- The website already has concrete product proof: screenshots, operator workflow, ERP integration, 3D viewer, batch management, QRM flow, self-hosting docs, and API references.
- The ICP is visible in several places: "job shops," sheet metal, tablets on the shop floor, and ERP-connected workflows.
- The docs are detailed enough to support implementation-minded evaluators once the right entry path exists.

### What is slowing conversion today

1. Homepage story is product-status-first, not buyer-outcome-first.
   Target surfaces: `website/src/content/docs/index.mdx`, `website/src/content/docs/introduction.md`
   Current emphasis is "Beta," "coming soon," "24 REST endpoints," and transport details before a buyer sees the deployment/support motion.

2. The site has no primary commercial CTA for managed rollout.
   Target surfaces: `website/src/content/docs/index.mdx`, `website/src/content/sections/call-to-action.md`, `website/src/components/override-components/Footer.astro`
   Current CTAs send visitors to the hosted app or technical docs. There is no first-class path for "Talk to us about rollout, ERP integration, or managed deployment."

3. License framing is more prominent than service framing.
   Target surfaces: `website/src/content/docs/index.mdx`, `website/src/components/override-components/Footer.astro`
   "Source-available" and "free for internal use" are visible, but hosted, managed, supported deployment plus consulting is buried near the bottom and routed to an external consulting domain.

4. Docs entry pages start in implementation mode instead of evaluation mode.
   Target surfaces: `website/src/content/docs/introduction.md`, `website/src/content/docs/guides/quick-start.md`, `website/src/content/docs/guides/deployment.md`
   These pages are useful after commitment, but they do not yet help a buyer decide which path fits them: hosted trial, managed rollout, or self-hosted evaluation.

## Recommended Hire Sequence

### Hire 1: Technical Content and SEO Lead

Scope:
- Own homepage and docs framing for buyer-intent traffic
- Turn existing docs into ranking pages for high-intent search themes
- Package product proof into case-study-style pages, comparison pages, and rollout pages

Why now:
- Eryxon already has enough product depth to support content compounding
- The current site contains the raw material, but it is arranged for readers who already want technical details
- A content and SEO lead unlocks both inbound demand and better outbound follow-up material

Expected leverage:
- Increases qualified discovery from job-shop and ERP-related search intent
- Reduces founder and CTO time spent rewriting the same positioning in ad hoc conversations
- Gives outbound and consulting motions a reusable proof library

First issue this hire should own:
- `ERY-11` Rewrite the homepage and docs entry path around three buyer questions:
  "Is this built for my kind of shop?",
  "Can Eryxon be rolled out without a custom software project?",
  "Should we use the hosted path, managed rollout, or self-host?"

### Hire 2: Outbound Operations and Product Marketing Lead

Scope:
- Build the first repeatable founder-led outbound motion
- Own target-account research, message sequencing, follow-up assets, and response capture
- Repackage website proof into outreach snippets, vertical one-pagers, and evaluator follow-up notes

Why now:
- Once the message is clarified, Eryxon needs a disciplined way to put it in front of real shops, ERP partners, and manufacturing digitalization buyers
- Without this role, the website improvement work will not turn into consistent conversations

Expected leverage:
- Converts the website and docs from static proof into pipeline support
- Creates a measurable learning loop from outreach objections back into messaging
- Frees the CEO and CTO from list-building and message-ops work

First issue this hire should own:
- `ERY-12` Run a 30-account pilot outbound motion across metalworking job shops, ERP implementation partners, and self-hosted evaluators using a shared messaging pack and CTA routing plan

### Do Not Hire Yet: Dedicated Social or Community Lead

Why not now:
- Eryxon does not yet have enough customer proof, repeatable wins, or public operator stories to support a compounding community motion
- A dedicated social hire would likely be forced into low-trust awareness posting instead of proof-led demand generation
- Community becomes valuable after the first proof assets, rollout stories, and deployment narratives exist

Revisit after:
- 3 customer proof assets exist
- the managed rollout narrative is live
- outbound messaging produces repeatable objections and responses worth publishing

## 30-Day Website and Outbound Execution Brief

### Week 1: Narrative Reset

Goal:
- Clarify the front-door story for buyers in under 10 seconds

Target audience:
- Owners, operations managers, and implementation evaluators at metalworking job shops

Target surfaces:
- `website/src/content/docs/index.mdx`
- `website/src/content/docs/introduction.md`
- `website/src/content/sections/call-to-action.md`
- `website/src/components/override-components/Footer.astro`

Deliverables:
- New message hierarchy for homepage and docs intro
- Commercial framing rules:
  hosted trial, managed rollout, supported deployment, consulting
- License framing rule:
  describe BSL 1.1 as source-available and free for internal use, never open source
- CTA architecture for buyer paths:
  try hosted app, review docs, request rollout conversation

Acceptance criteria:
- Hero and first screen explain what Eryxon is, who it is for, and what action to take next
- Managed deployment and support are visible above the fold or in the first scroll
- License details move into trust or terms context instead of carrying the whole narrative

### Week 2: Buyer-Path Content Build

Goal:
- Turn existing product proof into pages that match search and evaluation intent

Target audience:
- Buyers comparing MES options and technical evaluators validating rollout fit

Target surfaces:
- Homepage and docs intro pages above
- New decision page:
  hosted trial vs managed rollout vs self-hosted
- New proof page:
  ERP-connected MES for metalworking job shops

Deliverables:
- Exact copy brief for each target surface
- Reuse existing screenshots and feature proof from docs instead of inventing abstract claims
- Clear CTA on each page tied to the buyer's stage

Acceptance criteria:
- Every page has a named audience, one primary CTA, and proof tied to real product capabilities
- Self-hosted content stays available without overwhelming hosted and managed evaluation paths

### Week 3: Outbound Asset Pack

Goal:
- Build a compact, reusable outbound kit grounded in the revised narrative

Target audience:
- 20 to 30 target job shops, ERP partners, and manufacturing digitalization consultants

Channels:
- Founder-led email outreach
- LinkedIn follow-up by named humans
- Direct sharing of proof pages and docs sections during conversations

Deliverables:
- 3-email outreach sequence
- 2 LinkedIn message variants
- 1 objection-handling sheet linked to website proof
- 1 target-account list structure with segment tags

Acceptance criteria:
- Every outreach message maps to a proof page or docs section
- No outreach claim requires product behavior or commercial support Eryxon does not actually provide

### Week 4: Pilot Launch and Feedback Loop

Goal:
- Turn messaging into learning, not just publication

Target audience:
- Same pilot account list plus warm partner conversations

Deliverables:
- Launch the first outbound pilot
- Record objections and conversion friction
- Feed those learnings back into homepage and docs revisions

Acceptance criteria:
- Responses and objections are captured in a reusable format
- CTA performance is measurable
- The next content sprint is chosen from live buyer feedback, not internal guesswork

## Delegated Dependencies

### CTO Dependency

Owner:
- CTO

Scope:
- Add CTA instrumentation for homepage and docs entry actions
- Scope the technical path for a managed rollout or consultation inquiry CTA
- Confirm whether the hosted app sign-up path can support attribution and marketing follow-up without misrepresenting the product

Why it matters:
- Marketing cannot prove which path works without basic CTA measurement
- Commercial narrative should not promise a workflow that the app, routing, or operations layer cannot actually support

### UX and Design Dependency

Owner:
- Future UX design capacity, pending CEO decision

Scope:
- Redesign homepage information architecture around buyer path, not feature volume
- Produce wireframes for hero, proof blocks, deployment-choice section, and CTA hierarchy

Why it matters:
- The current content problem is partly copy and partly information architecture
- A sharper story will land better if visual hierarchy supports the intended path

### QA Dependency

Owner:
- Future QA capacity or delegated reviewer after implementation

Scope:
- Validate primary website conversion paths after copy and CTA changes ship
- Check that hosted, docs, and inquiry flows work cleanly on desktop and mobile

## Success Signals

- Buyers can tell within seconds that Eryxon is for metalworking job shops
- The public site shows a clear managed and supported path, not just a self-hosted path
- Outbound messages reuse website proof instead of inventing separate narratives
- Search and outreach work compound from the same message architecture

## Proposed Issue Tree

1. `ERY-9` CTO technical dependency issue:
   Instrument CTA events and define inquiry routing for managed rollout
2. `ERY-10` Future UX design issue:
   Design homepage IA and CTA hierarchy for buyer and implementer paths
3. `ERY-11` Future Technical Content and SEO Lead issue:
   Rewrite homepage and docs entry framing for hosted, managed, and self-hosted buyer paths
4. `ERY-12` Future Outbound Operations and Product Marketing Lead issue:
   Launch the first 30-account outbound pilot using the revised proof assets
