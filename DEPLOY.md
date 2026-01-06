# Deploy Eryxon Flow - Essential Steps Only

Everything is ready. You just need to:
1. Create new Supabase project
2. Configure Cloudflare Pages
3. Deploy

---

## Step 1: Create New Supabase Project (10 min)

```bash
# 1. Go to supabase.com → Create new project
#    - Name: eryxon-flow-production
#    - Region: EU (Frankfurt) or US East
#    - Password: (generate and save)

# 2. Get credentials from Settings → API:
#    - Project URL
#    - anon/public key
#    - Project Ref (the ID before .supabase.co)

# 3. Apply database schema
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# 4. Create storage buckets
supabase storage create parts-images
supabase storage create issues

# 5. Deploy Edge Functions
supabase functions deploy
```

Done! Your database is ready.

---

## Step 2: Deploy to Cloudflare Pages (10 min)

```bash
# 1. Go to dash.cloudflare.com
# 2. Pages → Create project → Connect to Git
# 3. Select: SheetMetalConnect/eryxon-flow
# 4. Build settings:
#    - Framework: Vite
#    - Build command: npm run build
#    - Build output: dist
```

### Environment Variables (Add in Cloudflare)

**Production**:
```
VITE_SUPABASE_URL = https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = your-anon-key-from-step-1
VITE_SUPABASE_PROJECT_ID = YOUR_PROJECT_REF
```

That's it! Click **Save and Deploy**.

---

## Step 3: Custom Domain (5 min)

```bash
# In Cloudflare Pages:
# Settings → Custom domains → Add domain
# Enter: app.eryxon.eu

# DNS (if not already in Cloudflare):
# Add CNAME: app → eryxon-flow.pages.dev

# SSL is automatic ✓
```

---

## Optional: Clean Git History

Since .env was in git history (old credentials), you can clean it:

```bash
# Run the cleanup script
./scripts/security/clean-git-history.sh

# This removes .env and config.toml from ALL history
# WARNING: Rewrites git history!
```

Or skip it - you're using a NEW Supabase project anyway!

---

## That's It!

**Total time**: ~25 minutes

**Cost**:
- Cloudflare Pages: $0/mo (unlimited)
- Supabase: $0/mo (free tier) or $25/mo (Pro when you scale)

**What's deployed**:
- ✅ 85 database migrations
- ✅ 28 Edge Functions
- ✅ Complete RLS security
- ✅ Multi-tenant SaaS ready
- ✅ Free tier alpha → Paid tiers later

**Your URLs**:
- App: `https://app.eryxon.eu`
- Supabase: `https://YOUR_PROJECT_REF.supabase.co`

**Next**: Open source the repo and launch alpha!

---

**All documentation**: See `docs/` for details

**Questions**: See `docs/README.md` for full index
