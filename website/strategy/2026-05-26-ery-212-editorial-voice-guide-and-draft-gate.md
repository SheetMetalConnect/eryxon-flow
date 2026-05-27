# ERY-212 — Editorial Voice Guide And Draft Gate

Date: 2026-05-26
Owner: CMO
Scope: `website/src/content/blog/` and `website/src/content/docs/articles/`

## Purpose

This is the working editorial standard for Eryxon's buyer-facing articles and blog posts.

The goal is not "better content" in the abstract. The goal is faster buyer comprehension, cleaner
commercial framing, and fewer drafts that sound like internal engineering notes instead of a
credible manufacturing software company.

## Who Eryxon sounds like

Eryxon sounds like:

- a production-aware operator, planner, or rollout lead who understands metalworking flow
- a practical software partner who can explain the product without hype
- a company that proves claims with shipped capability, docs, screenshots, and rollout detail
- a commercial team selling hosted, managed, supported deployment and consulting, not license access

Eryxon does not sound like:

- an internal build diary
- an AI self-critique or self-congratulatory status update
- a generic B2B SaaS content marketer talking about "digital transformation"
- a venture-funded hype machine promising revolution, disruption, or magic automation

## Non-negotiable voice rules

1. Open on the production problem, not the company.
2. Name the reader in shop-floor terms: operator, foreman, planner, production lead, owner, or evaluator.
3. Use workflow language from metalworking reality: cells, queues, drawings, routings, ERP handoff, bottlenecks, due dates, rework, shift changes.
4. Show proof early. Every material claim should connect to a shipped feature, doc page, release note, screenshot, or supported deployment path.
5. Keep commercial truth intact. Eryxon sells hosted deployment, managed on-prem deployment, support, and consulting. It does not sell software access licenses.
6. Keep roadmap language fenced. Future work can add context, but it cannot carry the article's argument.

## Openings, ledes, transitions, and closings

Article openings:

- Start with the failure mode the reader already recognizes in the shop.
- If the reader cannot picture the situation in the first paragraph, rewrite it.
- Do not start with company history, philosophy, or abstract market commentary.

Ledes:

- State what changed for the reader, in plain language, within two sentences.
- Tie the outcome to a concrete workflow or evaluation question.
- Avoid broad category claims like "modern manufacturing needs better visibility."

Transitions:

- Move by operational logic: problem -> current friction -> product proof -> rollout implication.
- Use short connective lines that keep the reader in the same workflow.
- Do not drift into engineering diary narration such as "we decided to build" or "in this post we explore."

Feature framing:

- Frame features as workflow changes, not capability inventory.
- Prefer "the operator can open the drawing at the station" over "the platform includes document access."
- Explain why the feature matters in a job shop before listing what it does.

Closings:

- End with one next step only.
- The CTA must match the article intent: docs, hosted trial, or managed rollout.
- Do not end with empty inspiration, roadmap promises, or "reach out to learn more" filler.

## Banned patterns

Reject drafts that contain any of these patterns unless rewritten:

- "In this blog post, we explore..."
- "We built this because..."
- "Our mission is to transform manufacturing..."
- "This powerful platform enables..."
- "AI-generated self-review voice" that narrates what the article is doing instead of teaching
- internal release-process narration that matters to Eryxon more than to the buyer
- ungrounded claims like "seamless," "game-changing," "best-in-class," or "revolutionary"

## Before / after rewrites

### Example 1 — Operator terminal article

Bad:

`Eryxon Flow offers a modern terminal experience that improves visibility and efficiency across the manufacturing floor.`

Better:

`An operator terminal only earns its place on the floor if someone can walk up, see the next job, open the drawing, and tell whether the next cell can take more work without asking the office.`

Why:

- Starts with operator use, not product praise.
- Defines the job-to-be-done in shop language.

### Example 2 — ERP integration article

Bad:

`Our ERP integration capability creates seamless synchronization between systems and unlocks digital transformation.`

Better:

`If your ERP already owns the work order, due date, and routing intent, the MES should not force someone to type the same job twice. The useful test is whether records stay matched when the ERP resends that work.`

Why:

- Replaces generic software language with the buyer's evaluation question.
- Introduces the proof path for `external_id` and sync behavior.

### Example 3 — Managed rollout article

Bad:

`We partner closely with customers to deliver tailored implementations that maximize value.`

Better:

`Some shops want to self-host. Others want Eryxon to stand up the system, map the ERP handoff, and keep operators moving during rollout. The commercial offer is deployment and implementation help, not a license gate.`

Why:

- Protects commercial truth.
- Explains the service in operational terms instead of agency fluff.

## Draft review checklist

The Content Lead should run this checklist before any article moves from draft to publishable:

1. Reader and problem are explicit in the opening paragraph.
2. The lede explains the workflow change or evaluation question within two sentences.
3. The article uses shop-floor language instead of generic SaaS language.
4. Every major claim is anchored in a doc page, feature page, changelog item, screenshot, or supported rollout path.
5. The article does not read like an internal build log, AI self-review, or company diary.
6. Commercial framing is accurate: hosted, managed, supported deployment, consulting. No license-sale framing.
7. Roadmap references are clearly secondary and dated.
8. The closing uses one CTA only, and it matches intent.
9. The reviewer can point to at least one sentence that would matter to an operator, foreman, planner, owner, or evaluator on first read.

## Enforcement rule

The gate is mandatory for all buyer-facing editorial drafts:

- Blog posts in `website/src/content/blog/` must keep `draft: true` until the review passes.
- Articles in `website/src/content/docs/articles/` must include an `editorial-review` block set to `approved` before they are allowed through build.
- A publishable editorial file must carry this metadata block:

```html
<!-- editorial-review
status: approved
reviewer: Content Lead
date: 2026-05-26
guide: 2026-05-26-ery-212
editorial-review -->
```

- The repo check at `website/scripts/check-editorial-review.mjs` now runs inside `npm run build` and `npm run check`.
- If the block is missing or not `approved`, the build fails and the draft gets sent back.

## Operating rule going forward

No article or blog draft publishes unless:

1. the checklist above passes,
2. the reviewer records approval in the `editorial-review` block, and
3. the build gate stays green.

If any of those three conditions fail, the draft is not ready and must be rewritten before publish.
