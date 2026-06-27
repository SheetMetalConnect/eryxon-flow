---
title: "How an admin sets up and runs Eryxon Flow"
description: "The admin path end to end: define the shop, bring in jobs and routing, schedule capacity, configure the terminal, and watch the floor — without naming a single competitor or touching code."
pubDate: 2026-06-27
author: "Eryxon"
authorRole: "Eryxon Flow"
category: "Operations"
tags: ["admin", "setup", "workflow"]
ctaIntent: "trial"
relatedLinks:
  - label: "Admin manual"
    href: "/guides/admin-manual/"
  - label: "Quick start"
    href: "/guides/quick-start/"
---

An admin runs the side of Eryxon Flow the floor never sees: the shape of the shop, the work coming in, and the signals that tell whether the floor is keeping up. Here is that path end to end.

## Define the shop

Setup starts with the work centers. **Cells** are the columns the floor sees in its queue. **Resources** are the machines and tools, and they can be tied to the cells they belong to, so the queue and the floor agree on what runs where. **Materials** and **scrap reasons** fill in the reference data the rest of the system leans on.

This is the layer that makes every later view read like the real shop instead of a generic board.

## Bring in the work

Jobs hold parts; parts hold operations; operations carry the routing that moves a part from cell to cell. Work can be entered directly or imported in bulk. Each operation gets a planned time and, where it matters, a planned start, so the schedule has something to reason about.

An admin can correct a plan after the fact — planned hours and the planned window stay editable from the operation detail, next to the booked hours, so the estimate can be trued up against reality.

## Schedule the capacity

With routing in place, the planning views show load against capacity: a capacity matrix across cells and a day-by-day allocation per operation. A factory calendar sets working hours and closures. The point is not a perfect Gantt chart — it is knowing which cells are over capacity before the floor finds out.

## Configure the terminal

The operator terminal is configurable per tenant. Work modes separate setup and prep from production, with optional working-hours enforcement. Drop-off location tracking is a per-tenant toggle, off by default; turn it on and operators record where a finished part is placed. None of this is on unless the admin asks for it.

## Watch the floor

Monitoring is where an admin spends the running day. The **dashboard** shows active work and progress. **Time tracking** rolls operator hours up by person and by order, expandable to the booked-against-planned variance per operation. **Issues** collect the quality reports operators raise, each carrying the cell context it was raised in.

## Connect and extend

API keys, webhooks, and an MCP server open the data to the tools a shop already runs. Self-hosting keeps all of it on the shop's own infrastructure under Apache 2.0, with no per-user fee. The [hosted version](https://app.eryxon.eu) runs the same software at a flat rate when an admin would rather not operate it.

That is the admin loop: define the shop, bring in the work, schedule it, set the terminal to match how the floor actually runs, and watch the signals that say whether it is keeping up.
