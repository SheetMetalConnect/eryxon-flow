---
title: Latest development at Eryxon Flow and the road to v0.7
description: The current public release is still v0.5.1. This update shows what is already proven in the v0.6 rollout stream, what is being tightened next, and what must be true before calling the next line v0.7.
head:
  - tag: meta
    attrs:
      property: og:image
      content: /social/blog/latest-development-and-road-to-v0-7/og.svg
  - tag: meta
    attrs:
      name: twitter:image
      content: /social/blog/latest-development-and-road-to-v0-7/og.svg
---

The public release is still **v0.5.1**.

This post is not a release announcement for v0.7. It is a status update on what is already proven in the public rollout stream and what still has to be true before the next line is publishable with confidence.

## What is already public and verifiable

- [Shift handoff with remarks](/guides/shift-handoff-remarks/) documents the operator handoff path.
- [v0.6 release checks](/guides/v06-release-checks/) defines concrete go or no-go checks before expanding rollout.
- [Troubleshooting](/guides/troubleshooting/) now includes handoff-focused checks for real-floor use.

## What is being tightened now

1. Handoff context inside operator flow so critical pickup notes are harder to miss.
2. Build identity and diagnostics so rollout teams can verify behavior against a specific build.
3. Safer CAD and PMI processing paths so browser configuration is not treated as secret storage.

## What “road to v0.7” means

The bar is not “more features.” The bar is operational confidence:

- the next operator sees the right context,
- rollout teams can identify exactly what build they are validating,
- technical part processing runs through defensible production paths.

## If you are evaluating now

Start with the current release and the existing proof trail:

- [Quick start](/guides/quick-start/)
- [v0.6 release checks](/guides/v06-release-checks/)
- [Managed rollout](/managed-rollout/)
