---
title: "Why Eryxon Flow moved to Apache 2.0"
description: "Eryxon Flow is now open source under Apache 2.0: job shops can use, fork, modify, and deploy it freely, while Eryxon keeps offering hosted, managed, and rollout support as services."
pubDate: 2026-05-25
author: "Eryxon"
authorRole: "Eryxon Flow"
category: "Engineering"
tags: ["open source", "licensing"]
featured: true
ctaIntent: "rollout"
relatedLinks:
  - label: "Self-hosting guide"
    href: "/guides/self-hosting/"
    note: "run Eryxon Flow on your own infrastructure"
  - label: "Changelog"
    href: "/guides/changelog/"
    note: "current release status and license note"
---

Eryxon Flow now ships under Apache 2.0. For metalworking operators, production leads, and evaluators comparing rollout fit, that changes the question from "What am I allowed to do?" to "How do I want to run it: self-hosted, hosted, or with rollout help?"

If you run a metalworking shop, the useful question is not whether the repository is merely visible. The useful question is whether your team can inspect the code, self-host it, adapt it to your routing and operator flow, and keep control of your production data without negotiating around licensing limits first.

Eryxon Flow is now licensed under [Apache License 2.0](https://github.com/SheetMetalConnect/eryxon-flow/blob/main/LICENSE). In plain terms, a fabrication shop can use it, fork it, modify it, and deploy it for its own production without a usage restriction. That is a simpler answer for teams evaluating whether the software can fit their process and stay under their control.

## The public proof now lines up around Apache 2.0

The current public documentation says the same thing in every place that matters:

- The live homepage at [eryxon.eu](https://eryxon.eu/) calls Eryxon Flow "open source" and "Apache 2.0," with hosted and managed rollout options presented as deployment choices rather than license gates.
- The [changelog](/guides/changelog/) describes **v0.6** as the current stable line, notes that **v0.5.1** remains the last cut git tag from **May 6, 2026**, and states that Eryxon Flow is free to use, fork, and adapt under Apache 2.0.
- The repository [README](https://github.com/SheetMetalConnect/eryxon-flow/blob/main/README.md) calls Eryxon Flow an open-source MES and says directly that it is free under Apache 2.0 to use, fork, and adapt.
- The repository [LICENSE](https://github.com/SheetMetalConnect/eryxon-flow/blob/main/LICENSE) is the standard Apache License 2.0 text.

That matters because license language is part of product trust. If the website, README, changelog, and license file say the same thing, evaluators can spend their time on rollout fit instead of legal guesswork.

## Apache 2.0 removes the licensing question from rollout planning

Eryxon Flow sits in a category where adoption friction often has less to do with features than with control.

Most job shops want three things at the same time:

1. They want the software to be inspectable.
2. They want the option to self-host close to their own production process.
3. They do not want to bet on a tool that can only be changed by the original vendor.

Apache 2.0 is a clean answer to that evaluation problem. For a shop comparing rollout options, the important freedoms are straightforward:

- You can self-host Eryxon Flow for your own manufacturing operation.
- You can modify workflows, integrations, and screens for your own plant.
- You can hire a partner to help with integration, support, or customization.
- You can keep a maintained fork if your process needs shop-specific changes.
- You can use it commercially without negotiating a special internal-use exception first.

Those allowances follow directly from the Apache 2.0 license text in the repository.

## The shipped product gives operators something real to test

For operators and production leaders, the license model changes the buying risk more than the user interface does.

If you evaluate Eryxon Flow today, you are not looking at a black-box deployment. The public docs already cover [self-hosting](/guides/self-hosting/), [deployment](/guides/deployment/), the [REST API](/api/rest-api-reference/), and the [MCP server reference](/api/mcp-server-reference/). The current README and homepage also call out real shipped capabilities that matter on the floor and during rollout:

- Tablet-friendly operator work queues
- Job, part, and operation tracking across production
- Browser-based 3D STEP viewing
- ERP and planning integrations
- Self-hosted Docker deployment
- Installable desktop PWA on Chrome or Edge
- Live MCP server, with native iOS and Android apps still marked as in development

Just as important, the current status is stated plainly:

- **v0.6** is the current stable line.
- **v0.5.1** is the last cut git tag, dated **May 6, 2026**.
- The hosted version remains online and free to try.
- The web app, REST API, webhooks, MQTT, and planning adapters are still framed as Beta in the changelog, while the MCP server is marked Live.
- Native iOS and Android apps are still in development and not yet released.

That is a more useful adoption frame than generic "open source" language on its own. Shops can see what is already usable, what is still Beta, and what deployment choices exist right now.

## Open source does not remove the services business

Open source does not mean Eryxon stops offering commercial help. It means the code is open while the business can still offer services around it.

The current homepage and README point to the same practical split:

- Self-host it if your team wants full infrastructure control.
- Use the hosted version if you want to try the product quickly.
- Ask for managed rollout or supported deployment help if you want Eryxon involved in setup, operations, or integration.
- Buy services because they reduce rollout work, not because the license blocks you from using the software.

That distinction matters for production leads comparing rollout fit. The product is open source. The commercial offer is hosted, managed, and supported deployment plus implementation help.

## Where to go next

If you want to understand whether Eryxon Flow fits your plant, start with the [self-hosting guide](/guides/self-hosting/) and the [changelog](/guides/changelog/) so your team can review the current release status, deployment path, and integration surface in concrete terms.

If you want a walkthrough, trial review, or deployment conversation, open the [hosted version](https://app.eryxon.eu) to test the workflow and then use [Managed Rollout](/managed-rollout/) for the deployment path discussion.
