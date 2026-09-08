---
title: "Quick Start"
description: "Get up and running with Eryxon Flow in minutes."
---



Get Eryxon Flow up and running.

> **Just want to explore?** Open the <a href="https://app.eryxon.eu" data-cta-id="docs_quickstart_hosted_explore_en" data-cta-surface="quickstart" data-cta-kind="hosted_app" data-cta-locale="en">hosted version at app.eryxon.eu</a> - no setup needed. It's a free 30-day trial.

> Self-hosting runs the free **Community** edition, source-available under the Business Source License 1.1 — free to self-host for a single workshop. Multi-site use needs a commercial licence; see [Editions & Pricing](/pricing/).

---

## Prerequisites

- Node.js **22.12 or newer**
- Access to the private source repository
- A Supabase backend configured for the source revision you will run

For backend setup, migrations, function secrets, and production hosting, follow the
[Self-Hosting Guide](/guides/self-hosting/). It contains the maintained deployment
sequence. The steps below start a local frontend against that prepared backend.

## Run locally

```sh
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow
npm ci
cp .env.example .env
```

Edit `.env` with your backend's public frontend settings:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-key
VITE_SUPABASE_PROJECT_ID=your-project
```

Values prefixed with `VITE_` are visible in the browser. Keep service-role keys and
other private credentials on the backend.

```sh
npm run dev
```

Open [localhost:8080](http://localhost:8080) and sign in. If account registration is
enabled, use **Sign Up** to create your organization first.

## Start using the app

Administrators manage jobs, parts, operations, and work cells. Operators use the
[Work Queue and Terminal](/guides/operator-manual/) on phones, tablets, and desktops.
There is one responsive interface across device sizes.

For production rollout, see the [Deployment Guide](/guides/deployment/). PWA
installation is optional and must be enabled at build time; see
[PWA configuration](/guides/self-hosting/#optional-pwa-verification).
