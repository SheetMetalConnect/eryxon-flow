---
title: "WIP limits per cell, in practice"
description: "Why a work-in-progress limit on each cell does more for a high-mix shop than another scheduling algorithm — and how to set the first one."
pubDate: 2026-05-20
author: "Eryxon"
authorRole: "Eryxon Flow"
category: "Engineering"
tags: ["QRM", "planning"]
ctaIntent: "trial"
relatedLinks:
  - label: "Getting started overview"
    href: "/getting-started/introduction/overview/"
---

A high-mix, low-volume shop rarely has a throughput problem on any single machine. It has a
*queue* problem: too many jobs released to the floor at once, so everything is "in progress" and
nothing is finishing. A work-in-progress (WIP) limit per cell is the simplest tool for that.

## What a WIP limit actually does

A WIP limit caps how many jobs a cell can have open at the same time. When the cell is at its
limit, no new job enters until one leaves. That single rule does two things:

- It makes the queue *visible* — you can see which cell is the constraint instead of guessing.
- It shortens lead time, because jobs spend less time waiting between operations.

## Setting the first limit

Don't model it. Start from what the cell already runs comfortably on a normal day, set the limit
one above that, and watch for a week.

If the cell is constantly at its limit while others sit idle, you have found your constraint —
that is useful information, not a problem with the limit.

If you want to try this on real data before committing, the hosted version lets you set a per-cell
limit and watch the capacity view react.
