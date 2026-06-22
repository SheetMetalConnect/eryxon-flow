---
title: "Eryxon Flow v0.7: location-aware work, issue reporting, and operator modes"
description: "The v0.7 release candidate tightens the shop-floor loop: part location context, more reliable issue reporting, manufacturing-aware work queues, and setup/production modes."
pubDate: 2026-06-20
author: "Eryxon"
authorRole: "Eryxon Flow"
category: "Development"
tags: ["v0.7", "operator terminal", "issue reporting", "planning"]
featured: true
heroImage: "/social/blog/eryxon-flow-v0-7-what-we-are-building/og.svg"
ctaIntent: "trial"
relatedLinks:
  - label: "Roadmap"
    href: "/roadmap/"
  - label: "Changelog"
    href: "/guides/changelog/"
  - label: "Batch Management"
    href: "/features/batch-management/"
---

Eryxon Flow v0.7 is about removing ambiguity on the shop floor. A planner should know where a part is supposed to go next. An operator should know whether work is ready for setup or production. A quality issue should carry enough context to fix the problem without reconstructing the route afterward.

The current release candidate focuses on four connected areas.

## 1. Location-aware part tracking

Issue reports can now carry current and intended next cell context. That matters when a part is physically moving through cutting, bending, welding, finishing, and assembly.

Instead of an issue being a loose note against an order, it can point back to where the part was and where it was expected to go. That makes follow-up clearer for both the operator and the planner.

## 2. More reliable issue reporting

The issue form and attachment flow have been tightened. Operators get clearer feedback when attachments only partially succeed, and the backend keeps tenant-scoped location references intact.

A small database detail matters here: deleting a referenced cell must not null the tenant key on the issue. v0.7 keeps `tenant_id` intact and only clears the nullable cell reference.

## 3. Manufacturing-aware planning and work queues

The planning/work-queue path now carries more manufacturing context: material, thickness, resources, tooling, batches, and lifecycle events.

That is the difference between a generic task list and a queue that actually fits how sheet-metal work moves through a factory.

## 4. Operator terminal work modes

The operator terminal now distinguishes setup/prep from production work. Shared-terminal login and operator switching are part of the same flow, so one tablet can serve a real cell instead of one idealised user session.

Readiness labels make the next action clearer: is this work ready for setup, ready for production, or waiting on something else?

## What is still separate

This release candidate updates the app and the public v0.7 story. Final production release approval remains separate from the pull request.

The goal is simple: less reconstruction after the fact, more live context at the machine, and a cleaner handoff between operator and planner.
