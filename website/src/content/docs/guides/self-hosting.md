---
title: "Self-Hosting Guide"
description: "Production-ready self-hosting guide for Eryxon Flow MES"
---

This guide covers deploying Eryxon Flow on your own infrastructure. Self-hosting is free, unlimited, and you maintain full control.

> [!IMPORTANT]
> **License:** Eryxon Flow is licensed under **BSL 1.1**. You are free to self-host, modify, and use it for your business. You **cannot** resell it as a competing SaaS offering. License converts to Apache 2.0 after 4 years.

---

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

# Set your database password
export SUPABASE_DB_PASSWORD='your-database-password'

# Run automated setup
chmod +x scripts/automate_self_hosting.sh
./scripts/automate_self_hosting.sh
```

The script will automatically:
1. Install required dependencies
2. Configure Supabase CLI
3. Link your project
4. Apply database migrations
5. Create storage buckets
6. Deploy Edge Functions
7. Install npm packages

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
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 7. Install and Run

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

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  eryxon-flow:
    image: ghcr.io/sheetmetalconnect/eryxon-flow:latest
    # Or use your custom build:
    # build:
    #   context: .
    #   args:
    #     VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
    #     VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY}
    #     VITE_SUPABASE_PROJECT_ID: ${VITE_SUPABASE_PROJECT_ID}
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

Start:
```bash
docker compose up -d
```

### Docker Compose with SSL (Production)

Includes Caddy reverse proxy for automatic HTTPS:

```yaml
version: '3.8'

services:
  app:
    image: ghcr.io/sheetmetalconnect/eryxon-flow:latest
    container_name: eryxon-flow
    restart: unless-stopped
    expose:
      - "80"

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

Create `Caddyfile`:

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

Deploy:
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
   ```
   VITE_SUPABASE_URL=https://yourproject.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   VITE_SUPABASE_PROJECT_ID=yourproject
   ```

4. **Deploy**
   - Cloudflare handles SSL, CDN, and global distribution automatically

---

## Optional Enhancements

### Email Invitations (Resend)

Enable automated email invitations:

```bash
supabase secrets set \
  RESEND_API_KEY="re_your_api_key" \
  APP_URL="https://your-domain.com" \
  EMAIL_FROM="Eryxon <noreply@your-domain.com>"
```

### Cloudflare Turnstile (CAPTCHA)

Add bot protection to auth forms:

