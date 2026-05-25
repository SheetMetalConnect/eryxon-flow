# ERY-89 v0.6 Communications Cadence and Messaging Plan

Date: 2026-05-24
Owner: CMO
Issue: [ERY-89](/ERY/issues/ERY-89)
Parent: [ERY-76](/ERY/issues/ERY-76)
Related: [ERY-54](/ERY/issues/ERY-54), [ERY-59](/ERY/issues/ERY-59), [ERY-67](/ERY/issues/ERY-67), [ERY-68](/ERY/issues/ERY-68), [ERY-80](/ERY/issues/ERY-80), [ERY-88](/ERY/issues/ERY-88), [ERY-9](/ERY/issues/ERY-9)

## Objective

Turn the approved cadence direction from [ERY-76](/ERY/issues/ERY-76) into a release-aligned communications plan for `v0.6` across website, docs, changelog, and social.

This plan defines the message hierarchy, publishing rhythm, target surfaces, and execution handoffs for the `v0.6` window. It is not final production copy and it is not external publishing approval.

## Decision Scope

This plan defines:

- the biweekly release-aligned communications rhythm
- the weekly supporting social cadence
- the `v0.6` "communications-overview quality" story
- exact public surfaces, audiences, and CTAs
- required assets, owners, and dependencies
- what must stay out of synced repo and issue surfaces

This plan does not define:

- final visual composition rules for social cards or page templates
- implementation details for website components
- external publishing approval
- customer-specific or commercial-operational reporting

## Working Interpretation

For this release, "communications-overview quality" is treated as a clarity and consistency requirement for public materials, not as a separate product feature.

That means `v0.6` public communication should make these things easier to understand in one pass:

1. what Eryxon is for
2. where it now runs and how it is evaluated
3. which next step fits the visitor: hosted trial, managed rollout, or self-hosted evaluation
4. what proof supports those claims

## Inputs Reviewed

- [ERY-76](/ERY/issues/ERY-76) parent issue description and approved plan
- `website/strategy/2026-05-24-ery-54-website-messaging-and-ia-brief.md`
- `website/strategy/2026-05-24-ery-59-v0-6-native-app-launch-brief.md`
- `website/strategy/2026-05-24-ery-67-biweekly-content-function-brief.md`
- `website/strategy/2026-05-24-ery-68-six-week-website-and-social-content-cadence.md`
- `website/strategy/2026-05-24-ery-80-release-proof-handoff-packet.md`
- `website/src/content/docs/index.mdx`
- `website/src/content/docs/introduction.md`
- `website/src/content/docs/guides/changelog.md`
- `website/src/content/docs/managed-rollout.mdx`
- `CHANGELOG.md`
- `docs/IOS.md`
- `docs/ANDROID.md`

## Executive Recommendation

Run `v0.6` communications on the same two-week train as the product release motion.

Every 14-day cycle should produce:

1. one canonical website asset that holds the release story
2. one docs or homepage routing refresh when the release changes evaluation choices
3. one release-week social announcement set
4. one support-week social proof set
5. one internal outbound proof snippet derived from the same source draft

The canonical website asset remains the source of truth. Social should compress that story, not invent a second one.

## v0.6 Public Story

### Narrative spine

1. Eryxon is a manufacturing execution system for metalworking job shops.
2. `v0.6` improves how clearly buyers can understand the product and how to evaluate it.
3. The release expands the device and rollout story with native iPhone/iPad, Android, and installable PWA support for guided rollout and technical evaluation.
4. Visitors should be routed quickly to the right path:
   - hosted trial
   - managed rollout
   - self-hosted evaluation
5. Public proof should come from shipped docs, screenshots, and release notes, not roadmap language.

### Communications-overview quality story

This is the quality story to repeat across `v0.6` materials:

- the public website is clearer about who Eryxon is for
- the evaluation paths are easier to choose
- the release story is anchored in real proof instead of "coming soon" language
- release surfaces, docs entry points, and supporting social all say the same thing

### Commercial truth guardrails

Always reinforce:

- hosted trial is the fastest way to explore
- managed rollout is the path for buyers who want deployment and rollout help
- self-hosted evaluation remains available for technical evaluators
- Eryxon sells hosted, managed, supported deployments and consulting, not software licenses

Never say:

- "open source" for BSL 1.1
- broad app-store availability unless separately approved
- unsupported offline-write claims
- pricing, customer names, or private trial information on repo-backed surfaces

## Release-Aligned Communications Rhythm

### Two-week operating loop

| Day | Output | Owner | Notes |
| --- | --- | --- | --- |
| Day 1 | Proof lock for current release window | CTO + CMO | Confirm what actually shipped, what proof exists, and which claims are safe. |
| Day 2 | One-page release brief | Content Lead | Audience, problem, proof sources, CTA, and reuse path. |
| Days 3 to 5 | Draft canonical website asset | Content Lead | Start with changelog, release note, or buyer-facing article surface. |
| Day 6 | Message and claim review | CMO + CTO | CMO reviews audience, CTA, and voice. CTO reviews technical accuracy. |
| Day 7 | Publish or queue website source asset | Website Engineer | Canonical source goes live only after message and claim review. |
| Day 8 | Release-week social set | Content Lead + CMO | LinkedIn primary post and short-form derivative point back to the website asset. |
| Day 10 | Outbound proof snippet saved | CMO | Internal reuse for follow-up and demand capture. |
| Day 12 | Support-week proof post | Content Lead + UXDesigner | Screenshot, quote, or buyer-problem angle tied to the same story. |
| Day 14 | Learning capture and next-cycle selection | CMO | Confirm what to carry into the next release window. |

