---
title: Why Eryxon Flow moved to Apache 2.0
description: Eryxon Flow is now source-available under Apache 2.0 so job shops can use, fork, modify, and deploy it freely, while Eryxon continues to offer hosted, managed, and rollout support as services.
head:
  - tag: link
    attrs:
      rel: canonical
      href: https://eryxon.eu/blog/why-eryxon-flow-moved-to-apache-2-0/
  - tag: meta
    attrs:
      property: og:image
      content: /social/blog/why-eryxon-flow-moved-to-apache-2-0/og.svg
  - tag: meta
    attrs:
      name: twitter:image
      content: /social/blog/why-eryxon-flow-moved-to-apache-2-0/linkedin.svg
---

**Dek:** For metalworking operators, production leads, and evaluators, the move to Apache 2.0 changes the first question from "What am I allowed to do?" to "How do I want to run this: self-hosted, hosted, or with rollout help?"

If you run a fabrication shop, the useful licensing question is not whether the repository is merely visible. The useful question is whether your team can inspect the code, self-host it, adapt it to your routing and operator flow, and keep control of your production data without negotiating around usage limits first.

That is why the Apache 2.0 shift matters. It gives evaluators a cleaner answer up front while leaving Eryxon free to offer hosted, managed, and supported rollout help as services.

## What changed

### 1. Apache 2.0 removes the licensing detour from technical evaluation

Most job shops do not want to stall an MES evaluation on avoidable legal ambiguity. They want to know:

- Can we run this for our own production operation?
- Can we maintain our own fork if we need shop-specific changes?
- Can we still ask for rollout or integration help without being locked into it?

The current website framing answers those questions more directly. Eryxon Flow is described as Apache 2.0, with self-hosting, hosted access, and managed rollout presented as deployment choices instead of license gates.

### 2. Open source does not remove the services business

Apache 2.0 does not mean Eryxon stops offering commercial help. It means the code is open while the business can still offer services around it.

For evaluators, that is the practical split:

- self-host it if your team wants full infrastructure control
- use the hosted version if you want to test the workflow quickly
- ask for managed rollout or supported deployment help if you want Eryxon involved in setup, operations, or integration

That distinction matters because production teams should buy services because they reduce rollout work, not because the license blocks them from using the software.

### 3. The product already gives teams something real to evaluate

The Apache 2.0 story only works if there is a real product behind it. The current website and docs already point evaluators to concrete rollout proof:

- tablet-friendly operator work queues
- self-hosting and deployment guides
- REST API and MCP server documentation
- rollout checks and troubleshooting paths for shop-floor trials

That keeps the licensing story grounded in what a team can actually test instead of turning it into abstract positioning.

## Proof

- [Homepage](/) for the Apache 2.0 and deployment-choice framing
- [Changelog](/guides/changelog/) for the current maintenance-line context
- [Self-Hosting](/guides/self-hosting/) for the deployment path
- [Managed Rollout](/managed-rollout/) for the supported-services path

## Where to go next

If you want to evaluate Eryxon Flow with maximum control, start with the [self-hosting guide](/guides/self-hosting/) and the [changelog](/guides/changelog/) so your team can review the current rollout posture in concrete terms.

If you want a walkthrough, trial review, or deployment conversation, open the [hosted version](https://app.eryxon.eu) first and then continue to [Managed Rollout](/managed-rollout/).
