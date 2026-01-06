# Migration Guide - Moving to a New Supabase Project

This guide covers migrating your Eryxon Flow application to a new Supabase project, including deployment options and one-click setup.

---

## Table of Contents

- [What Needs to Be Migrated](#what-needs-to-be-migrated)
- [Migration Checklist](#migration-checklist)
- [Step-by-Step Migration](#step-by-step-migration)
- [Deployment Options](#deployment-options)
- [One-Click Deploy Options](#one-click-deploy-options)
- [Cloudflare Pages Deployment](#cloudflare-pages-deployment)
- [Troubleshooting](#troubleshooting)

---

## What Needs to Be Migrated

### 1. Database Schema (85 Migration Files)

Located in: `supabase/migrations/archive/`

**Components:**
- **Core tables**: jobs, parts, operations, cells, resources, materials
- **Multi-tenancy**: tenants, subscriptions, profiles
- **Integrations**: webhooks, API keys, MQTT publishers
- **Analytics**: time tracking, production metrics, QRM data
- **Shipping**: shipments, shipping_items
- **Configuration**: stages, issue_categories, scrap_reasons
- **Audit**: activity_log, sync_imports

**Database Functions:**
- Seed functions (demo data, default scrap reasons, operators, resources)
- Calendar helper functions
- Auto-calculation triggers (job shipping totals)
- Operator verification (PIN authentication)
- GDPR deletion functions
- Routing calculations (QRM metrics)

**Row-Level Security (RLS):**
- Tenant isolation policies on all tables
- User role-based access control
- API key authentication policies

### 2. Storage Buckets

**Required buckets:**
- `parts-images` - CAD files, STEP files, part photos
  - Size limit: 50MB per file
  - Public: No (RLS policies control access)
  - MIME types: `image/*`, `application/pdf`, `model/step`, `model/stp`

- `issues` - Issue attachments and photos
  - Size limit: 10MB per file
  - Public: No
  - MIME types: `image/*`, `application/pdf`

**Storage policies:**
- Authenticated users can upload to their tenant's folder
- Users can read files from their tenant
- Service role has full access

### 3. Edge Functions (29 Functions)

Located in: `supabase/functions/`

**API Functions:**
- `api-jobs` - Job CRUD and ERP sync
- `api-parts` - Part management
- `api-operations` - Operation lifecycle
- `api-assignments` - Resource assignments
- `api-cells` - Work center management
- `api-materials` - Material management
- `api-resources` - Tooling and resources
- `api-issues` - Issue tracking
- `api-time-entries` - Time tracking
- `api-integrations` - Integration management
- `api-webhooks` - Webhook management
- `api-webhook-logs` - Webhook logs
- `api-export` - Data export
- `api-erp-sync` - ERP synchronization
- `api-templates` - Job templates
- `api-substeps` - Operation substeps
- `api-scrap-reasons` - Scrap reason management
- `api-operation-lifecycle` - Operation state management
- `api-operation-quantities` - Quantity tracking
- `api-parts-images` - Part image management
- `api-upload-url` - Signed upload URLs
- `api-job-lifecycle` - Job state management
- `api-key-generate` - API key generation

**System Functions:**
- `send-invitation` - User invitation emails
- `webhook-dispatch` - Webhook event dispatcher
- `storage-manager` - Storage cleanup
- `mqtt-publish` - MQTT message publishing
- `monthly-reset-cron` - Monthly usage reset

**Shared Utilities:**
- Authentication and tenant context
- CORS handling
- Rate limiting
- Caching (Redis/in-memory)
- Validation framework
- Error handling
- Plan limits enforcement
- Security utilities
- ERP sync utilities

**Dependencies:**
- Deno runtime (latest)
- @supabase/supabase-js@2
- Optional: Upstash Redis for caching

### 4. Environment Variables

**Frontend (`.env`):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
# Optional
VITE_CAD_SERVICE_URL=https://your-cad-service.example.com
VITE_CAD_SERVICE_API_KEY=your-api-key
```

**Edge Functions (`.env` in functions directory):**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
# Optional: Redis caching
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

---

## Migration Checklist

- [ ] Create new Supabase project
- [ ] Apply all database migrations (85 files)
- [ ] Create storage buckets with policies
- [ ] Deploy all Edge Functions (29 functions)
- [ ] Set environment variables
- [ ] Test authentication flow
- [ ] Test RLS policies
- [ ] Migrate existing data (if applicable)
- [ ] Update frontend configuration
- [ ] Deploy frontend application
- [ ] Verify all integrations work

---

## Step-by-Step Migration

### Step 1: Create New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create account
3. Click **New Project**
4. Configure:
   - **Name**: `eryxon-flow-production`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users (EU: Frankfurt, US: N. Virginia)
5. Wait ~2 minutes for provisioning

### Step 2: Get Credentials

From Supabase Dashboard → **Settings** → **API**:

Copy these values:
- **Project URL**: `https://xxxxx.supabase.co`
- **anon/public key**: `eyJxxx...`
- **service_role key**: `eyJxxx...` (keep secret!)
- **Project Ref**: The ID before `.supabase.co`

### Step 3: Apply Database Schema

**Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI
npm install -g supabase

# Clone repository (if not already)
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow

# Link to your new project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

**Option B: Manual via SQL Editor**

This is more tedious but works:

1. Navigate to **SQL Editor** in Supabase Dashboard
2. Open each migration file in `supabase/migrations/archive/` in chronological order
3. Copy and paste the SQL
4. Execute each migration

**Note**: There are 85 migration files totaling ~10,000 lines of SQL. CLI is strongly recommended.

### Step 4: Create Storage Buckets

**Via Supabase CLI:**

```bash
# Create buckets
supabase storage create parts-images
supabase storage create issues
```

**Via Dashboard:**

1. Go to **Storage** in Supabase Dashboard
2. Click **New Bucket**
3. Create `parts-images`:
   - Name: `parts-images`
   - Public: **No**
   - File size limit: 52428800 (50MB)
   - Allowed MIME types: `image/*,application/pdf,model/step,model/stp`
4. Repeat for `issues` bucket with 10MB limit

**Set Bucket Policies:**

The migrations should create RLS policies, but verify:
- Users can upload to `{tenant_id}/{user_id}/` path
- Users can read from `{tenant_id}/` path
- Service role has full access

### Step 5: Deploy Edge Functions

```bash
# Make sure you're in the project directory
cd eryxon-flow

# Login to Supabase (if not already)
supabase login

# Deploy all functions at once
supabase functions deploy --project-ref YOUR_PROJECT_REF

# Or deploy individually
supabase functions deploy api-jobs --project-ref YOUR_PROJECT_REF
# ... repeat for each function
```

**Set Function Secrets (if using Redis caching):**

```bash
supabase secrets set UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io \
  UPSTASH_REDIS_REST_TOKEN=your-token \
  --project-ref YOUR_PROJECT_REF
```

### Step 6: Configure Frontend

Update `.env`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF
```

### Step 7: Test the Migration

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Open http://localhost:8080
```

**Test checklist:**
- [ ] User signup works
- [ ] User login works
- [ ] Can create a job
- [ ] Can upload part images
- [ ] Webhooks trigger correctly
- [ ] API endpoints respond
- [ ] Real-time subscriptions work

---

## Deployment Options

### Option 1: Docker (Recommended for Self-Hosting)

**Build with new Supabase config:**

```bash
docker build -t eryxon-flow \
  --build-arg VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY .

# Run
docker run -p 8080:80 eryxon-flow
```

**Using Docker Compose:**

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      args:
        VITE_SUPABASE_URL: https://YOUR_PROJECT.supabase.co
        VITE_SUPABASE_PUBLISHABLE_KEY: YOUR_ANON_KEY
    ports:
      - "8080:80"
    restart: unless-stopped
```

### Option 2: Static Hosting (Vercel, Netlify, etc.)

```bash
# Build for production
npm run build

# The 'dist' folder contains static files
# Upload to any static host
```

### Option 3: Cloudflare Pages (See dedicated section below)

---

## One-Click Deploy Options

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SheetMetalConnect/eryxon-flow)

**Steps:**
1. Click the button above
2. Fork/clone the repo
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Deploy

**Important**: You still need to:
- Create Supabase project
- Apply migrations
- Deploy Edge Functions

### Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/SheetMetalConnect/eryxon-flow)

**Steps:**
1. Click the button
2. Connect GitHub account
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables
5. Deploy

**netlify.toml** (optional - for SPA routing):

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set VITE_SUPABASE_URL=https://xxx.supabase.co
railway variables set VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxx

# Deploy
railway up
```

---

## Cloudflare Pages Deployment

Cloudflare Pages is an excellent option for deploying Eryxon Flow:

### Why Cloudflare Pages?

- **Free tier**: Unlimited requests, 500 builds/month
- **Global CDN**: Fast worldwide
- **Zero config**: Vite builds work out of the box
- **Custom domains**: Free SSL
- **Web Analytics**: Built-in (free)
- **Edge runtime**: Compatible with Supabase

### Prerequisites

- Cloudflare account
- GitHub repository

### Option 1: Direct Git Integration (Easiest)

1. **Push code to GitHub** (if not already):
   ```bash
   git remote add origin https://github.com/your-username/eryxon-flow.git
   git push -u origin main
   ```

2. **Connect to Cloudflare Pages**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Click **Pages** → **Create a project**
   - Click **Connect to Git**
   - Select your repository
   - Configure build settings:
     - **Framework preset**: Vite
     - **Build command**: `npm run build`
     - **Build output directory**: `dist`
   - Add environment variables:
     - `VITE_SUPABASE_URL`: `https://xxx.supabase.co`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`: `eyJxxx...`
     - `VITE_SUPABASE_PROJECT_ID`: `xxx`
   - Click **Save and Deploy**

3. **Automatic deployments**:
   - Every push to `main` triggers automatic deployment
   - Preview deployments for pull requests

### Option 2: Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Create Pages project
wrangler pages project create eryxon-flow

# Build locally
npm run build

# Deploy
wrangler pages deploy dist --project-name=eryxon-flow

# Set environment variables
wrangler pages secret put VITE_SUPABASE_URL --project-name=eryxon-flow
wrangler pages secret put VITE_SUPABASE_PUBLISHABLE_KEY --project-name=eryxon-flow
```

### Option 3: Manual Upload (Quick Test)

1. Build locally:
   ```bash
   npm run build
   ```

2. Go to Cloudflare Pages dashboard
3. Drag and drop the `dist` folder
4. Set environment variables in dashboard

### Cloudflare-Specific Configuration

**Create `wrangler.toml`** (optional):

```toml
name = "eryxon-flow"
pages_build_output_dir = "dist"

[env.production]
vars = { NODE_VERSION = "20" }
```

**Create `functions/_middleware.ts`** (optional - for custom headers):

```typescript
export async function onRequest(context) {
  const response = await context.next();

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}
```

### Custom Domain Setup

1. Go to **Pages** → Your project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `app.yourdomain.com`)
4. Add CNAME record:
   - Type: `CNAME`
   - Name: `app`
   - Target: `eryxon-flow.pages.dev`
5. SSL is automatic

### Performance Optimization for Cloudflare

**Enable these in Cloudflare Dashboard:**

1. **Speed** → **Optimization**:
   - Auto Minify: HTML, CSS, JS
   - Brotli compression
   - HTTP/3
   - Early Hints

2. **Caching** → **Configuration**:
   - Cache level: Standard
   - Browser cache TTL: Respect Existing Headers

3. **Web Analytics**:
   - Enable Cloudflare Web Analytics (free)

### Cloudflare Pages vs. Other Options

| Feature | Cloudflare Pages | Vercel | Netlify | Docker (Self-host) |
|---------|------------------|--------|---------|-------------------|
| **Free tier** | Unlimited requests | 100GB bandwidth | 100GB bandwidth | Depends on host |
| **Build minutes** | 500/month | 6000/month | 300/month | Unlimited |
| **Custom domains** | Unlimited | Unlimited | 1 on free | Depends |
| **Edge locations** | 300+ | 100+ | 100+ | 1 (your server) |
| **Zero config** | ✅ | ✅ | ✅ | ❌ |
| **Preview deploys** | ✅ | ✅ | ✅ | ❌ |
| **Environment vars** | ✅ | ✅ | ✅ | ✅ |
| **Best for** | Global apps | Full-stack | Jamstack | Full control |

**Recommendation**: Cloudflare Pages is ideal for Eryxon Flow because:
- Free unlimited traffic
- Global CDN (300+ locations)
- Pairs perfectly with Supabase (both edge-native)
- Zero-config Vite support
- Built-in analytics

---

## GitHub Actions CI/CD to Cloudflare Pages

Create `.github/workflows/deploy-cloudflare.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: eryxon-flow
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

**Required GitHub Secrets:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `CLOUDFLARE_API_TOKEN` (from Cloudflare → API Tokens)
- `CLOUDFLARE_ACCOUNT_ID` (from Cloudflare → Workers & Pages → Account ID)

---

## Automated Migration Script

**Create `migrate-to-new-supabase.sh`:**

```bash
#!/bin/bash
set -e

echo "🚀 Eryxon Flow - New Supabase Project Migration"
echo "================================================"
echo ""

# Prompt for credentials
read -p "Enter your new Supabase Project Ref: " PROJECT_REF
read -p "Enter your Supabase Access Token: " ACCESS_TOKEN

export SUPABASE_ACCESS_TOKEN=$ACCESS_TOKEN

echo ""
echo "Step 1: Linking to project..."
supabase link --project-ref $PROJECT_REF

echo ""
echo "Step 2: Applying database migrations..."
supabase db push

echo ""
echo "Step 3: Creating storage buckets..."
supabase storage create parts-images || echo "Bucket may already exist"
supabase storage create issues || echo "Bucket may already exist"

echo ""
echo "Step 4: Deploying Edge Functions..."
supabase functions deploy --project-ref $PROJECT_REF

echo ""
echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with new credentials"
echo "2. Deploy frontend to your chosen platform"
echo "3. Test the application thoroughly"
```

**Usage:**

```bash
chmod +x migrate-to-new-supabase.sh
./migrate-to-new-supabase.sh
```

---

## Troubleshooting

### Migration Issues

**Problem**: "Migration failed - relation already exists"

**Solution**: Some migrations may have already been applied. Check which migrations exist:
```sql
SELECT * FROM supabase_migrations.schema_migrations;
```

**Problem**: "Permission denied on storage buckets"

**Solution**: Verify RLS policies:
```sql
SELECT * FROM storage.policies WHERE bucket_id = 'parts-images';
```

**Problem**: "Edge function deployment failed"

**Solution**: Check function logs:
```bash
supabase functions logs api-jobs --project-ref YOUR_REF
```

### Cloudflare Pages Issues

**Problem**: "Build failed - missing dependencies"

**Solution**: Ensure `package-lock.json` is committed:
```bash
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

**Problem**: "Environment variables not working"

**Solution**: Cloudflare Pages requires `VITE_` prefix. Rebuild after adding vars:
```bash
wrangler pages deployment tail --project-name=eryxon-flow
```

**Problem**: "404 on page refresh"

**Solution**: Cloudflare Pages should handle this automatically for Vite. If not, add `_redirects` file:
```
/* /index.html 200
```

### Performance Issues

**Problem**: "Slow initial load"

**Solution**: Enable Cloudflare optimizations:
1. Auto Minify
2. Brotli compression
3. HTTP/3
4. Early Hints

**Problem**: "CORS errors"

**Solution**: Verify Supabase Edge Functions have correct CORS headers (already configured in `_shared/cors.ts`)

---

## Summary

### What You've Learned

1. **Database Migration**: 85 SQL migrations with comprehensive schema
2. **Edge Functions**: 29 Deno functions for backend logic
3. **Storage**: 2 buckets with RLS policies
4. **Deployment**: Multiple options (Docker, Vercel, Netlify, Cloudflare Pages)
5. **Automation**: CI/CD workflows and migration scripts

### Recommended Workflow

1. ✅ **Create Supabase project** (5 minutes)
2. ✅ **Run migration script** (5 minutes)
3. ✅ **Deploy to Cloudflare Pages** (10 minutes)
4. ✅ **Test thoroughly** (30 minutes)
5. ✅ **Go live** 🎉

### Total Time Estimate

- **Automated**: ~20 minutes
- **Manual**: ~2 hours

### Next Steps

1. Follow the [Quick Start Guide](docs/QUICK_START.md)
2. Review [Database Schema](docs/DATABASE.md)
3. Understand [Edge Functions](docs/EDGE_FUNCTIONS_SETUP.md)
4. Set up [CI/CD](docs/CICD_DEPLOYMENT_PLAN.md)

---

## Need Help?

- **Documentation**: `/docs` folder
- **GitHub Issues**: Bug reports and questions
- **Self-Hosting Guide**: See `docs/SELF_HOSTING_GUIDE.md`

---

*Licensed under BSL 1.1 - See [LICENSE](LICENSE) for terms*
