---
title: "Quick Start"
description: "Get up and running with Eryxon Flow in minutes."
---



Get Eryxon Flow up and running.

> **Just want to explore?** Try the [live demo at app.eryxon.eu](https://app.eryxon.eu) — no setup needed. Sign up and start exploring immediately.

---

## Prerequisites

- Node.js 20+ ([download](https://nodejs.org))
- A Supabase account (free tier works) - [sign up](https://supabase.com)

---

## Step 1: Set Up Supabase

### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it `eryxon-flow`
3. Save your database password
4. Click **Create**

### 1.2 Get Your Keys

Go to **Settings** → **API** and copy:
- **Project URL** (e.g., `https://abc123.supabase.co`)
- **anon public key** (starts with `eyJ...`)

### 1.3 Apply Database Schema

Use the Supabase CLI against your target project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 1.4 Apply Seed Data

The seed file sets up storage policies, RLS defaults, and cron jobs:

```bash
supabase db execute --file supabase/seed.sql
```

### 1.5 Create Storage Buckets

```bash
supabase storage create parts-images
supabase storage create issues
supabase storage create parts-cad
supabase storage create batch-images
```

### 1.6 Deploy Edge Functions

```bash
supabase functions deploy
```

### 1.7 Set Edge Function Secrets

Go to **Settings** → **API** and copy the **service_role** key, then:

```bash
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

For hosted and self-hosted environments on release `0.3.3`, configure the `notify-new-signup` Database Webhook explicitly after migrations are applied.

> **Prefer automation?** Run `bash scripts/setup.sh` instead — it walks through all of the above interactively.

---

## Step 2: Run the Application

```bash

git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow


npm install


cp .env.example .env
```

Edit `.env`:
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

Start the app:
```bash
npm run dev
```

Open **http://localhost:8080**

---

## Step 3: Create Your Account

1. Click **Sign Up**
2. Enter email and password
3. Verify email (check inbox)
4. You're now admin of your organization!

---

## Step 4: Explore (Optional)

### Load Demo Data

Want to see the app with sample data?

1. Go to **Settings** → **Organization**
2. Click **Load Demo Data**
3. Explore sample jobs, parts, and operations

### Quick Tour

| Page | What it does |
|------|--------------|
| `/admin/dashboard` | Production overview |
| `/admin/jobs` | Manage manufacturing jobs |
| `/admin/jobs/new` | Create new job |
| `/operator/work-queue` | Operator task list |
| `/operator/login` | Shop floor terminal login |
| `/admin/config/stages` | Configure workflow stages |

---

## What's Next?

**Setup & Deployment:**
- [Deployment Guide](/guides/deployment/) - Production deployment options
- [Self-Hosting Guide](/guides/self-hosting/) - Environment and rollout details
- [MCP Server Setup](/guides/mcp-setup/) - AI assistant integration setup

**API & Integration:**
- [REST API Overview](/architecture/connectivity-rest-api/) - Integration architecture
- [REST API Reference](/api/rest-api-reference/) - Complete endpoint reference
- [API Payload Reference](/api/payload-reference/) - Copy-paste payload examples
- [MCP Demo Guide](/api/mcp-demo-guide/) - AI assistant usage examples
- [Webhooks & MQTT](/architecture/connectivity-mqtt/) - Event-driven integration
- **Swagger/OpenAPI** - Available in the app at `/admin/api-docs` (requires login)

**Architecture & Help:**
- [App Architecture](/architecture/app-architecture/) - System design overview
- [Database Schema](/architecture/database/) - Data model reference
- [FAQ](/guides/faq) - Frequently asked questions

---

## Common Issues

**Can't sign up?**
- Check your Supabase URL is correct in `.env`
- Verify email settings in Supabase Auth dashboard

**Database errors?**
- Make sure you ran the schema SQL
- Check the SQL Editor for any errors

**Page not loading?**
- Verify both environment variables are set
- Check browser console for errors

---

## Need Help?

- Start from the [documentation home](/)
- Open an issue on GitHub
- Join our community discussions

---

*Happy manufacturing!*
