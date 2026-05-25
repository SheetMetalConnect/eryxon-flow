# ERY-97 Brand-System Awareness Rollout Package

Date: 2026-05-24
Owner: CMO
Issue: [ERY-97](/ERY/issues/ERY-97)
Parent: [ERY-76](/ERY/issues/ERY-76)
Related: [ERY-53](/ERY/issues/ERY-53), [ERY-54](/ERY/issues/ERY-54), [ERY-59](/ERY/issues/ERY-59), [ERY-68](/ERY/issues/ERY-68), [ERY-80](/ERY/issues/ERY-80), [ERY-89](/ERY/issues/ERY-89), [ERY-9](/ERY/issues/ERY-9), [ERY-16](/ERY/issues/ERY-16)

## Objective

Turn the board steer in [ERY-76](/ERY/issues/ERY-76) into one live execution path for website messaging, docs framing, release communications, and awareness assets using the full brand system rather than one-off partial derivatives.

This package does not replace the existing briefs. It tells the team which existing issues already cover the rollout, what order they should run in, and which gap still needed a named owner.

## Executive Decision

The rollout should run as one connected system with four layers:

1. design-system source and Astro implementation foundation
2. buyer-path messaging and release-safe public framing
3. canonical website assets that carry the current release story
4. weekly and biweekly derivative distribution that always points back to the canonical asset

The practical rule for this release window is simple:

- no more isolated copy patches that keep the old docs-first shell alive as the effective homepage strategy
- no public awareness asset ships unless it points to a website surface that already reflects the approved buyer path
- no derivative social or outbound message invents claims beyond the approved release and proof packets

## Existing Issue Alignment

| Need | Existing issue | Owner | Status | Operational role |
| --- | --- | --- | --- | --- |
| Astro redesign foundation and full-system implementation path | [ERY-53](/ERY/issues/ERY-53), [ERY-60](/ERY/issues/ERY-60), [ERY-61](/ERY/issues/ERY-61), [ERY-72](/ERY/issues/ERY-72) | CTO, Website Engineer, Engineer | planned or blocked | Replaces the partial Starlight-derived marketing shell with explicit landing, docs-entry, blog, and release-note surfaces. |
| Buyer-path messaging and IA | [ERY-54](/ERY/issues/ERY-54) | CMO | in review | Defines the public narrative, navigation priorities, CTA hierarchy, and claim boundaries. |
| v0.6 release posture and launch-safe claims | [ERY-59](/ERY/issues/ERY-59) | CMO | in review | Keeps native and rollout language tied to guided rollout and technical evaluation, not hype. |
| CTA routing and first measurement layer | [ERY-9](/ERY/issues/ERY-9) | CTO | in review | Preserves the distinction between hosted trial, managed rollout, and self-hosted evaluation. |
| Proof packet for marketing reuse | [ERY-80](/ERY/issues/ERY-80) | CTO | working artifact | Gives content and marketing one approved proof source instead of scattered repo archaeology. |
| Six-week content and social cadence | [ERY-68](/ERY/issues/ERY-68) | Content Lead | in review | Turns the canonical website story into reusable week-by-week publishing outputs. |
| v0.6 communications rhythm and message consistency | [ERY-89](/ERY/issues/ERY-89) | CMO | done | Sets the two-week release rhythm and weekly derivative expectations. |
| Post-implementation CTA and managed-rollout validation | [ERY-16](/ERY/issues/ERY-16) | CTO | in progress | Provides the smallest existing verification lane for public conversion behavior after implementation lands. |

## Rollout Order

### Phase 1: lock the system inputs

- [ERY-54](/ERY/issues/ERY-54) remains the messaging and IA source.
- [ERY-59](/ERY/issues/ERY-59) remains the release-claim source.
- [ERY-80](/ERY/issues/ERY-80) remains the technical proof packet for public reuse.

### Phase 2: ship the full public surface

- [ERY-60](/ERY/issues/ERY-60) must implement the landing-page and buyer-path surfaces as first-class Astro pages.
- [ERY-61](/ERY/issues/ERY-61) must migrate docs-entry and shared chrome into the same system.
- [ERY-72](/ERY/issues/ERY-72) must supply blog and release-note templates so awareness assets do not get forced back into ad hoc docs pages.

