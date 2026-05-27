---
title: Latest development at Eryxon Flow and the road to v0.7
description: The current public release is still v0.5.1. Here is what the v0.6 handoff stream already proves, what the active working branch is tightening next, and what must be true before Eryxon Flow can credibly call the next line v0.7.
head:
  - tag: meta
    attrs:
      property: og:image
      content: /social/blog/latest-development-and-road-to-v0-7/og.svg
  - tag: meta
    attrs:
      name: twitter:image
      content: /social/blog/latest-development-and-road-to-v0-7/linkedin.svg
---

**Dek:** The current public release is still `v0.5.1`. This update shows what the `v0.6` handoff stream already proves, what the active branch is tightening now, and what must be true before Eryxon Flow can credibly call the next line `v0.7`.

The hardest shop-floor software problems are rarely about adding one more screen. They are about whether the next operator sees the right context, whether the build on the tablet can be identified fast when something breaks, and whether part data moves through the system without leaking fragile setup into the browser.

That is the frame behind our current work. The latest public release is still [`v0.5.1`, published on May 6, 2026](/guides/changelog/). What follows is not a release announcement for `v0.7`. It is a build-in-public update on the proof we already have, the branch work now tightening the next candidate, and the standard we want that next line to meet.

## What is already public in the release trail

The clearest public thread right now is the `v0.6` handoff stream.

- [`Shift Handoff With Work Order Remarks`](/guides/shift-handoff-remarks/) defines the operator problem in plain shop language: unfinished work loses context at shift change unless the next person sees one clear next action.
- [`v0.6 Release Checks for Trial Rollout`](/guides/v06-release-checks/) turns that into a go / no-go checklist before another shift or cell is asked to trust the workflow.
- [`Troubleshooting`](/guides/troubleshooting/) now includes handoff-specific checks so teams can separate a weak note from a real production blocker.

That matters because it narrows the product stance. We are not trying to turn Eryxon Flow into a chat tool. The useful wedge is smaller: one visible operational remark, read where pickup happens, backed by release checks an operations lead can actually run.

## What the current development branch is tightening next

The next step is not a broad feature spree. It is a tighter operating loop around three areas that show up quickly in real trials.

### 1. Handoff context is moving closer to the operator's actual work

The `v0.6` docs stream already explains why remarks matter. The current branch goes one step further by making that context harder to miss inside the operator flow itself: a remark preview on the work card, an editable remarks section in the operation detail view, and direct save feedback instead of hiding notes in admin-only paths.

For a job shop, that is the difference between "we support notes" and "the next shift actually sees the setup warning before starting the job."

### 2. Release handoff is becoming easier to audit

One recurring rollout problem is simple: teams say "latest dev" when what they really need is an identifiable build. The current branch adds a visible app version badge and runtime diagnostics intended to make release smoke and issue handoff more concrete.

That work fits the same direction as the public `v0.6` release-check guide: if a team is trialing a new operator workflow, they should be able to tie behavior to a specific build instead of arguing from memory.

### 3. CAD and PMI processing are being pulled behind a safer server path

Another place where trials get brittle is CAD processing. Browser-visible service details and direct calls can work in a prototype, but they are not the bar for a credible next release. The current branch moves CAD and PMI requests through a dedicated edge-function proxy, removes frontend API-key dependence from the browser config, and adds security-focused coverage around that path.

In plain terms: the goal is to keep STEP and PMI workflows usable without treating browser configuration as a secret-storage layer.

## What "the road to v0.7" actually means for rollout fit

For us, `v0.7` is not "more features than v0.5.1." It is a narrower claim:

1. Operator handoff context must be visible where work changes hands.
2. Release candidates must identify themselves cleanly enough for guided rollout and troubleshooting.
3. CAD-related processing must move through a path we can defend operationally, not just demo successfully.

If those three things hold, the next line will mean something practical to evaluators: less ambiguity at shift change, less guesswork during rollout, and less fragile handling of technical part data.

## Why this matters to operators, leads, and evaluators now

If you are evaluating Eryxon Flow today, the public answer is still the same: start with the current release, the handoff workflow, and the rollout checks. Do not buy into roadmap language alone. Ask whether the operator can see the note, whether your lead can verify the trial, and whether your team can handle CAD-heavy work without bolting on brittle process.

That is the standard we are using internally as well.

## Request a walkthrough or trial review

- If your main concern is shift continuity, start with [Shift Handoff With Work Order Remarks](/guides/shift-handoff-remarks/).
- If you are pressure-testing a trial rollout, run [v0.6 Release Checks for Trial Rollout](/guides/v06-release-checks/).
- If you want to see the operator path with your own examples, [book a release walkthrough](/managed-rollout/).
