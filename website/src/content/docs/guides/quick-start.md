---
title: "Quick Start"
description: "Get up and running with Eryxon Flow in minutes."
---



Get Eryxon Flow running in under 10 minutes.

> **Just want to explore?** Try the [live demo at app.eryxon.eu](https://app.eryxon.eu) — no setup needed. Sign up and start exploring immediately.

---

## Prerequisites

- Node.js 18+ ([download](https://nodejs.org))
- A Supabase account (free tier works) - [sign up](https://supabase.com)

---

## Step 1: Set Up Supabase (5 minutes)

### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it `eryxon-flow`
3. Save your database password
4. Click **Create**
5. Wait ~2 minutes for setup

### 1.2 Get Your Keys

Go to **Settings** → **API** and copy:
- **Project URL** (e.g., `https://abc123.supabase.co`)
- **anon public key** (starts with `eyJ...`)

### 1.3 Apply Database Schema

1. Go to **SQL Editor**
2. Copy contents of `supabase/schema.sql` from this repo
3. Paste and click **Run**

---

## Step 2: Run the Application (3 minutes)

```bash

git clone https://github.com/your-org/eryxon-flow.git
cd eryxon-flow


npm install


cp .env.example .env
```

Edit `.env`:
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

Start the app:
```bash
npm run dev
```

Open **http://localhost:8080**

---

## Step 3: Create Your Account (1 minute)

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
| `/operator/terminal` | Shop floor interface |
| `/admin/config/stages` | Configure workflow stages |

---

## What's Next?

**Setup & Deployment:**
- [Self-Hosting Guide](/guides/self-hosting) - Production deployment options
- [MCP Server Setup](/guides/mcp-setup) - AI assistant integration setup

**API & Integration:**
- [REST API Documentation](/architecture/connectivity-rest-api) - Complete API reference
- [MCP Demo Guide](/api/mcp-demo-guide) - AI assistant usage examples
- [Connectivity Overview](/architecture/connectivity-overview) - Integration architecture
- [Webhooks & MQTT](/architecture/connectivity-mqtt) - Event-driven integration
- **Swagger/OpenAPI** - Available in the app at `/api-docs`

**Architecture & Help:**
- [App Architecture](/architecture/app-architecture) - System design overview
- [Database Schema](/architecture/database) - Data model reference
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

- Check the [documentation](../README.md)
- Open an issue on GitHub
- Join our community discussions

---

*Happy manufacturing!*
