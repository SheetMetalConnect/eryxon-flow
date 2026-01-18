---
title: "Self-Hosting Guide"
description: "Deploy Eryxon Flow on your own infrastructure"
---

Self-host Eryxon Flow on your own infrastructure. Free and unlimited.

See also: [Edge Functions Setup](/api/edge_functions_setup/), [MCP Integration](/api/mcp_integration/)

> [!IMPORTANT]
> **License & Usage:** Eryxon Flow is licensed under **BSL 1.1**. This means you are free to self-host, modify, and use it for your own business operations. However, you are **not** permitted to commercially resell the software or provide it as a competing SaaS offering. The license converts to Apache 2.0 after 4 years.

---

## Quick Start (Automated) - 10 Minutes

We provide a **deploy.sh** script that handles setup for both Cloud and Self-Hosted environments.

```bash
# 1. Download the repository
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow

# 2. Run the deployment assistant
chmod +x deploy.sh
./deploy.sh
```

Follow the interactive prompts to choose your deployment mode.

### Getting Started (Local Mode)
If you choose **Mode 2 (Self-Hosted)**:
1. The system creates a **Demo Tenant** automatically
2. **Sign up** with any email to create your admin account
3. Go to **Dashboard > Generate Demo Data** to populate the app

> [!TIP]
> **Populate Test Data:** After logging in, go to **Dashboard > Generate Demo Data** to fill the system with realistic manufacturing data.

---

## Deployment Modes

| Option | Description | Best For |
|--------|-------------|----------|
| **1. Supabase Cloud** | Connects to a hosted Supabase project. | Production, easiest setup. |
| **2. Fully Self-Hosted** | Spawns a local Supabase Docker stack. | Air-gapped, offline, full control. |

---

## Manual Deployment: Supabase Cloud

If you prefer to configure manually:

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a project.
2. Get your `Project URL` and `anon/public key`.

### 2. Configure App
Create a `.env` file:
```bash
cat > .env << EOF
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
EOF
```

### 3. Deploy
```bash
docker-compose up -d
```

### 4. Database Setup
Use the Supabase CLI to push migrations:
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-id
supabase db push
supabase functions deploy
```

---

## Manual Deployment: Fully Self-Hosted

For organizations requiring offline capabilities or complete control.

### Prerequisites
- Docker and Docker Compose
- 4GB+ RAM

### Architecture
Spawns a full stack: Postgres, GoTrue (Auth), PostgREST (API), Realtime, Storage, etc.

### Step 1: Clone Supabase Docker
```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

### Step 2: Configure Environment
Edit `.env` and set secure passwords for `POSTGRES_PASSWORD`, `JWT_SECRET`, etc.

### Step 3: Start Services
```bash
docker compose up -d
```

### Step 4: Link App
Configure Eryxon Flow to point to your local services (usually `http://localhost:8000`).

---

## Troubleshooting

### "Invalid API key" error
- Verify `VITE_SUPABASE_PUBLISHABLE_KEY` is correct.
- Use the `anon` key, not `service_role`.

### Edge functions not working
- Verify deployment: `supabase functions list`

---

*Licensed under BSL 1.1 - See [LICENSE](../LICENSE) for terms*
