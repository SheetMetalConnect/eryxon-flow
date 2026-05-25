---
title: "Deployment Guide"
description: "Application deployment guide for Eryxon Flow."
---

# Deployment Guide

> **Want to try it first?** Open the <a href="https://app.eryxon.eu" data-cta-id="docs_deployment_hosted_try_first_en" data-cta-surface="deployment" data-cta-kind="hosted_app" data-cta-locale="en">hosted version at app.eryxon.eu</a> before deploying your own instance. It remains online as-is.

For the current `v0.5.2` self-hosted evaluation path, cite this page for the shortest setup route and the [Self-Hosting Guide](/guides/self-hosting/) for the full production checklist. Use the [Changelog](/guides/changelog/) for current release posture; the `v0.5.1` proof snapshot is historical context only.

## Quick Start (Automated)

The fastest way to deploy Eryxon Flow:

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This interactive script handles all setup steps. For manual setup, continue reading.

## Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A [Supabase](https://supabase.com) project

## Step 1: Supabase Setup

### Create Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL**, **anon key**, and **service role key** from Settings > API

### Apply Database Schema
```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
# and VITE_SUPABASE_PROJECT_ID

supabase link --project-ref <your-project-ref>
supabase db push
```

### Set Up Storage & Cron Jobs
```bash
# Apply via SQL Editor in Supabase Dashboard, or:
supabase db execute < supabase/seed.sql
```

This creates storage buckets (`parts-images`, `issues`, `parts-cad`, `batch-images`) and schedules cron jobs.

### Deploy Edge Functions
```bash
supabase functions deploy
```

### Set Edge Function Secrets
```bash
supabase secrets set \
  SUPABASE_URL=<your-project-url> \
  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Optional secrets:
| Secret | Purpose |
|--------|---------|
| RESEND_API_KEY | Email invitations via Resend |
| APP_URL | Base URL for invitation links |
| EMAIL_FROM | Sender email for invitations |
| CRON_SECRET | Auth for monthly-reset-cron |
| SELF_HOSTED_MODE | Set to "true" for self-hosted mode |

## Step 2: Deploy Frontend

### Option A: Local Development
```bash
npm ci
npm run dev
```

### Option B: Cloudflare Pages
1. Connect your Git repository to Cloudflare Pages
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add environment variables in Cloudflare Pages settings

### Option C: Docker
```bash
docker build \
  --build-arg VITE_SUPABASE_URL=<url> \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=<key> \
  --build-arg VITE_SUPABASE_PROJECT_ID=<project-id> \
  -t eryxon-flow .

docker run -p 80:80 eryxon-flow
```

### Option D: Docker Compose + Optional Caddy HTTPS

`v0.5.2` uses a single `docker-compose.yml` as the current self-hosted Docker path. If you want HTTPS, enable the optional `caddy` service that already ships in that file and edit the included `Caddyfile` for either a public hostname or a LAN-only rollout.

```bash
# In docker-compose.yml: uncomment the optional `caddy` service and the
# `volumes:` block at the bottom, then change the eryxon-flow service from
# `ports: ["80:80"]` to `expose: ["80"]` so Caddy terminates TLS.
# Edit the included Caddyfile to match your public domain or LAN host.
docker compose up -d
```

> **Database Webhook required.** After edge functions are deployed, configure the
> `notify-new-signup` Database Webhook in Supabase so new-company signups trigger
> the notification function. See [Self-Hosting Guide](/guides/self-hosting/) Step 7.

## Step 3: First Login

1. Navigate to your deployment URL
2. Click "Sign Up" to create the first admin account
3. The first user automatically becomes admin with their own tenant

## Optional: Cloudflare Turnstile (CAPTCHA)

Turnstile is optional. Without it, auth works but without bot protection.

To enable:
1. Create a Turnstile widget at [Cloudflare Dashboard](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Set `VITE_TURNSTILE_SITE_KEY` in your environment
3. Configure the Turnstile secret key in Supabase Dashboard > Auth > Captcha
4. On Vercel, keep the repo `vercel.json` so SPA rewrites and CSP headers continue to allow `https://challenges.cloudflare.com`

## Verification

Run the verification script to check your setup:
```bash
chmod +x scripts/verify-setup.sh
./scripts/verify-setup.sh
```

## Full Documentation

See the [Self-Hosting Guide](/guides/self-hosting/) for the complete rollout, troubleshooting, and environment notes.