### Weekly supporting social cadence

The minimum weekly rhythm for the `v0.6` window is:

- **Release week**
  - one LinkedIn release post tied to the canonical asset
  - one short-form derivative for changelog or proof amplification
- **Support week**
  - one LinkedIn proof or buyer-insight post
  - one visual or quote-based derivative that reuses the same release proof

If approvals or assets are not ready, skip the post rather than invent unsupported filler.

## Surface Map for v0.6

| Surface | Role in the `v0.6` story | Target audience | Primary CTA | Owner |
| --- | --- | --- | --- | --- |
| `website/src/content/docs/guides/changelog.md` | Canonical release summary and credibility check | Current evaluators, technical buyers, operations leaders | `Review native install and deployment docs` | Content Lead draft, Website Engineer publish |
| `website/src/content/docs/index.mdx` and localized homepage variants | Release amplifier and route chooser | First-time buyers, owners, operations leaders | `Open hosted trial` | Website Engineer with CMO copy direction |
| `website/src/content/docs/introduction.md` and localized intro variants | Docs entry routing for evaluators | Docs-first visitors, technical evaluators | `Choose your evaluation path` | Website Engineer with CMO copy direction |
| `website/src/content/docs/managed-rollout.mdx` | Conversion surface for rollout-intent traffic | High-intent buyers, implementation leads | `Plan a managed rollout` | Website Engineer with CMO messaging approval |
| LinkedIn primary post | Public release or proof amplification | Owners, operations leaders, evaluators | `Read the release update` | Content Lead draft, CMO approve |
| Short-form derivative | Release reminder or proof compression | Repeat visitors, lightweight social discovery | `Open the source asset` | Content Lead |
| Internal outbound proof snippet | Follow-up asset for warm leads and manual outreach | Existing conversations only | route to the approved website asset | CMO |

## v0.6 Message Hierarchy by Surface

### Canonical release asset

Lead message:

`v0.6 makes Eryxon easier to evaluate and more credible on the shop floor by pairing clearer rollout paths with real native-device proof.`

Required proof:

- release note or changelog summary
- at least two technical proof sources
- one CTA path for evaluators

### Homepage and docs entry surfaces

Lead message:

`Eryxon is for metalworking job shops that need better shop-floor visibility, operator adoption, and ERP-connected production tracking.`

Required support:

- route chooser for hosted trial, managed rollout, and self-hosted evaluation
- no stale "coming soon" posture for device support
- no release language that outruns the changelog

### Supporting social

Lead message:

- release week: what changed and why it matters on the floor
- support week: one concrete proof point or operator problem tied back to the same asset

Required support:

- one destination link
- one proof point
- no standalone hype posts without a website destination

## Required Assets, Owners, and Dependencies

| Asset | Why it is required | Owner | Dependencies |
| --- | --- | --- | --- |
| Canonical `v0.6` release draft | Creates one source of truth for the release story | Content Lead | [ERY-59](/ERY/issues/ERY-59), `CHANGELOG.md`, native docs |
| Homepage and docs-entry copy updates | Aligns first-touch and docs-touch messaging with the release story | Website Engineer | [ERY-54](/ERY/issues/ERY-54), approved copy from this plan |
| Managed-rollout CTA alignment | Ensures high-intent traffic lands on the right commercial path | Website Engineer | [ERY-9](/ERY/issues/ERY-9), [ERY-59](/ERY/issues/ERY-59) |
| Approved screenshot and proof pack | Makes the release visually credible and improves social reuse | UXDesigner | [ERY-80](/ERY/issues/ERY-80), existing app screenshots, device proof availability |
| Technical claim check | Prevents public overclaim on native, rollout, and deployment behavior | CTO | [ERY-88](/ERY/issues/ERY-88), native docs, deployment docs |
| Social derivatives from the same source draft | Maintains weekly motion without creating message drift | Content Lead | canonical release draft, screenshot pack |

## Synced Dev-Surface Rules

Because this repository and synced development surfaces are public-facing enough to treat as public, issue threads, PRs, and synced Linear tickets should contain only:

- technical implementation targets
- exact page or file references
- acceptance criteria
- claim-proof dependencies

Do not include:

- customer names
- pricing or commercial negotiation details
- unpublished campaign performance
- private trial-user reporting
- board-only reasoning that is not required for execution

If a marketing task needs non-public commercial context, keep that outside repo-backed or synced dev surfaces.

## Execution Handoffs

### Parallel work that can start now

1. Content Lead can draft the canonical `v0.6` release communications package from the proof sources already identified here and in [ERY-59](/ERY/issues/ERY-59).
2. Website Engineer can scope the exact website surfaces that need message parity and CTA alignment.
3. UXDesigner can assemble the visual proof pack and social-card constraints for release-week and support-week reuse.

### Review gates

- CMO approves narrative, audience, CTA, and channel reuse before publication.
- CTO approves technical claims before publication on any surface that references native support, deployment, APIs, or rollout behavior.
- CEO only re-enters if a new strategic promise or external commitment is proposed.

## Acceptance Check

- A biweekly release-aligned communications rhythm is defined.
- A weekly supporting social cadence is defined.
- The `v0.6` communications-overview quality story is explicit.
- Exact surfaces, target audiences, CTAs, owners, and dependencies are named.
- Public-surface hygiene rules are documented so synced dev surfaces stay technical and non-confidential.
