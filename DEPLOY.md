# Deployment Guide

> **Want to try it first?** Check out the [live demo at app.eryxon.eu](https://app.eryxon.eu) before deploying your own instance.

## Quick Start (Automated)

The fastest way to deploy Eryxon MES:

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
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

supabase link --project-ref <your-project-ref>
supabase db push
```

### Set Up Storage & Cron Jobs
```bash
# Apply via SQL Editor in Supabase Dashboard, or:
supabase db execute < supabase/seed.sql
```

This creates storage buckets (`parts-images`, `issues`, `parts-cad`) and schedules cron jobs.

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
  -t eryxon-flow .

docker run -p 80:80 eryxon-flow
```

### Option D: Docker Compose (Production with SSL)
```bash
# Edit Caddyfile - replace domain with yours
# Edit docker-compose.prod.yml if needed
docker compose -f docker-compose.prod.yml up -d
```

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

## Verification

Run the verification script to check your setup:
```bash
chmod +x scripts/verify-setup.sh
./scripts/verify-setup.sh
```

## Full Documentation

See [docs/SELF_HOSTING_GUIDE.md](docs/SELF_HOSTING_GUIDE.md) for the complete self-hosting guide including Docker, Cloudflare Pages, and troubleshooting.
