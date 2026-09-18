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
- Docker, for the local Supabase stack (or a hosted Supabase project)

## Run locally

```sh
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow
npm ci
npx supabase start      # local Postgres, Auth, Storage and Edge Functions; prints the API URL and anon key
cp .env.example .env    # put that URL and anon key in VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev             # http://localhost:8080
```

The first sign-up creates the workshop and its admin. `npx supabase stop` shuts the
local stack down. To develop against a hosted Supabase project instead, put its URL
and anon key in `.env` and skip `supabase start`; the
[Self-Hosting Guide](/guides/self-hosting/) covers migrations, function secrets and
production hosting. Values prefixed with `VITE_` are visible in the browser; keep
service-role keys on the backend.

## Start using the app

Administrators manage jobs, parts, operations, and work cells. Operators use the
[Work Queue and Terminal](/guides/operator-manual/) on phones, tablets, and desktops.
There is one responsive interface across device sizes.

For production rollout, see the [Self-Hosting Guide](/guides/self-hosting/). PWA
installation is optional and must be enabled at build time; see
[PWA configuration](/guides/self-hosting/#optional-pwa-verification).
