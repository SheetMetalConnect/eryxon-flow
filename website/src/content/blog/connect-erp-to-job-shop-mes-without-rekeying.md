---
title: "How to connect your ERP to a job-shop MES without rekeying jobs"
description: "A practical ERP sync path for job shops: push jobs, parts, and resources by API, match records by external IDs, preview changes when needed, and return production events by webhook."
pubDate: 2026-05-22
heroImage: "/social/blog/connect-erp-to-job-shop-mes-without-rekeying/og.svg"
author: "Eryxon"
authorRole: "Eryxon Flow"
category: "Integration"
tags: ["ERP", "integration"]
ctaIntent: "docs"
featured: true
relatedLinks:
  - label: "ERP Integration"
    href: "/features/erp-integration/"
  - label: "REST API Reference"
    href: "/api/rest-api-reference/"
  - label: "API Payload Reference"
    href: "/api/payload-reference/"
---

This article is for shop owners, technical leads, ERP implementers, and operations engineers evaluating whether Eryxon Flow can take released work from an ERP without forcing planners or operators to type the same jobs twice. The useful question is not whether an MES has an API. The useful question is whether the API matches how a job shop actually releases, updates, and closes work.

If your ERP already owns customer orders, due dates, routing intent, and work-center assignments, your MES should not force someone in the office to rebuild that same structure by hand. Rekeying creates the exact problems a job shop is trying to remove: duplicate job numbers, stale routings on the floor, and arguments about which system is current.

The current public Eryxon Flow docs show a concrete integration path for that handoff. Jobs, parts, and operations can be created through the REST API. Sync-oriented endpoints use `external_id` and `external_source` so records can be matched back to the ERP. Webhooks push production events back out when work starts, pauses, resumes, or completes.

## What the public integration surface actually covers

The public docs describe three practical pieces of an ERP-to-MES handoff.

First, an ERP or middleware layer can push work into Eryxon Flow over REST. The payload reference shows nested job creation through `POST /api-jobs`, including parts and operations in one request. For sync-driven use cases, the docs also expose `PUT /api-jobs/sync` for single-record upserts and `POST /api-jobs/bulk-sync` for batch updates.

Second, Eryxon Flow keeps an external system key on synced records. The ERP integration guide and architecture docs both point to `external_id` plus `external_source` as the matching pair. Public schema notes also call out `synced_at`, and the integration docs describe `sync_hash` for change detection during repeated sync runs.

Third, the product exposes outbound events so the ERP does not have to poll blindly for every status change. The REST API reference documents webhook support, event subscriptions, HMAC signing, and lifecycle events such as `job.started`, `job.completed`, `operation.started`, and `operation.completed`.

That combination is the difference between "has an API" and "can participate in a production workflow."

## A practical release pattern for job shops

For most fabrication and machining shops, the cleanest rollout is:

1. Use the ERP as the system of record for released work orders.
2. Push jobs into Eryxon Flow with the ERP's own identifier in `external_id`.
3. Include routing structure in the same payload by nesting parts and operations, or use sync endpoints where the source system needs upsert behavior.
4. Let operators execute work in the MES.
5. Subscribe the ERP or integration layer to webhooks so completions and state changes come back automatically.

The public docs support each part of that flow.

The payload reference shows a job payload with nested parts and operations, which is useful when the ERP already knows the routing at release time. The ERP integration page documents dedicated sync endpoints for jobs, cells, and resources, plus the unified `api-erp-sync` endpoint for broader synchronization flows. The API examples page also shows `api-jobs/bulk-sync` as the same endpoint pattern used for repeat imports and updates.

For an implementer, that matters because initial migration and ongoing release usually are not the same problem. A shop often needs one path for loading current work, another for steady-state updates, and a safe way to avoid creating duplicates when the ERP sends the same order again.

## Why `external_id` matters more than a connector logo

Buyers often ask first whether a product has a connector for SAP, NetSuite, or Odoo. That is understandable, but it is not the most important technical question.

The more important question is how the MES preserves identity between systems.

The published Eryxon Flow docs are explicit here: synced records are matched by `external_id` and `external_source` within the tenant. That lets an implementer resend a job from the ERP without creating a second copy just because the MES generated a different internal UUID. The same docs describe unique constraints around that pair and recommend always including those fields for upsert operations.

For a job shop, that is the mechanism that keeps updates boring:

- reschedule the same work order instead of creating a new one
- correct a customer or due date without hand cleanup
- keep cells and resources aligned with the source system
- import the same batch twice without duplicating released work

That is not a glossy partnership claim. It is a data-handling detail, and it is the kind of detail that decides whether an ERP integration survives first contact with production.

## Where the docs show caution and control

The public docs do not just describe write endpoints. They also show control points that matter when the integration is being tested on real work.

The architecture connectivity reference documents `POST /api-erp-sync/diff` to preview changes before applying them and `POST /api-erp-sync/sync` to execute a sync with change detection. The API reference documents field-level validation errors with machine-readable details. The webhook docs show signed outbound events and delivery logging.

That gives a technical lead three useful protections during rollout:

- preview behavior before changing live production data
- inspect validation failures at the field level instead of guessing
- verify outbound event delivery when wiring updates back into the ERP

Those are small details, but they lower the cost of proving the integration on one live workstream before expanding it plant-wide.

## What this means for an owner evaluating fit

If you are an owner or operations lead, the buying question is simple: can the system take released work from your ERP and return production status without forcing extra clerical work?

The current Eryxon Flow docs support a cautious yes to that question within the documented public surface:

- inbound job, part, and operation creation through REST
- upsert patterns using external identifiers
- batch sync support for repeated imports
- supporting sync coverage for cells and resources
- outbound webhooks for lifecycle events

What the docs do not claim is a finished packaged connector for every ERP. The public proof today is an API-first integration surface, not a no-touch marketplace connector library. For many job shops, that is still the right evaluation frame, because the real integration work usually lives in the mapping between your ERP data and your shop's routing model.

## Where to go next

If your team is evaluating how much mapping work an ERP handoff will require, start with the [REST API Reference](/api/rest-api-reference/) and the [API Payload Reference](/api/payload-reference/) to review the exact request and error formats.

If you are already comparing integration approaches, use [ERP Integration](/features/erp-integration/) for the workflow overview and the [REST API architecture reference](/architecture/connectivity-rest-api/) for the sync modes around `api-erp-sync`.
