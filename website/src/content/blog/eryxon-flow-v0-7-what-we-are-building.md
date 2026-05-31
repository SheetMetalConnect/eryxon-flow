---
title: "Eryxon Flow v0.7: CAM, shift handoffs, and what we are building next"
description: "Batch-aware CAM scanning, structured shift-handoff remarks, and hardened multi-tenant deployment. A look at the v0.7 development cycle."
pubDate: 2026-05-28
author: "Eryxon"
authorRole: "Eryxon Flow"
category: "Development"
tags: ["v0.7", "CAM", "batch", "roadmap"]
featured: false
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

Eryxon Flow v0.6 shipped Apache 2.0 licensing, installable PWA support, and a redesigned premium website. v0.7 focuses on three areas that change how operators and planners interact with the system day to day.

## CAM batch connector

The biggest friction point between CAM output and shop-floor execution is the nesting step. A CAM system produces a nest — parts laid out on a sheet — but the MES thinks in individual parts. The operator at the laser scans one barcode and the system needs to understand "this is sheet 3 of WO-4218, containing parts A through F."

v0.7 introduces batch-aware scanning in the operator terminal. Scan the nest sheet. The system maps it to the right job, parts, and quantities. No manual entry.

The CAM connector currently supports WiCAM output. Additional formats are planned.

## Shift-handoff remarks

Operators change shifts. Information gets lost. "Watch the tolerance on part 887" becomes "looked fine to me" becomes a rework order on Wednesday.

v0.7 adds a structured shift-handoff remarks field. The outgoing operator leaves notes per job or cell. The incoming operator sees them at the top of the queue — not on a Post-it behind the machine.

## Multi-tenant deployment hardening

Tenant-scoped storage policies and signed-URL authorization. Private buckets stay private. This matters for hosted and managed-on-prem deployments where data isolation is a requirement.

## What is not in v0.7

No native iOS or Android apps in this cycle. The PWA — installable, offline-capable, tablet-native — is the current mobile strategy. Custom native packaging is on the roadmap for later.

## When

v0.7 is in active development. The marketing website, blog, and documentation are the current operational priority. Follow the changelog for build-by-build updates.
