# Quick Migration Guide - Supabase + Cloudflare Pages

**Goal**: Migrate Eryxon Flow to a new Supabase project and deploy on Cloudflare Pages

**Time**: ~30 minutes

---

## Current State (Verified ✓)

- **Migrations**: 85 SQL files (10,080 lines)
- **Edge Functions**: 28 Deno functions
- **Shared Utilities**: 11 helper modules
- **Current Supabase Project**: `vatgianzotsurljznsry`

---

## Step 1: Create New Supabase Project (5 min)

1. Go to [supabase.com](https://supabase.com)
2. Create **New Project**
   - Name: `eryxon-flow-production`
   - Region: **EU (Frankfurt)** or **US (N. Virginia)**
   - Database password: Generate and save!
3. Wait for provisioning (~2 min)
4. Get credentials from **Settings → API**:
   - Project URL
   - anon/public key
   - service_role key
   - Project Ref

---

## Step 2: Migrate Database (10 min)

### Option A: Supabase CLI (Fastest)

```bash
# Install CLI
npm install -g supabase

# Link to new project
supabase link --project-ref YOUR_NEW_PROJECT_REF

# Apply all migrations
supabase db push
```

### Option B: Consolidated SQL (Backup method)

```bash
# Generate single SQL file
./scripts/consolidate-migrations.sh

# Then:
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy contents of supabase/consolidated-schema.sql
# 3. Paste and execute
```

---

## Step 3: Create Storage Buckets (2 min)

```bash
supabase storage create parts-images
supabase storage create issues
```

Or via dashboard:
- **Storage** → **New Bucket**
- Create `parts-images` (50MB limit, private)
- Create `issues` (10MB limit, private)

---

## Step 4: Deploy Edge Functions (5 min)

```bash
# Deploy all at once
supabase functions deploy --project-ref YOUR_PROJECT_REF

# Or individually (if needed)
supabase functions deploy api-jobs --project-ref YOUR_PROJECT_REF
# ... repeat for others
```

---

## Step 5: Deploy to Cloudflare Pages (5 min)

### Automated (GitHub Integration)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for Cloudflare deployment"
   git push origin main
   ```

2. **Connect Cloudflare Pages**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - **Pages** → **Create a project** → **Connect to Git**
   - Select your repository
   - Settings:
     - Framework: **Vite**
     - Build command: `npm run build`
     - Build output: `dist`

3. **Add environment variables**:
   - `VITE_SUPABASE_URL` = Your new Supabase URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Your anon key
   - `VITE_SUPABASE_PROJECT_ID` = Your project ref

4. **Deploy** → Done! 🎉

### Manual (Wrangler CLI)

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Build locally
npm run build

# Deploy
wrangler pages deploy dist --project-name=eryxon-flow
```

---

## Step 6: Verify (3 min)

Test your deployment:

- [ ] User signup works
- [ ] User login works
- [ ] Can create a job
- [ ] Can upload images
- [ ] Real-time updates work

---

## Helper Scripts

I've created 3 scripts to help:

### 1. Verify Current Setup
```bash
./scripts/verify-supabase-setup.sh
```
Shows all migrations, functions, and configuration

### 2. Consolidate Migrations
```bash
./scripts/consolidate-migrations.sh
```
Creates single SQL file from all 85 migrations

### 3. Create Cloudflare Config
```bash
./scripts/create-cloudflare-config.sh
```
Already run! Created:
- `wrangler.toml`
- `public/_redirects`
- `public/_headers`
- `.github/workflows/deploy-cloudflare.yml`

---

## Troubleshooting

### "Migration failed"
- Check Supabase CLI is latest: `supabase --version`
- Try consolidated SQL approach
- Check logs: `supabase db remote ls`

### "Function deployment failed"
- Verify you're logged in: `supabase login`
- Check function logs: `supabase functions logs FUNCTION_NAME`

### "Cloudflare build failed"
- Ensure `VITE_` prefix on env vars
- Check build logs in Cloudflare dashboard
- Verify Node version is 20

### "Environment variables not working"
- Must use `VITE_` prefix for frontend vars
- Rebuild after adding/changing variables

---

## What Gets Migrated?

### Database (via migrations)
- ✅ All tables (jobs, parts, operations, etc.)
- ✅ RLS policies (tenant isolation)
- ✅ Functions (seed data, calculations)
- ✅ Indexes and constraints
- ✅ Enums and types

### Storage
- ✅ Buckets (parts-images, issues)
- ✅ Storage policies
- ⚠️ **Note**: Existing files NOT migrated (manual if needed)

### Edge Functions
- ✅ All 28 API functions
- ✅ Shared utilities
- ✅ CORS configuration
- ✅ Authentication handlers

### What's NOT Migrated
- ❌ User data (start fresh or export/import)
- ❌ Uploaded files (manual migration if needed)
- ❌ API keys (regenerate in new project)

---

## Cost Estimate

### Supabase
- **Free tier**: 500MB database, 1GB storage
- **Pro tier**: $25/month (recommended for production)

### Cloudflare Pages
- **Free tier**:
  - Unlimited requests
  - 500 builds/month
  - Unlimited bandwidth
  - Perfect for production! 🎉

**Total**: $0-25/month depending on Supabase tier

---

## Next Steps After Migration

1. **Test thoroughly** - Verify all features work
2. **Set up custom domain** - Cloudflare makes this easy
3. **Enable analytics** - Cloudflare Web Analytics (free)
4. **Configure CI/CD** - GitHub Actions workflow already created
5. **Monitor** - Check Supabase logs and Cloudflare analytics

---

## Getting Help

- **Verification script**: `./scripts/verify-supabase-setup.sh`
- **Full migration guide**: See `MIGRATION_GUIDE.md`
- **Cloudflare deployment**: See `CLOUDFLARE_DEPLOY.md`
- **Self-hosting guide**: See `docs/SELF_HOSTING_GUIDE.md`

---

## Summary

**What you need**:
1. New Supabase project (5 min setup)
2. Cloudflare account (free)
3. GitHub repository

**What you run**:
```bash
# 1. Verify current state
./scripts/verify-supabase-setup.sh

# 2. Link to new Supabase
supabase link --project-ref YOUR_REF

# 3. Migrate database
supabase db push

# 4. Deploy functions
supabase functions deploy

# 5. Deploy to Cloudflare Pages
# (via GitHub integration or Wrangler CLI)
```

**Result**:
- ✅ Fresh Supabase project with complete schema
- ✅ All Edge Functions deployed
- ✅ Frontend on Cloudflare's global CDN
- ✅ Free hosting with unlimited traffic
- ✅ Automatic SSL and global distribution

**Time**: ~30 minutes total

---

*Questions? Check the detailed `MIGRATION_GUIDE.md` or run `./scripts/verify-supabase-setup.sh` to see your current state.*