### Phase 3: wire the commercial path and evidence loop

- [ERY-9](/ERY/issues/ERY-9) should stay coupled to the redesign surfaces so hosted, managed-rollout, and docs-entry CTAs can be compared without inventing a parallel analytics model.
- [ERY-16](/ERY/issues/ERY-16) should validate the final CTA path once the redesigned surfaces are live.

### Phase 4: publish from one canonical source

- [ERY-68](/ERY/issues/ERY-68) should only publish derivatives that point back to the approved website source asset for the cycle.
- [ERY-89](/ERY/issues/ERY-89) defines that operating rhythm and should stay the default cadence model.

## Gap Closed In This Heartbeat

The current tree had implementation work, messaging work, and cadence work, but it did not yet have an explicit checkpoint that proves the redesigned public site is using the full brand system instead of a partial derivative.

This package closes that gap by adding one follow-up issue:

- [ERY-103](/ERY/issues/ERY-103) design-system parity audit after the redesigned landing, docs-entry, and editorial surfaces are implemented

That issue should review:

- homepage and route-chooser parity against the approved system
- docs-entry parity after chrome migration
- release-note and blog/editorial template parity
- any deliberate deviations that still need CEO or CMO review before public promotion

## Operating Guardrails

- Lead public messaging with hosted trial, managed rollout, supported deployment, and consulting. Do not collapse back into repo-status-first storytelling.
- Never describe BSL 1.1 as open source.
- Awareness assets should point to a canonical website surface, not a raw docs page unless that docs page is the approved canonical asset for the cycle.
- Social and outbound derivatives must compress approved proof; they do not create new claims.
- Keep repo-backed issue and strategy surfaces technical and public-safe. No pricing, customer names, or private pipeline notes belong here.

## Recommended Operational Additions

These are recommendations, not blockers for the current implementation wave:

- Label: `brand-system`
  Use for any issue that affects parity with the external design system across marketing, docs-entry, or editorial surfaces.
- Label: `public-proof`
  Use for release-story, changelog, screenshot-pack, and claim-validation work that supports public messaging.
- Routine: `biweekly-proof-lock`
  Once timer heartbeats are allowed, wake CMO plus CTO on the two-week release train to confirm source asset, proof packet, and claim scope before derivatives publish.
- Routine: `weekly-derivative-reuse`
  Once routine permissions are available, wake the content owner to turn the current canonical asset into one support-week derivative instead of starting a fresh story.
- Skill: `public-claim-audit`
  A compact repeatable review checklist for public copy so future marketing and engineering tasks catch stale roadmap language, license framing mistakes, and unsupported rollout claims earlier.

## CEO-Ready Next Actions

| Owner | Next action | Why it matters |
| --- | --- | --- |
| Website Engineer | Resume [ERY-60](/ERY/issues/ERY-60) and [ERY-72](/ERY/issues/ERY-72) once dependencies clear, using the redesign as a full system rather than a styled docs patch | This is the main path that satisfies the board request for the public front door. |
| Engineer | Resume [ERY-61](/ERY/issues/ERY-61) after the landing system is stable enough to migrate docs-entry chrome safely | Keeps docs and marketing from drifting into two public brands. |
| CTO | Finish [ERY-9](/ERY/issues/ERY-9) and keep [ERY-80](/ERY/issues/ERY-80) as the proof source for cycle-level content | Protects commercial routing and claim accuracy. |
| Content Lead | Publish from [ERY-68](/ERY/issues/ERY-68) only after the canonical website asset and proof packet are aligned | Prevents social cadence from outrunning the website truth. |
| UXDesigner | Run the new parity audit issue after implementation lands | This is the missing checkpoint that proves the site is using the full brand system. |
| CEO | Decide after `v0.6` whether to formalize the recommended labels and routines for future release cycles | Useful leverage, but not required to unblock the current rollout. |

## Completion Standard For ERY-97

ERY-97 is complete when the rollout path is no longer implicit.

That means:

- the active website, docs, CTA, release, and cadence issues are mapped into one execution path
- the remaining parity gap has a named owner
- the CEO can see blockers, owners, and next actions in one pass
