# Cloudflare Pages Deployment Guide

## Quick Start

### Option 1: Direct Git Integration (Recommended)

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Prepare for Cloudflare Pages"
   git push origin main
   ```

2. **Connect to Cloudflare Pages**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Click **Pages** → **Create a project**
   - Click **Connect to Git**
   - Select your repository
   - Configure:
     - Framework: **Vite**
     - Build command: `npm run build`
     - Build output: `dist`
   - Add environment variables:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`
     - `VITE_SUPABASE_PROJECT_ID`
   - Click **Save and Deploy**

### Option 2: Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Build
npm run build

# Deploy
wrangler pages deploy dist --project-name=eryxon-flow
```

### Option 3: GitHub Actions (Automated)

The workflow is already configured in `.github/workflows/deploy-cloudflare.yml`.

**Required GitHub Secrets**:
1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Add:
   - `CLOUDFLARE_API_TOKEN` - Get from Cloudflare → API Tokens
   - `CLOUDFLARE_ACCOUNT_ID` - Get from Cloudflare → Workers & Pages
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon key

Every push to `main` will auto-deploy!

## Environment Variables

Set these in Cloudflare Pages settings:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
VITE_SUPABASE_PROJECT_ID=your-project-id
```

## Custom Domain

1. Go to Pages project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter domain (e.g., `app.yourdomain.com`)
4. Add CNAME:
   - Name: `app`
   - Target: `eryxon-flow.pages.dev`
5. SSL is automatic ✨

## Performance Tips

1. **Enable optimizations** in Cloudflare Dashboard:
   - Auto Minify (HTML, CSS, JS)
   - Brotli compression
   - HTTP/3
   - Early Hints

2. **Check Web Analytics**:
   - Free built-in analytics
   - No impact on performance

## Troubleshooting

**Build fails?**
- Check Node version (should be 20)
- Verify all dependencies in `package.json`
- Check build logs in Cloudflare dashboard

**Environment variables not working?**
- Must have `VITE_` prefix
- Rebuild after adding/changing variables

**404 on refresh?**
- Check `public/_redirects` exists
- Should contain: `/* /index.html 200`

## Cost

**Free tier includes**:
- Unlimited requests
- 500 builds/month
- Unlimited bandwidth
- Custom domains
- SSL certificates

Perfect for production! 🚀
