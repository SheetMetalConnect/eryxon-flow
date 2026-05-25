---
title: "Run a job router without the paper traveler"
description: "How a metalworking job shop can track an order through cutting, bending, and welding without printing a traveler for every job."
pubDate: 2026-05-24
author: "Eryxon"
authorRole: "Eryxon Flow"
category: "Engineering"
tags: ["job shop", "workflow"]
featured: true
ctaIntent: "docs"
relatedLinks:
  - label: "Getting started overview"
    href: "/getting-started/introduction/overview/"
    note: "set up your first work order"
  - label: "Deployment guide"
    href: "/guides/deployment/"
---

**A paper traveler is the document that follows a job around the shop:** which operations it
needs, in what order, and who signed off on each step. It works until a job gets re-prioritised,
an operation moves to a different machine, or someone needs the status while the paper is sitting
on a cart two bays over.

This post walks through the same job — a batch of laser-cut, bent, and welded brackets — tracked
as a digital router instead.

## Start from the operations, not the document

A traveler bundles two different things: the *route* (the ordered list of operations) and the
*status* (where the job is right now). On paper they live on the same sheet, so the status is only
as current as the last person who wrote on it.

Split them. Define the route once as a sequence of operations:

1. Laser cut
2. Deburr
3. Press brake
4. Weld
5. Inspect

The status then becomes a property of the job moving through that route, updated at each station
rather than re-printed.

## Update status where the work happens

The friction with paper is that the update and the work happen in different places. An operator
finishes bending, walks to find the traveler, marks it, and walks back. Each handoff is a chance
for the status to drift from reality.

When the route is digital, the operator marks the operation complete at the station — on a shared
terminal or a phone — and the next station sees the job arrive. No reprint, no walking, no
guessing whether the sheet is up to date.

> "We stopped reprinting travelers the week we switched. The planner's screen and the floor agree
> now, which they never did with paper."

## What this gives a job shop

- **Live status** without chasing paper across the floor.
- **Re-prioritising** a job means moving it in the queue, not reprinting and reshuffling sheets.
- **A record** of when each operation finished, which is the raw material for any later
  conversation about lead time or capacity.

None of this requires ripping out how your shop already routes work. The point is to stop the
status from living on a sheet that goes stale the moment it is printed.
