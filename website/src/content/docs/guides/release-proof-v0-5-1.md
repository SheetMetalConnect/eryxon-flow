---
title: v0.5.1 Hotfix Proof Snapshot
description: Historical snapshot of what the v0.5.1 hotfix line proved for self-hosted and integration-heavy job shops before v0.5.2 changed the current release posture.
---

# v0.5.1 Hotfix Proof Snapshot

`v0.5.1` is not the current stable release. This page is a historical proof snapshot of what the May 6, 2026 hotfix clarified for self-hosted and integration-heavy shops before `v0.5.2` changed the current release posture.

It matters because the hotfix tightened the rollout story around docs, batch execution, and MCP integration without pretending to be a feature launch.

**Audience:** Technical evaluators and operations leaders close to rollout.

**Primary CTA:** Review the changelog and supporting docs before deciding between hosted, managed rollout, or self-hosted evaluation.

## What the v0.5.1 hotfix actually covered

- `v0.5.1` was published on May 6, 2026 as a maintenance hotfix on top of `v0.5.0`. It is not the current stable release; use the [website changelog](/guides/changelog/) for the latest release posture.
- The hotfix does not introduce a new module. It tightens the release line around the rollout-critical work already shipped in `v0.5.0`.
- At that point in the release line, the docs clearly separated status: the web app, REST API, webhooks, MQTT, and planning adapters were still Beta, while the MCP server was Live.

For the full engineering-level change list, use the [repository changelog](https://github.com/SheetMetalConnect/eryxon-flow/blob/main/CHANGELOG.md) and the [GitHub release notes](https://github.com/SheetMetalConnect/eryxon-flow/releases).

## Why this release line matters for rollout confidence

### 1. Self-hosted evaluation stopped being implied

The hotfix made the self-hosted path easier to inspect. Evaluators had a starting point in the [Deployment Guide](/guides/deployment/) and [Self-Hosting Guide](/guides/self-hosting/), and they could cross-check the shipped repo posture in the [repository changelog](https://github.com/SheetMetalConnect/eryxon-flow/blob/main/CHANGELOG.md).

### 2. Integration-heavy shops can verify the handoff surfaces

`v0.5.0` shipped the integration surfaces that matter when ERP, planning, or automation tooling has to connect cleanly:

- [Batch & Nesting Management](/features/batch-management/) documents the batch lifecycle, material tracking, nesting visuals, and the `api-batches` / `api-batch-lifecycle` workflow.
- [MCP Server Reference](/api/mcp-server-reference/) documents the self-hosted MCP server, direct Supabase mode, stdio and HTTP transports, and the current tool coverage.

That means evaluators can review the concrete shop-floor and automation touchpoints instead of relying on feature-list language alone.

### 3. The hotfix made status language more disciplined

This hotfix line was careful about status:

- shipped capabilities stayed anchored in docs and release notes,
- Beta surfaces were labeled as Beta,
- roadmap items did not carry the proof story.

That restraint matters for teams comparing deployment risk, especially if they need to justify a pilot internally.

## Proof links to review first

Start here if you want the shortest route from hotfix summary to supporting proof:

1. [Changelog](/guides/changelog/)
2. [Batch & Nesting Management](/features/batch-management/)
3. [MCP Server Reference](/api/mcp-server-reference/)
4. [Repository changelog](https://github.com/SheetMetalConnect/eryxon-flow/blob/main/CHANGELOG.md)
5. [GitHub release notes](https://github.com/SheetMetalConnect/eryxon-flow/releases)

## What this page does not claim

- It does not claim that `v0.5.1` is still current.
- It does not claim that every Eryxon Flow surface is Live today.
- It does not use roadmap items as release proof.
- It does not replace the engineering changelog; it translates one hotfix line into rollout language for evaluators and operators.

## Next step

If you are validating the latest technical fit, start with the [Changelog](/guides/changelog/) and [MCP Server Reference](/api/mcp-server-reference/).

If you already know you want help getting into production, use the [Managed Rollout](/managed-rollout/) page to start the conversation.
