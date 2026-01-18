---
title: "Self-Hosting Guide"
description: "Deploy Eryxon Flow on your own infrastructure"
---

Self-host Eryxon Flow on your own infrastructure.

See also: [Edge Functions Setup](/api/edge_functions_setup/), [MCP Integration](/api/mcp_integration/)

> [!IMPORTANT]
> **License & Usage:** Eryxon Flow is licensed under **BSL 1.1**. You can self-host, modify, and use it for your own business operations. You cannot commercially resell the software or provide it as a competing SaaS offering. The license converts to Apache 2.0 after 4 years.

---

## Deployment Options

| Option | Complexity | Disk Space | Best For |
|--------|------------|------------|----------|
| **Cloud Supabase + App Container** | Easy | ~500MB | **Recommended** - Most users |
| **Fully Self-Hosted (All Services)** | Advanced | ~20GB+ | Air-gapped environments, full infrastructure control |

**We recommend using Cloud Supabase** for the database and backend services. This guide focuses on that approach first.

---

## Option 1: Cloud Supabase + App Container (Recommended)

This approach deploys the Eryxon Flow app container on your infrastructure while using Supabase Cloud for the database and backend services.

**Why this approach?**
- Minimal disk space (~500MB vs 20GB+ for full self-hosting)
- No database maintenance (Supabase handles backups, updates, scaling)
- Free tier available (suitable for evaluation and small deployments)
- Your app still runs on your infrastructure (Cloudflare Pages, Docker, VPS, etc.)

**What runs where:**
- **Your infrastructure:** Eryxon Flow app container (React frontend)
- **Supabase Cloud:** PostgreSQL database, Auth, Storage, Realtime, Edge Functions

### Prerequisites

- Node.js 18+ and npm (or Docker)
- A Supabase account ([supabase.com](https://supabase.com))
- Git
- Optional: Docker for containerized deployment

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

### Step 6: Deploy the App

**Recommended: Docker Container**

The easiest deployment method is using the provided Docker container:

```bash
# Configure environment
cat > .env << EOF
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
EOF

# Start container
docker compose up -d

# Verify deployment
docker compose ps
```

**Access:** http://localhost (or your configured domain on port 80)

**Alternative: Development Mode**

For local development or testing:

```bash
cp .env.example .env
# Edit .env with your Supabase credentials

npm install
npm run dev
```

**Alternative: Static Build**

For deployment to CDN/static hosting:

```bash
npm run build
# Output in dist/ directory
```

### Step 7: Create Your First User

1. Open the application in your browser
2. Click **Sign Up**
3. Enter your email and password
4. Check your email for verification link
5. First user automatically becomes admin

---

## Option 2: Fully Self-Hosted (All Services)

**Only use this option if you need:**
- Completely air-gapped deployment (no internet access)
- Full control over all infrastructure components
- Custom Supabase modifications

### Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 4GB | 8GB+ |
| Disk Space | 20GB | 50GB+ |
| CPU Cores | 2 | 4+ |

**Important:** Supabase runs 10+ Docker containers (PostgreSQL, Auth, Storage, Realtime, Kong, Studio, etc.). This requires significant disk space and system resources.

**For most users, we recommend Cloud Supabase instead.**

### Architecture

```
+----------------------------------------------------------+
|                      Your Server                          |
+----------------------------------------------------------+
|  10+ Supabase Containers:                                |
|  +---------+  +---------+  +----------+  +----------+    |
|  | Postgres|  | GoTrue  |  |PostgREST |  | Realtime |    |
|  |   DB    |  |  Auth   |  |   API    |  |   WS     |    |
|  +---------+  +---------+  +----------+  +----------+    |
|  +---------+  +---------+  +----------+  +----------+    |
|  | Storage |  |  Kong   |  |  Studio  |  | imgproxy |    |
|  |   API   |  | Gateway |  | (Admin)  |  |          |    |
|  +---------+  +---------+  +----------+  +----------+    |
|  + 6 more containers (Vector, Logflare, etc.)            |
+----------------------------------------------------------+
|  +------------------------------------------------------+|
|  |              Eryxon Flow App Container               ||
|  +------------------------------------------------------+|
+----------------------------------------------------------+
```

### Step 1: Setup Supabase Docker

The `supabase-docker/` directory contains the complete Supabase stack:

```bash
cd supabase-docker
cp .env.example .env
```

### Step 2: Generate Secrets and Configure

**Generate secure secrets:**

```bash
cd supabase-docker

# Generate secrets using provided script
bash utils/generate-keys.sh

# OR manually edit .env with your own secrets
nano .env
```

**Critical settings to change in `.env`:**

```env
# MUST CHANGE - Database password
POSTGRES_PASSWORD=your-super-secret-password

# MUST CHANGE - JWT secret (32+ characters)
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters

# MUST CHANGE - Dashboard credentials
DASHBOARD_USERNAME=your-admin-username
DASHBOARD_PASSWORD=your-secure-dashboard-password

# Update for your domain (or use localhost for local testing)
SITE_URL=http://localhost:3000
API_EXTERNAL_URL=http://localhost:8000

# Email configuration (optional for testing, required for auth)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_SENDER_NAME=Eryxon Flow
```

See `supabase-docker/README.md` for full configuration details.

### Step 3: Start Supabase Services

```bash
# From supabase-docker directory
docker compose up -d

# Verify all containers are running (should see 10+ containers)
docker compose ps

# Check logs if any services fail
docker compose logs
```

**First startup takes 5-10 minutes** as Docker pulls all images.

### Step 4: Apply Database Schema

From the main Eryxon Flow directory:

```bash
cd /path/to/eryxon-flow

# Install Supabase CLI if not already installed
npm install -g supabase

# Apply migrations to local Supabase
# (Use connection details from supabase-docker/.env)
supabase db push --db-url "postgresql://postgres:your-password@localhost:5432/postgres"
```

### Step 5: Deploy Eryxon Flow App

```bash
# Configure app to connect to local Supabase
cat > .env << EOF
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY from supabase-docker/.env>
EOF

# Build and run app container
docker compose up -d
```

**Access points:**
- **App:** http://localhost (port 80)
- **Supabase Studio:** http://localhost:8000 (admin dashboard)
- **Database:** localhost:5432

### Production Checklist

- [ ] **Disk space monitoring** - Supabase containers + PostgreSQL data grow over time (plan for 50GB+)
- [ ] **PostgreSQL backups** - Schedule automated backups (critical!)
- [ ] **SSL/TLS configured** - Use reverse proxy (Caddy/Nginx) with Let's Encrypt
- [ ] **Secrets changed** - All default passwords and keys updated
- [ ] **Email delivery** - SMTP configured for auth emails
- [ ] **Resource monitoring** - Track RAM/CPU usage (10+ containers)
- [ ] **Log rotation** - Configure Docker log limits to prevent disk fill
- [ ] **Security review** - Firewall rules, exposed ports, network isolation

**Disk Space Breakdown:**
- Supabase Docker images: ~5GB
- PostgreSQL data (grows with usage): 1-50GB+
- Logs and temp files: 1-5GB
- App container: ~500MB

**Minimum recommended**: 50GB free disk space for small deployments.

---

## Docker Quick Reference

### docker-compose.yml

```yaml
version: '3.8'

services:
  eryxon-flow:
    build: .
    ports:
      - "80:80"
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
