---
title: Work orders from ERP to shop floor and back
description: A grounded look at how Eryxon Flow takes work orders from ERP input to shop-floor execution and sends completion signals back out without forcing teams into double entry.
head:
  - tag: meta
    attrs:
      property: og:image
      content: /social/blog/work-orders-from-erp-to-shop-floor-and-back/og.svg
  - tag: meta
    attrs:
      name: twitter:image
      content: /social/blog/work-orders-from-erp-to-shop-floor-and-back/linkedin.svg
---

*Dek: The ERP can release the order, but the real test starts when a machine operator needs the right drawing, the right next step, and a clean way to send completion back without someone retyping it later.*

A planner releases a job just before lunch. The order is in the ERP. The due date is there. The customer notes are there. But by the time the work reaches the floor, the questions have already started.

Which revision is the current drawing? Is this part staying in cutting or moving to bending next? Did anyone actually close the previous operation, or is the office going to find out at 4:30 that the status never moved?

That is a normal work-order handoff problem in a fabrication shop. The ERP has the commercial record, but it rarely gives the floor a clean execution surface. Eryxon Flow is aimed at that gap. It leaves the ERP as the system of record and handles the part between release and completion where operators, leads, and planners usually lose time.

## Where the ERP stops and the floor starts

In Eryxon, jobs, parts, and tasks come in through the API. Operators work in a mobile and tablet-first interface organized around production stages rather than accounting screens. When work moves, completion events can go back out through outbound integrations.

For most sheet-metal shops, that is the useful boundary:

- what the ERP should own
- what the floor needs to see right now
- what the rest of the business needs back once work is done

Eryxon keeps that scope narrow on purpose. It does not try to take over financial tracking, purchasing, or full BOM management. The practical promise is simpler: keep the ERP in place and make the handoff to production less messy.

## What actually comes in from the ERP

The Jobs API can create a full work-order package in one request: job header, nested parts, and nested operations. The payload reference also shows fields for due dates, notes, priorities, machine instructions, and custom metadata. The floor usually needs more than a work-order number. It needs enough context to run the job without a second round of questions.

For teams that want sync behavior instead of one-time create calls, Eryxon also documents ERP sync endpoints built around `external_id` and `external_source`. That gives the external system a stable way to upsert records without guessing whether the production-side record already exists.

The concept mapping is documented too:

- sales order to job
- work center to cell
- equipment or tooling to resource

Parts and operations can come through the unified ERP sync path or be nested inside the job payload. The office can keep its identifiers and structure, while the floor gets a system built for execution instead of admin entry.

## What the operator sees instead of an ERP screen

An ERP connection is not the end result. The real question is what changes for the operator once the data lands.

The product is described around a stage-based work queue, tablet-friendly screens, drawings, STEP viewing, instructions, and time tracking. Work is grouped the way a shop actually runs: cutting, bending, welding, assembly, and similar production zones. Operators pull from visible queues instead of picking through ERP screens that were never built to drive work at a machine.

That is the point of the handoff. The ERP can keep the commercial and planning record. Eryxon turns that record into something the cell can actually use:

- a queue the operator can scan quickly
- the relevant part and operation context
- attached files and instructions
- live status and time updates visible across the floor

For a production lead, that should mean less walking, fewer status calls, and less guesswork about what is really active.

## How the status gets back out

Inbound sync only solves half the problem. If nothing comes back out, the office is still planning off stale information.

Eryxon supports two outbound paths for production events: webhooks and MQTT. The webhook guide names events such as `operation.completed`, and the MQTT guide shows the same idea for industrial messaging patterns. That gives a shop a documented way to move execution signals back into ERP logic, reporting, or other automation.

The REST API reference also documents diff and sync modes for ERP synchronization, including change detection through `sync_hash`. That matters when a team wants to control updates instead of pushing the full dataset every time.

On the floor and back in the office, the loop is:

1. The ERP sends jobs, parts, and operations into Eryxon.
2. The floor runs the work in a stage-based execution interface.
3. Completion and production events flow back to the systems that need the update.

That is a more workable model than asking supervisors or planners to keep two screens, two spreadsheets, or two versions of the truth lined up by hand.

## Why this is a realistic rollout path for fabrication shops

Custom fabrication shops usually do not break down because there is no software at all. They break down because the boundary between planning and execution is loose and manual.

When work-order context reaches the floor late, operators improvise. When completion status reaches the office late, planners improvise. The result is familiar: extra calls, extra checking, and too much uncertainty around jobs that should already be moving.

Eryxon gives the floor a production-first execution layer while leaving the ERP in charge of the business record. For a shop that already has an ERP but still runs daily handoffs through paper, memory, or manual updates, that is a much more believable improvement path than another full system replacement project.

## Sources behind the article

Every claim above is grounded in public product docs already on the site:

- [Introduction](/introduction/) for the operator-first production model and ERP-first positioning
- [ERP Integration](/features/erp-integration/) for entity mapping, sync fields, and architecture
- [REST API Reference](/api/rest-api-reference/) for inbound endpoints and ERP sync modes
- [API Payload Reference](/api/payload-reference/) for exact create and sync payload examples
- [MQTT & Webhooks](/architecture/connectivity-mqtt/) for outbound production events
- [Changelog](/guides/changelog/) for current release framing and product-status context

## Request a walkthrough of your current handoff
If you want to see whether your current ERP export, trial scope, or deployment plan fits this model, start with a [Managed Rollout](/managed-rollout/). That is the most direct way to review your work-order structure, operator workflow, and rollout constraints before a wider deployment.
