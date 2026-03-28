---
title: Operator Terminal
description: Touch-friendly workstation view showing what to work on, with live capacity signals.
---

The Operator Terminal is the screen operators see at their workstation. It runs on tablets and large touchscreens on the shop floor. Everything is designed for touch — large tap targets, no tiny buttons, no keyboard needed.

## Selecting Your Cell

When you open the terminal, pick your cell (workstation) from the cell selector at the top. This filters everything to show only work assigned to your cell. If you work at multiple cells, switch between them with one tap.

## The Three Queues

Your work is split into three sections, top to bottom:

### In Process

What you are working on right now. These operations are active — the timer is running. This section is usually one or two items. If something is here, that is your focus.

### In Buffer

What is next. These parts have physically arrived at your cell and are ready to pick up. When you finish your current work, grab the next item from the buffer.

### Expected

What is on its way. These operations are planned for your cell but the parts have not arrived yet. Use this to see what is coming later today or tomorrow.

Each section shows **totals** at the bottom: total estimated hours and total pieces. This gives you a quick sense of how much work is ahead.

## POLCA Cell Signal

Every operation in your queue shows a cell signal like **Laser → Zetten: GO** or **Zetten → Lassen: PAUSE**.

This tells you two things:
- **Your cell → Next cell** — where the part goes after you finish
- **GO or PAUSE** — whether the next cell has capacity to accept work

If the signal says **GO**, the next cell is ready. Work on it. If it says **PAUSE**, the next cell is full. Work on other items with a GO signal first. This keeps parts flowing instead of piling up between stations.

## Backlog Status

The backlog column tells you how urgent each operation is:

| Status | Meaning |
|---|---|
| **Te laat** | Overdue. Should have been done already. |
| **Vandaag** | Due today. Finish before end of shift. |
| **Binnenkort** | Due soon. Coming up in the next few days. |

Combined with the POLCA signal, this helps you decide what to pick up next: overdue GO items first, then today's GO items, then the rest.

## Rush Orders

Rush orders stand out with a red border and always sort to the top of each section. If you see red, that job jumps the queue. Rush orders override normal POLCA priority — work on them even if the next cell shows PAUSE.

## Status Bar

The bar at the bottom of the screen shows your current state:

- **Your name** — confirms who is logged in
- **Current operation** — what you are working on
- **Live timer** — how long you have been on this operation
- **Operator state** — Active, Idle, or Rush

The state updates automatically. When you start an operation, it switches to Active. When nothing is in process, it shows Idle. When you are working a rush order, it shows Rush.

## Detail Panel

Tap any operation to open the detail panel on the right side of the screen. This gives you everything you need without leaving the terminal:

- **3D Viewer** — rotate and inspect the part in 3D
- **PDF Viewer** — open technical drawings, work instructions, or customer specs
- **Routing** — see the full production route with completed and remaining steps highlighted

Close the panel by tapping outside it or pressing the X.

## Tips for Daily Use

- Start your shift by checking the **In Buffer** section. That is your immediate work.
- Watch the POLCA signals. Working on GO items keeps the whole shop moving.
- If everything shows PAUSE, flag your foreman — it usually means a downstream bottleneck.
- Use the detail panel to double-check dimensions or instructions before starting a cut.
- Rush orders (red border) always come first, regardless of other signals.
