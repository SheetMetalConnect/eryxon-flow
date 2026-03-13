---
title: "Self-Hosting Guide"
description: "Production-ready self-hosting guide for Eryxon Flow MES"
---

Deploy Eryxon Flow on your own infrastructure with full control.

> Current documented release: `0.3.3`

## Quick Start (Recommended)

The fastest way to get production-ready deployment using our automated script.

### Prerequisites

- Node.js 20+
- Git
- A Supabase project ([supabase.com](https://supabase.com) - free tier available)
- Your Supabase credentials

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow

# Create your .env file (the automated script requires it)
cp .env.example .env
# Edit .env and fill in your Supabase credentials (URL, anon key, project ID)

# Set your database password
export SUPABASE_DB_PASSWORD='your-database-password'

# Run automated setup
chmod +x scripts/automate_self_hosting.sh
./scripts/automate_self_hosting.sh
```

The script will automatically:
1. Install required dependencies (Node.js packages)
2. Install Supabase CLI globally (if not present)
3. Fix configuration issues
4. Link your Supabase project
5. Apply database migrations (schema + seed)
6. Deploy all Edge Functions
7. Run verification checks

### Start Development Server

```bash
npm run dev
# Open http://localhost:5173
```

### First User Setup

1. Navigate to the application
2. Click **Sign Up**
3. Enter email and password
4. **First user automatically becomes admin** with a new tenant

---

## Manual Setup (Step by Step)

Use this for custom configurations or troubleshooting.

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Save these credentials from **Settings** → **API**:
   - **Project URL**: `https://yourproject.supabase.co`
   - **Project ID**: The subdomain (e.g., `yourproject`)
   - **Anon key**: Public key for frontend
   - **Service role key**: Secret key for backend
   - **Database password**: From project creation

### 2. Configure Environment

```bash
# Copy example file
cp .env.example .env
```

Edit `.env`:
```bash
VITE_SUPABASE_URL="https://yourproject.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_PROJECT_ID="yourproject"

# Optional: For database scripts
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_DB_PASSWORD="your-database-password"
```

### 3. Link Supabase Project

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link
supabase login
supabase link --project-ref yourproject
```

### 4. Apply Database Schema

```bash
# Push all migrations
supabase db push

# Verify migrations applied
supabase migration list
```

### 5. Run Seed SQL

Creates storage buckets, RLS policies, and cron jobs:

```bash
# Option A: Using Supabase CLI
supabase db execute --file supabase/seed.sql

# Option B: Via Dashboard
# Go to SQL Editor, paste seed.sql content, and execute
```

### 6. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Set required secrets
supabase secrets set \
  SUPABASE_URL="https://yourproject.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  SELF_HOSTED_MODE="true"
```

> `SELF_HOSTED_MODE` disables hosted-only plan restrictions in edge functions.

### 7. Configure signup notification webhook

Release `0.3.3` keeps the signup notification path free of hardcoded project-specific SQL webhook URLs. Configure this in Supabase Dashboard so the setup stays portable across environments:

1. Open **Database -> Webhooks**
2. Create a webhook named `notify-new-signup`
3. Table: `public.profiles`
4. Event: `INSERT`
5. Type: `Supabase Edge Function`
6. Edge Function: `notify-new-signup`
7. Filter: `record.role = 'admin' AND record.has_email_login = true`

This is required only if you want admin signup email notifications.

### 8. Install and Run

```bash
# Install dependencies
npm ci

# Development mode
npm run dev

# Production build
npm run build
npm run preview
```

---

## Docker Deployment (Production)

### Using Pre-built Image

```bash
# Pull latest image
docker pull ghcr.io/sheetmetalconnect/eryxon-flow:latest

# Run container
docker run -d \
  -p 80:80 \
  --name eryxon-flow \
  --restart unless-stopped \
  ghcr.io/sheetmetalconnect/eryxon-flow:latest
```

> **Note:** Pre-built images have demo Supabase credentials. For production, build your own image.

### Build Custom Image

```bash
docker build \
  --build-arg VITE_SUPABASE_URL="https://yourproject.supabase.co" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key" \
  --build-arg VITE_SUPABASE_PROJECT_ID="yourproject" \
  -t eryxon-flow .

docker run -d -p 80:80 --name eryxon-flow eryxon-flow
```

### Docker Compose (Recommended)

The repository ships with a ready-to-use `docker-compose.yml`. To use the pre-built image:

```bash
docker compose up -d
```

To build a custom image with your own Supabase credentials baked in, replace the `image` line in `docker-compose.yml` with a `build` block:

```yaml
services:
  eryxon-flow:
    # Replace this:
    #   image: ghcr.io/sheetmetalconnect/eryxon-flow:latest
    # With this:
    build:
      context: .
      args:
        VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
        VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY}
        VITE_SUPABASE_PROJECT_ID: ${VITE_SUPABASE_PROJECT_ID}
    container_name: eryxon-flow
    restart: unless-stopped
    ports:
      - "80:80"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Make sure the corresponding `VITE_SUPABASE_*` variables are set in your `.env` file (Docker Compose reads `.env` automatically).

Then rebuild and start:
```bash
docker compose up -d --build
```

### Docker Compose with SSL (Production)

The repository includes `docker-compose.prod.yml` with Caddy reverse proxy for automatic HTTPS:

```yaml
services:
  app:
    image: ghcr.io/sheetmetalconnect/eryxon-flow:latest
    container_name: eryxon-flow
    restart: unless-stopped
    expose:
      - "80"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  caddy:
    image: caddy:alpine
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app

volumes:
  caddy_data:
  caddy_config:
```

Edit the included `Caddyfile` — replace the domain with yours:

```caddyfile
your-domain.com {
    reverse_proxy app:80

    header {
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

Save the above Docker Compose configuration as `docker-compose.prod.yml`, then deploy:
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Cloudflare Pages Deployment

Best for edge deployment with global CDN.

1. **Connect Repository**
   - Go to [Cloudflare Pages](https://dash.cloudflare.com/)
   - **Create a project** → Connect your Git repository

2. **Configure Build**
   - **Build command**: `npm run build`
   - **Output directory**: `dist`

3. **Set Environment Variables**
   ```bash
   VITE_SUPABASE_URL=https://yourproject.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   VITE_SUPABASE_PROJECT_ID=yourproject
   ```

4. **Deploy**
   - Cloudflare handles SSL, CDN, and global distribution automatically

---

## Optional Enhancements

### Email Notifications (Resend)

Enable automated email invitations and admin signup notifications:

```bash
supabase secrets set \
  RESEND_API_KEY="re_your_api_key" \
  APP_URL="https://your-domain.com" \
  EMAIL_FROM="Eryxon <noreply@your-domain.com>" \
  SIGNUP_NOTIFY_EMAIL="admin@your-domain.com"
```

> `SIGNUP_NOTIFY_EMAIL` is the address that receives notifications when a new company signs up. Required for the `notify-new-signup` edge function to send emails.

### Cloudflare Turnstile (CAPTCHA)

Add bot protection to auth forms:

1. Create widget at [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Add to `.env`:
   ```bash
   VITE_TURNSTILE_SITE_KEY="your-site-key"
   ```
3. Configure secret key in Supabase **Authentication** → **Captcha Protection**
4. On Vercel, keep the repo `vercel.json` so SPA rewrites and CSP headers continue to allow `https://challenges.cloudflare.com`

### Redis Caching (Upstash)

Improve Edge Function performance:

```bash
supabase secrets set \
  UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io" \
  UPSTASH_REDIS_REST_TOKEN="your-token"
```

### 3D STEP Viewer & CAD Processing

The built-in 3D STEP viewer works **out of the box** using browser-based WASM parsing (`occt-import-js`). No server-side CAD service is required.

**How it works:** STEP/STP files uploaded to the `parts-cad` storage bucket are parsed client-side using WebAssembly. The viewer supports orbit controls, exploded view, wireframe mode, and measurement tools (distance, angle, radius).

**CSP requirements:** The STEP parser needs specific Content Security Policy directives. These are already configured in the shipped `index.html` and `vercel.json`, but if your reverse proxy (Nginx, Caddy, Cloudflare) **adds its own CSP headers**, make sure they include:

```
script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net;
worker-src 'self' blob:;
```

| Directive | Reason |
|-----------|--------|
| `'unsafe-eval'` | Emscripten embind (occt-import-js) uses `new Function()` |
| `'wasm-unsafe-eval'` | Explicit WASM compilation permission |
| `https://cdn.jsdelivr.net` | CDN host for the `occt-import-js` library |
| `worker-src blob:` | occt-import-js creates Web Workers from blob URLs |

> **Note:** The default Nginx and Caddy configs shipped with this repo do **not** set CSP headers (they rely on the `<meta>` tag in `index.html`), so you only need to worry about this if you add custom CSP rules at the proxy level.

**Optional: Server-side CAD processing**

For server-side geometry extraction and PMI (Product Manufacturing Information) data, configure an external CAD service:

```bash
VITE_CAD_SERVICE_URL="https://your-cad-service.example.com"
VITE_CAD_SERVICE_API_KEY="your-api-key"
```

If not configured, browser-based processing is used automatically. The viewer supports three backend modes: `custom` (Eryxon3D Docker), `byob` (Bring Your Own Backend), and `frontend` (browser-only, the default).

### MCP Server (Optional - Local Use Only)

The MCP server is **NOT part of the deployment stack**. It's an optional local tool for Claude Desktop integration.

**What it does:**
- Allows Claude Desktop to interact with your database using natural language
- Provides 55 tools for managing jobs, parts, operations via AI

**Quick start:**
```bash
cd mcp-server
npm install && npm run build
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"
npm start
```

**Complete setup instructions:** See [MCP Setup Guide](/guides/mcp-setup) for:
- Local development setup
- Cloud deployment (Railway, Fly.io, Docker)
- Claude Desktop configuration
- All 55 available tools

> **Note:** Your self-hosted application works perfectly without the MCP server. It's only for developers who want AI assistant integration via Claude Desktop.

---

## Verification

Run the verification script to check your setup:

```bash
bash scripts/verify-setup.sh
```

Checks:
- ✅ Environment variables
- ✅ Supabase connectivity
- ✅ Database tables
- ✅ Storage buckets (see note below)
- ✅ Dependencies
- ✅ Production build

> **Note:** Storage bucket check may report FAIL (HTTP 400) even when buckets exist. This is expected because the buckets are private (`public: false`) and the verification script uses the Anon Key, which cannot list private buckets. Verify manually via SQL:
> ```sql
> SELECT * FROM storage.buckets;
> ```
> Required buckets: `parts-images`, `issues`, `parts-cad`, `batch-images`

---

## Updating Your Deployment

### Pull Latest Changes

```bash
git pull origin main
npm ci
```

### Update Database

```bash
supabase db push
supabase functions deploy
```

### Rebuild Application

```bash
npm run build

# For Docker:
docker compose build --no-cache
docker compose up -d
```

---

## Security Checklist

- [ ] `.env` file is in `.gitignore` (never commit)
- [ ] Service role key is kept secret
- [ ] Database password is strong (16+ characters)
- [ ] RLS policies are applied (via migrations)
- [ ] Storage bucket policies restrict access properly
- [ ] HTTPS is enabled in production (use Caddy or Cloudflare)

---

## Troubleshooting

For deployment-specific issues (migrations, edge functions, storage, STEP viewer CSP), see the [Troubleshooting Guide](/guides/troubleshooting/).