1. Create widget at [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Add to `.env`:
   ```bash
   VITE_TURNSTILE_SITE_KEY="your-site-key"
   ```
3. Configure secret key in Supabase **Authentication** → **Captcha Protection**

### Redis Caching (Upstash)

Improve Edge Function performance:

```bash
supabase secrets set \
  UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io" \
  UPSTASH_REDIS_REST_TOKEN="your-token"
```

### CAD Processing Service

For server-side CAD file processing (optional):

```bash
VITE_CAD_SERVICE_URL="https://your-cad-service.example.com"
VITE_CAD_SERVICE_API_KEY="your-api-key"
```

If not configured, browser-based processing is used.

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
- ✅ Storage buckets
- ✅ Dependencies
- ✅ Production build

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

## ⚠️ Special Attention Points

### Critical Configuration Items

1. **Environment Variables**
   - Always use `VITE_SUPABASE_PROJECT_ID` (not hardcoded)
   - Template literals need **backticks** not quotes: `` `https://${var}` ``
   - Validate all environment variables before using them

2. **Database Migrations**
   - Always run migrations in order
   - The `20260127235000_enhance_batch_management.sql` migration adds:
     - `blocked` status to batch_status enum
     - `parent_batch_id` column for batch nesting
     - `nesting_image_url` and `layout_image_url` columns
   - Never skip migrations

3. **Storage Buckets**
   - Private buckets require **signed URLs** (not public URLs)
   - We use `createSignedUrl()` with 1-year expiry for batch images
   - Buckets needed: `parts-images`, `issues`, `parts-cad`, `batch-images`

4. **Edge Functions**
   - Must be redeployed after code changes
   - Check logs if APIs return 502: `supabase functions logs`
   - Verify secrets are set: `supabase secrets list`

5. **SQL Syntax**
   - ✅ Use `IF EXISTS ... THEN ... END IF` blocks
   - ❌ Don't use `PERFORM ... WHERE EXISTS` (invalid syntax)

6. **Authentication Trigger**
   - The `on_auth_user_created` trigger must exist on `auth.users`
   - Without it, new signups won't get profiles/tenants
   - Migration `20260127232000_add_missing_auth_trigger.sql` ensures this

### Security Checklist

- [ ] `.env` file is in `.gitignore` (never commit)
- [ ] Service role key is kept secret
- [ ] Database password is strong (16+ characters)
- [ ] RLS policies are applied (via migrations)
- [ ] Storage bucket policies restrict access properly
- [ ] HTTPS is enabled in production (use Caddy or Cloudflare)

### Performance Tips

- Enable Redis caching for high-traffic deployments
- Use Cloudflare Pages for global edge distribution
- Configure proper database indexes (included in migrations)
- Monitor Edge Function execution times in Supabase dashboard

---

## Known Issues & Q&A

### Q: Why do I get "template literal not interpolating" errors?

**A:** You're using single quotes instead of backticks for template literals.

❌ **Wrong:**
```javascript
const url = 'https://${projectId}.supabase.co';
```

✅ **Correct:**
```javascript
const url = `https://${projectId}.supabase.co`;
```

**Fixed in:** DataExport.tsx, DataImport.tsx, ApiDocs.tsx (as of Jan 2026)

---

### Q: Batch images return 403 Forbidden

**A:** Private buckets can't use `getPublicUrl()`. We now use signed URLs.

**Fixed in:** BatchDetail.tsx, BatchCreate.tsx with `createSignedUrl(filePath, 31536000)`

---

### Q: Operation batch pre-selection doesn't work

**A:** Was using row indices instead of operation UUIDs.

**Fixed in:** Operations.tsx - now maps `rowSelection` keys to actual `operation.id` values

---

### Q: New users sign up but can't log in

**A:** The `on_auth_user_created` trigger is missing.

**Solution:**
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Fixed in:** Migration `20260127232000_add_missing_auth_trigger.sql`

---

### Q: Edge Functions return 502 errors

**A:** Import map might not be deployed.

**Solution:**
```bash
supabase functions deploy
# Redeploy all functions to pick up import_map.json
```

---

### Q: Migrations fail with "type already exists"

**A:** Database has partial state from previous attempts.

**Solution (DESTRUCTIVE - only for fresh setups):**
```sql
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO service_role;
```

Then re-run: `supabase db push`

---

### Q: How do I check if Edge Functions are working?

**A:** Test the health endpoint:
```bash
curl https://yourproject.supabase.co/functions/v1/api-jobs \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Should return JSON (not 404/502).

---

### Q: Cron jobs aren't running

**A:** Verify `pg_cron` extension is enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

If empty, run seed.sql to schedule jobs.

---

### Q: What languages are supported?

**A:** English, Dutch (nl), and German (de).

All batch management features have 100% translation coverage as of Jan 2026.

---

### Q: Can I use this for commercial purposes?

**A:** Yes - you can self-host and use it for your business operations. However, you **cannot** resell it as a competing SaaS product (BSL 1.1 restriction).

---

### Q: How do I report bugs?

**A:** Open an issue on [GitHub](https://github.com/SheetMetalConnect/eryxon-flow/issues) with:
- Your deployment method (Docker, Cloudflare Pages, etc.)
- Supabase version (cloud or self-hosted)
- Error messages and logs
- Steps to reproduce

---

### Q: Where can I get professional help with deployment?

**A:** For complex enterprise deployments, consulting services are available at [vanenkhuizen.com](https://www.vanenkhuizen.com/).

---

## Support & Community

- **GitHub Issues**: [Bug reports & feature requests](https://github.com/SheetMetalConnect/eryxon-flow/issues)
- **Documentation**: See `/docs` folder in repository
- **Security Issues**: Report privately to security@sheetmetalconnect.com

---

*Last Updated: January 2026*
*Licensed under BSL 1.1 - See [LICENSE](../LICENSE) for full terms*
