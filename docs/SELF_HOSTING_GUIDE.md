# Self-Hosting Guide

This guide walks you through deploying Eryxon MES on your own infrastructure.

---

## 1. Overview

Eryxon MES is a multi-tenant manufacturing execution system for tracking jobs, parts, operations, quality, and shop-floor activity in real time.

### Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript (Vite) |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime) |
| Hosting | Static files served via Nginx, Cloudflare Pages, or any static host |

The frontend is a single-page application that communicates directly with Supabase. There is no custom application server -- all backend logic lives in Supabase Edge Functions and PostgreSQL functions with Row-Level Security.

### Deployment Options

| Option | Best For |
|--------|----------|
| **Quick Start** (`scripts/setup.sh`) | First-time setup, development |
| **Docker** | Production servers, VPS, on-premise |
| **Cloudflare Pages** | Edge deployment, zero-server hosting |

---

## 2. Prerequisites

- **Node.js 20+** and **npm** -- [nodejs.org](https://nodejs.org/)
- **Supabase CLI** -- installed automatically by the setup script, or manually: `npm install -g supabase`
- **A Supabase project** -- cloud at [supabase.com](https://supabase.com) or [self-hosted](https://supabase.com/docs/guides/self-hosting)
- **Git**
- **Docker** (only for Docker deployment)

---

## 3. Quick Start (Recommended for First-Time Setup)

The interactive setup script handles prerequisites, environment configuration, database migrations, storage buckets, edge function deployment, and dependency installation in one pass.

```bash
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The script will prompt you for your Supabase project URL, anon key, and service role key. Once complete, start the dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign up. The first user automatically becomes the admin and receives a new tenant.

---

## 4. Manual Setup (Step by Step)

Use this approach if you prefer full control over each step, or if the setup script does not suit your environment.

### 4.1 Clone the Repository

```bash
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow
```

### 4.2 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project (or use a self-hosted instance).
2. From **Settings > API**, note down:
   - **Project URL** -- e.g. `https://abcdefgh.supabase.co`
   - **Anon (public) key** -- safe to embed in the frontend
   - **Service role key** -- keep secret, used for edge functions
   - **Project ref** -- the subdomain portion of the URL (e.g. `abcdefgh`)

### 4.3 Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```dotenv
VITE_SUPABASE_URL="https://abcdefgh.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_PROJECT_ID="abcdefgh"
```

### 4.4 Link Supabase Project

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

### 4.5 Apply Database Schema

```bash
supabase db push
```

This runs all migrations from `supabase/migrations/` against your project.

### 4.6 Run Seed SQL (Storage Buckets and Cron Jobs)

The seed file creates storage buckets (`parts-images`, `issues`, `parts-cad`), their RLS policies, and scheduled cron jobs.

**Option A -- Supabase CLI:**

```bash
supabase db execute --file supabase/seed.sql
```

**Option B -- Supabase Dashboard:**

Open the **SQL Editor** in your Supabase dashboard, paste the contents of `supabase/seed.sql`, and run it.

### 4.7 Deploy Edge Functions

```bash
supabase functions deploy
```

This deploys all functions from `supabase/functions/`.

### 4.8 Set Edge Function Secrets

```bash
supabase secrets set \
  SUPABASE_URL=https://abcdefgh.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

See [Section 7](#7-optional-configuration) for additional optional secrets (email, Redis, etc.).

### 4.9 Install and Run

```bash
npm ci
npm run dev
```

### 4.10 First User

1. Navigate to [http://localhost:5173](http://localhost:5173).
2. Sign up with your email.
3. The first user automatically becomes the admin and gets a tenant provisioned.

---

## 5. Docker Deployment (Production)

The Docker image builds the Vite frontend and serves it with Nginx. Supabase credentials are baked in at build time as `VITE_*` environment variables.

### 5.1 Build Your Own Image

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://abcdefgh.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key \
  --build-arg VITE_SUPABASE_PROJECT_ID=abcdefgh \
  -t eryxon-flow .
```

Run it:

```bash
docker run -d -p 80:80 --name eryxon-flow eryxon-flow
```

### 5.2 Using docker-compose (HTTP)

The included `docker-compose.yml` pulls the pre-built image and exposes port 80:

```yaml
# docker-compose.yml
services:
  eryxon-flow:
    image: ghcr.io/sheetmetalconnect/eryxon-flow:latest
    container_name: eryxon-flow
    restart: unless-stopped
    ports:
      - "80:80"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

```bash
docker compose up -d
```

### 5.3 Using docker-compose with HTTPS (Production with Caddy)

The `docker-compose.prod.yml` adds a Caddy reverse proxy for automatic SSL via Let's Encrypt:

```yaml
# docker-compose.prod.yml
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

Edit the `Caddyfile` to replace `app.eryxon-flow.com` with your domain:

```
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

Then start:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Caddy will automatically obtain and renew TLS certificates.

### 5.4 Using the Pre-built Image

```bash
docker pull ghcr.io/sheetmetalconnect/eryxon-flow:latest
```

> **Note:** Pre-built images have Supabase credentials baked in at build time. If you need custom credentials, build your own image as described in [5.1](#51-build-your-own-image).

---

## 6. Cloudflare Pages Deployment

1. Connect your Git repository in the [Cloudflare Pages dashboard](https://dash.cloudflare.com/).
2. Configure the build:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. Set environment variables in the Cloudflare Pages settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   - (Optional) `VITE_TURNSTILE_SITE_KEY`
4. Deploy. Cloudflare Pages handles SSL, CDN, and global distribution automatically.

---

## 7. Optional Configuration

These features are not required for a working deployment but enhance functionality.

### 7.1 Cloudflare Turnstile (CAPTCHA)

Turnstile adds bot protection to authentication forms. It is **optional** for self-hosted deployments -- if not configured, auth works without captcha.

To enable:

1. Create a Turnstile widget at the [Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/turnstile).
2. Add the site key to your `.env`:
   ```dotenv
   VITE_TURNSTILE_SITE_KEY="your-turnstile-site-key"
   ```
3. Configure the Turnstile **secret key** in your Supabase project under **Authentication > Captcha Protection**.

### 7.2 Email Invitations (Resend)

Enables sending email invitations to new users. Without this, invitation links are returned directly for manual sharing.

Set the following as edge function secrets:

```bash
supabase secrets set \
  RESEND_API_KEY=re_your_api_key \
  APP_URL=https://your-domain.com \
  EMAIL_FROM="Eryxon <noreply@your-domain.com>"
```

### 7.3 MQTT Publishing

Enables real-time event publishing to external MQTT brokers (useful for integrating with other manufacturing systems, dashboards, or IoT platforms).

Configure MQTT publishers through the application's **Integrations > MQTT Publishers** settings page after deployment. No additional environment variables are required.

### 7.4 Redis Caching (Upstash)

Improves edge function performance with a Redis-based cache layer.

```bash
supabase secrets set \
  UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io \
  UPSTASH_REDIS_REST_TOKEN=your-token
```

### 7.5 Self-Hosted Mode

If you want to signal to edge functions that this is a self-hosted deployment:

```bash
supabase secrets set SELF_HOSTED_MODE=true
```

### 7.6 CAD Processing Service

For server-side CAD file processing (STEP, STL, 3MF files), configure the optional CAD service in `.env`:

```dotenv
VITE_CAD_SERVICE_URL="https://your-cad-service.example.com"
VITE_CAD_SERVICE_API_KEY="your-api-key"
```

If not configured, the application falls back to browser-based CAD processing.

---

## 8. Verification

Run the verification script to confirm everything is correctly configured:

```bash
bash scripts/verify-setup.sh
```

The script checks:

- `.env` file and required variables
- Supabase REST API connectivity
- Required database tables (`jobs`, `parts`, `operations`, `tenants`, `profiles`)
- Storage buckets (`parts-images`, `issues`, `parts-cad`)
- Node.js dependencies
- Production build

All checks should pass before going to production.

---

## 9. Updating

Pull the latest changes and re-apply migrations and functions:

```bash
git pull origin main
npm ci
supabase db push
supabase functions deploy
npm run build
```

For Docker deployments, rebuild and restart:

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

Or pull the latest pre-built image:

```bash
docker compose pull
docker compose up -d
```

---

## 10. Troubleshooting

### Missing Environment Variables

**Symptom:** Blank page or console errors about undefined Supabase URL.

**Fix:** Ensure `.env` contains valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. For Docker builds, these must be passed as `--build-arg` at build time.

### Supabase Connection Failures

**Symptom:** Network errors, 401/403 responses.

**Fix:**
- Verify the project URL and anon key are correct.
- Check that your Supabase project is active (not paused).
- Ensure database migrations have been applied (`supabase db push`).

### CORS Issues

**Symptom:** Browser console shows CORS errors when calling Supabase.

**Fix:** Supabase cloud projects handle CORS automatically. For self-hosted Supabase, ensure your frontend domain is in the allowed origins.

### Storage Bucket Permissions

**Symptom:** File uploads fail with permission errors.

**Fix:** Run `supabase/seed.sql` to create buckets and their RLS policies. Verify the buckets exist in the Supabase dashboard under **Storage**.

### Edge Functions Not Working

**Symptom:** API calls to edge functions return 500 or are not found.

**Fix:**
- Redeploy: `supabase functions deploy`
- Verify secrets are set: `supabase secrets list`
- Check function logs in the Supabase dashboard under **Edge Functions > Logs**.

### Cron Jobs Not Running

**Symptom:** Monthly resets or scheduled tasks are not executing.

**Fix:** The `pg_cron` extension must be enabled. Run the seed SQL to schedule cron jobs. Verify in the Supabase dashboard under **Database > Extensions** that `pg_cron` is active.

### Build Failures

**Symptom:** `npm run build` fails.

**Fix:**
- Ensure Node.js 20+ is installed.
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm ci`
- Check that all `VITE_*` environment variables are set (Vite requires them at build time).

---

For detailed solutions to common database migration issues, see [docs/MIGRATION_TROUBLESHOOTING.md](docs/MIGRATION_TROUBLESHOOTING.md).

For additional support, open an issue on [GitHub](https://github.com/SheetMetalConnect/eryxon-flow/issues).
