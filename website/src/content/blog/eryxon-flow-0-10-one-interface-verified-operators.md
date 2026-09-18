---
title: "Eryxon Flow 0.10: one interface, verified operators, transactional production"
description: "0.10 is a hardening release. Phones, tablets and desktops share one operator interface, every production action runs as a database transaction, a PIN binds the employee to the terminal, and self-hosters get versioned images with a clear upgrade path."
pubDate: 2026-09-08
author: "Eryxon"
authorRole: "Eryxon Flow"
category: "Product"
tags: ["v0.10", "operator terminal", "self-hosting", "security"]
featured: true
ctaIntent: "docs"
relatedLinks:
  - label: "Release notes for 0.10.0"
    href: "/release-notes/v0-10-0/"
  - label: "Self-hosting guide"
    href: "/guides/self-hosting/"
  - label: "Operator manual"
    href: "/guides/operator-manual/"
---

0.10 adds little you can see and a lot you can rely on. The work went into the parts of a shop-floor
system that only show up when they fail: two operators pressing Start at the same moment, a
terminal left signed in over a shift change, a container pointed at a backend on the local network.

## One interface for every screen

Since 0.9 the Community edition is a plain web app. 0.10 finishes that move. The separate mobile
pages are gone; a phone, a tablet at the cell and a desktop in the office open the same operator
queue and the same detail panel, laid out for the screen they are on. Old `/m` bookmarks and
installed shortcuts keep working through redirects. Installing the app as a PWA is still possible,
as a build option, and an update waits for a quiet moment instead of reloading mid-shift.

## Production changes are transactions

Starting, pausing, completing an operation, stopping a batch, recording quantities: each of these
now runs as one database transaction with row locking. Two terminals cannot half-start the same
batch, a timer cannot be opened twice, and an operation follows its state machine again: pause
needs work in progress, resume needs a pause, completion needs a start. The browser and the REST
API call the same functions, so an ERP integration gets exactly the rules an operator gets.

Restarting a timer no longer fires a second `operation.started` webhook, and a timer action no
longer rewrites every part of the job. Webhook subscribers see the events that happened.

## The PIN means something

A shared terminal signs in once as a terminal account; the person at the machine identifies with a
badge and PIN. In 0.10 that PIN creates a session bound to the terminal, and the database refuses
production writes without one. Time entries keep both identities: the terminal account and the
verified employee. Reports, activity and the dashboard name the employee, and an expired or cleared
session cannot keep acting. Admins keep account-based access for oversight, and the API keeps its
service credentials.

Tenant boundaries got the same treatment. Storage paths, invitations, subscription fields and API
writes enforce ownership in the database, whatever the client sends.

## Self-hosting with a real release

Every release now comes from one workflow that runs the full check set against a clean database,
builds a versioned image and records the exact commit and image digest in the GitHub release. The
container reads its backend URL at start-up and adds that origin to its Content Security Policy,
so a Supabase instance on a LAN address or a custom domain works without rebuilding the image.
Migrations, Edge Functions and the frontend are applied in that order, and the
[self-hosting guide](/guides/self-hosting/) walks through it.

## Upgrading

Apply the 0.10 migrations before deploying the matching frontend and Edge Functions, back up first,
and run the tenant reference audit that ships with the release. Terminal users verify their PIN
again after the upgrade. Everything else, including the licence, stays as it was.

The full list, with upgrade notes, is in the [release notes](/release-notes/v0-10-0/).
