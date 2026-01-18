# Deploy Eryxon Flow

Quick deployment guide. For detailed instructions, see:
- [Self-Hosting Guide](website/src/content/docs/guides/self-hosting.md)
- [Online Documentation](https://eryxon.eu/docs/guides/self-hosting)

## Prerequisites

- Supabase account
- Cloudflare account (free tier)

## Step 1: Create Supabase Project

```bash
# 1. Go to supabase.com → Create project
# 2. Get credentials from Settings → API:
#    - Project URL
#    - anon key
#    - Project Ref

# 3. Apply schema
supabase link --project-ref YOUR_REF
supabase db push

# 4. Create storage
supabase storage create parts-images
supabase storage create issues

# 5. Deploy functions
supabase functions deploy
```

## Step 2: Deploy to Cloudflare Pages

```bash
# 1. Go to dash.cloudflare.com
# 2. Pages → Create → Connect Git
# 3. Select repo
# 4. Build: npm run build
# 5. Output: dist
```

**Environment Variables** (set in Cloudflare):
```
VITE_SUPABASE_URL = https://YOUR_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = your-anon-key
VITE_SUPABASE_PROJECT_ID = YOUR_REF
```

## Step 3: Custom Domain

In Cloudflare Pages:
- Custom domains → Add domain
- Enter: your-domain.com
- DNS: CNAME app → your-project.pages.dev

Done.

## More Information

- **Hosted Version:** [app.eryxon.eu](https://app.eryxon.eu) (30-day free trial)
- **Full Self-Hosting Guide:** [eryxon.eu/docs/guides/self-hosting](https://eryxon.eu/docs/guides/self-hosting)
- **API Documentation:** [eryxon.eu/docs/api/api_documentation](https://eryxon.eu/docs/api/api_documentation)
