---
title: "A modern MES for high-mix manufacturing, built on QRM principles"
description: "Eryxon Flow tracks Job to Part to Operation through your cells with a flow focus and two simple cards: not priority sprawl, not full POLCA."
pubDate: 2026-06-22
author: "Eryxon"
authorRole: "Eryxon Flow"
category: "Product"
tags: ["QRM", "MES", "high-mix", "planning"]
heroImage: "/social/blog/modern-mes-for-high-mix-built-on-qrm-principles/og.svg"
ctaIntent: "trial"
relatedLinks:
  - label: "Cards: Bullet & Yellow"
    href: "/features/qrm-cards/"
  - label: "WIP limits per cell"
    href: "/blog/wip-limits-per-cell/"
  - label: "Getting started overview"
    href: "/getting-started/introduction/overview/"
---

A high-mix job shop has a different problem from a line. The line runs the same product over and
over; the shop runs a hundred different parts a week, each with its own route. The trouble is rarely
one slow machine. It's work-in-progress piling up everywhere and a priority list that nobody trusts,
because everything is marked urgent.

## What goes wrong on a busy floor

Two things drown a high-mix shop. The first is WIP: too many jobs released at once, so every cell is
"in progress" and nothing finishes. The second is priority noise. Free-form rush flags, a number you
can edit, three different colours for "important", and after a few weeks the planner can't tell what
actually has to ship first. Both problems get worse the more you try to schedule your way out of them.

## Eryxon Flow's take

Eryxon Flow is an MES for high-mix manufacturing. It tracks the real structure of the work, Job to
Part to Operation, as each part moves through your cells, so you always know where a part is and
where it goes next. That part is plain MES: a live picture of the floor instead of a paper traveler
and memory.

The opinion sits on top of it. Instead of a priority field anyone can change, there are exactly two
cards:

- A **Bullet Card** marks a part as the priority. It sorts to the top and gets highlighted wherever
  its work shows up, so planners and operators spot it at a glance. Its value comes from being rare.
- A **Yellow Card** puts an operation on hold (waiting on material, an answer, a tool). The parked
  operation drops out of the cell's capacity and load count, so holding it frees the slot and other
  work keeps moving.

Two cards, not a priority spectrum. That's the whole point: a signal stays a signal when there's only
one of it.

## Pragmatic, not dogmatic

The flow focus and the cards come from QRM (Quick Response Manufacturing) and Rajan Suri's work. We
borrow the ideas that help on a real floor and skip the rest. Eryxon Flow does **not** implement
POLCA: there are no card loops, no paired-cell authorization. It is an MES that follows QRM
principles, not a QRM tool you have to adopt wholesale before it earns its keep.

That matters because most shops can't stop the world to roll out a method. They can put a WIP limit
on one cell, park a stuck job so the cell breathes, and flag the one order that truly has to ship.
Small moves, visible the same day.

The detail of how the two cards behave (who applies them, what happens when a hold comes off) is
on the [Bullet and Yellow card page](/features/qrm-cards/).

## Try it

Want to see it on your own data before committing to anything? Open the
[hosted version](https://app.eryxon.eu) and walk a job through your cells.
