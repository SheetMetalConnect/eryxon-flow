---
title: "Cards: Bullet & Yellow"
description: "Two simple cards you add to a part or job — Bullet for always-on-top priority, Yellow for on-hold that frees capacity."
---

Eryxon Flow is an MES for high-mix manufacturing. It borrows a couple of ideas from QRM (Quick Response Manufacturing) — mainly its focus on flow — but it does **not** implement POLCA: there are no card loops and no paired-cell authorization. We keep the few things that help on a busy floor and leave the rest.

One of those things is a pair of cards you can put on a part or job: the **Bullet Card** and the **Yellow Card**. That's the whole set. There is no free-form priority number and no generic "rush" flag.

## Bullet Card — priority

A **Bullet Card** marks a part or job as priority. Today it sorts that part to the top of the parts list and highlights it (a badge, a coloured row) wherever its work appears, so planners and operators can spot it at a glance.

Use it sparingly — its value comes from being rare. If many jobs carry one, the signal stops meaning anything. That's a guideline for the planner, not a limit the app enforces.

## Yellow Card — on hold, frees the slot

A **Yellow Card** puts work on hold (waiting on material, an answer, a tool, an inspection). A yellow-carded operation is set aside in the queue and, the part that matters for flow, **drops out of the capacity views and the cell's load count** — so parking it frees the slot and other work keeps moving.

Take the card off and the work returns to normal.

## Who applies them

Operators work the queues and see the cards' effect. Admins and team-leaders apply and remove the cards — putting a part on top, or parking one — because that's a planning decision.

> Note: parts of the operator UI still label the Bullet Card as "Rush". That wording is being corrected; the card itself is unchanged.
