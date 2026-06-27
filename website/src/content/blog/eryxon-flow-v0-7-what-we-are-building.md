---
title: "Eryxon Flow v0.7: location-aware work, issue reporting, and operator modes"
description: "v0.7 tightens the shop-floor loop: parts that know where they go next, issue reports with cell context, manufacturing-aware work queues, and a terminal that tells setup apart from production."
pubDate: 2026-06-22
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
  - label: "Release Notes"
    href: "/release-notes/"
  - label: "Batch Management"
    href: "/features/batch-management/"
---

A part moves through cutting, bending, welding, finishing, and assembly. The system should keep up
with it the whole way. v0.7 is about that: less reconstructing what happened, more live context at
the machine.

Four areas, each built around one idea.

## Location-aware part tracking

A planner should be able to answer two questions about any part: where is it now, and where does it
go next. v0.7 makes the route part of the data, not something you piece together from memory or a
paper traveler.

When a part is in the laser cell and headed for bending, the system holds both. A quality issue
raised against it inherits that context instead of being a loose note pinned to an order. The next
person to pick it up sees the route, not a question mark.

## Issue reporting that carries its context

An issue is only useful if it says enough to act on. v0.7 ties each report to the cell the part was
in and the cell it was meant to reach. So a rejected part tells you where the problem showed up and
where it was going, and the planner can reroute or rework without chasing down the operator.

The reporting flow itself got steadier. Operators get clear feedback when an attachment only
partly uploads, so nobody assumes a photo saved when it did not.

## Work queues that read like manufacturing

A generic task list does not fit a sheet-metal shop. v0.7 carries the detail that actually decides
what runs next: material and thickness, the resources and tooling a job needs, batches, and the
lifecycle events that move a part along. Laser-nesting work can run as an automated batch, where one
program drives the whole nest.

The result is a queue an operator can trust at a glance, because it speaks in the terms the floor
already uses.

## Operator terminal work modes

Setup is not production. Dialing in a tool, loading a program, and proving out the first part is
different work from running the batch, and the terminal now treats it that way. Readiness is
explicit: ready for setup, ready for production, or waiting on something.

One terminal serves a whole cell. Operators log in to a shared tablet and switch between each other
without logging the machine out and back in, so the screen matches how a cell actually runs a shift.

## Try it

Want to see it on real data before committing to anything? Open the
[hosted version](https://app.eryxon.eu) and walk a job through your own cells.
