---
title: "Self-Hosting Guide"
description: "Step-by-step guide to hosting Eryxon Flow in your own environment."
---



This guide covers how to self-host Eryxon Flow on your own infrastructure. Self-hosting is free, unlimited, and you manage everything yourself.

> [!IMPORTANT]
> **License & Usage:** Eryxon Flow is licensed under **BSL 1.1**. This means you are free to self-host, modify, and use it for your own business operations. However, you are **not** permitted to commercially resell the software or provide it as a competing SaaS offering. The license converts to Apache 2.0 after 4 years.

---

## Deployment Options

| Option | Complexity | Best For |
|--------|------------|----------|
| **Supabase Cloud + Docker** | Easy | Most users, quick setup |
| **Self-Hosted Supabase** | Advanced | Full control, air-gapped environments |

---

## Option 1: Supabase Cloud (Recommended)

The fastest way to get started. Supabase offers a free tier that works for evaluation and small deployments.

### Prerequisites

- Node.js 18+ and npm (or Docker)
- A Supabase account ([supabase.com](https://supabase.com))
- Git

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose your organization
4. Enter project details:
   - **Name:** `eryxon-flow` (or your preference)
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Choose closest to your users
5. Click **Create new project**
6. Wait for project to be ready (~2 minutes)

### Step 2: Get Your Credentials

From your Supabase project dashboard:

1. Go to **Settings** -> **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (for edge functions - keep this secret!)

### Step 3: Apply Database Schema

Using Supabase CLI:
```bash

npm install -g supabase


git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow


supabase link --project-ref your-project-id


supabase db push
```

Or manually:
1. Go to **SQL Editor** in your Supabase dashboard
2. Run the migrations from `supabase/migrations/` in order

### Step 4: Deploy Edge Functions

```bash
cd eryxon-flow


supabase login


supabase functions deploy
```

### Step 5: Configure Storage Buckets

Verify in **Storage** that these buckets exist:
- `parts-images` - For CAD files and part photos
- `issues` - For issue attachments

If missing, create them with:
- **Public:** No
- **File size limit:** 50MB
- **Allowed MIME types:** `image/*`, `application/pdf`, `model/step`

### Step 6: Run the Application

**Option A: Docker (Recommended)**
```bash

cat > .env << EOF
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
EOF


docker-compose up -d
```

**Option B: Development mode**
```bash
cp .env.example .env


npm install
npm run dev

```

**Option C: Production build**
```bash
npm run build

```

### Step 7: Create Your First User

1. Open the application in your browser
2. Click **Sign Up**
3. Enter your email and password
4. Check your email for verification link
5. First user automatically becomes admin

---

## Option 2: Fully Self-Hosted (Air-Gapped)

For organizations requiring complete control over all infrastructure.

### Prerequisites

- Docker and Docker Compose
- 4GB+ RAM
- 20GB+ disk space
- Domain name (for production)
- SSL certificates

### Architecture

```
+----------------------------------------------------------+
|                      Your Server                          |
+----------------------------------------------------------+
|  +---------+  +---------+  +----------+  +----------+    |
|  | Postgres|  | GoTrue  |  |PostgREST |  | Realtime |    |
|  |   DB    |  |  Auth   |  |   API    |  |   WS     |    |
|  +---------+  +---------+  +----------+  +----------+    |
|  +---------+  +---------+  +----------+                  |
|  | Storage |  |  Kong   |  |  Studio  |                  |
|  |   API   |  | Gateway |  | (Admin)  |                  |
|  +---------+  +---------+  +----------+                  |
+----------------------------------------------------------+
|  +------------------------------------------------------+|
|  |              Eryxon Flow (Frontend)                  ||
|  +------------------------------------------------------+|
+----------------------------------------------------------+
```

### Step 1: Clone Supabase Docker Setup

```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

### Step 2: Configure Environment

Edit `.env`:
```env

POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-min-32-chars


ANON_KEY=your-anon-key
SERVICE_ROLE_KEY=your-service-role-key


SITE_URL=https://your-domain.com
API_EXTERNAL_URL=https://your-domain.com


SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_SENDER_NAME=Eryxon Flow
```

### Step 3: Start Supabase Services

```bash
docker compose up -d
docker compose ps  # Verify all services running
```

### Step 4: Apply Schema and Deploy App

```bash



cd /path/to/eryxon-flow
cat > .env << EOF
VITE_SUPABASE_URL=https://your-domain.com
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
EOF

docker build -t eryxon-flow .
docker run -p 3000:80 --env-file .env eryxon-flow
```

### Production Checklist

- [ ] SSL/TLS configured (Let's Encrypt)
- [ ] PostgreSQL backups scheduled
- [ ] Monitoring set up
- [ ] Email delivery configured
- [ ] Security review completed

---

## Docker Quick Reference

### docker-compose.yml

```yaml
version: '3.8'

services:
  eryxon-flow:
    build: .
    ports:
      - "8080:80"
    environment:
      - VITE_SUPABASE_URL=${SUPABASE_URL}
      - VITE_SUPABASE_PUBLISHABLE_KEY=${SUPABASE_ANON_KEY}
    restart: unless-stopped
```

### Quick Start

```bash

export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key


docker-compose up -d


```

---

## MCP Server Setup

Enable AI assistants to interact with your manufacturing data.

### Installation

```bash
cd mcp-server
npm install
npm run build
```

### Configuration

Create `mcp-server/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### Claude Desktop Integration

Add to `~/.claude/config.json`:
```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/path/to/eryxon-flow/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key"
      }
    }
  }
}
```

---

## Troubleshooting

### Common Issues

**"Invalid API key" error**
- Verify `VITE_SUPABASE_PUBLISHABLE_KEY` is correct
- Use the `anon` key, not the `service_role` key

**"Permission denied" on queries**
- Check RLS policies are applied
- Verify user is authenticated
- Check tenant_id matches

**Edge functions not working**
- Verify deployment: `supabase functions list`
- Check logs: `supabase functions logs function-name`

**Storage uploads failing**
- Verify buckets exist with correct names
- Check bucket policies allow authenticated uploads

---

## Updates

```bash

git pull origin main


npm install
npm run build


docker-compose build
docker-compose up -d
```

For database schema updates:
```bash
supabase db push
```

---

## Support

Self-hosting is community-supported only:
- **GitHub Issues:** Bug reports
- **Documentation:** `/docs` folder

Need help with complex deployments? Check out [vanenkhuizen.com](https://www.vanenkhuizen.com/) for consulting services.

---

*Licensed under BSL 1.1 - See [LICENSE](../LICENSE) for terms*
