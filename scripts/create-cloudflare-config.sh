#!/bin/bash
# Create Cloudflare Pages configuration files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "☁️  Creating Cloudflare Pages Configuration"
echo "=========================================="
echo ""

# Create wrangler.toml
cat > "$PROJECT_ROOT/wrangler.toml" << 'EOF'
name = "eryxon-flow"
compatibility_date = "2024-01-01"

[build]
command = "npm run build"

[build.upload]
format = "service-worker"
main = "./dist"

[site]
bucket = "./dist"

[env.production]
name = "eryxon-flow"
route = ""
vars = { NODE_VERSION = "20" }

[env.preview]
name = "eryxon-flow-preview"
EOF

echo "✓ Created wrangler.toml"

# Create _redirects for SPA routing
cat > "$PROJECT_ROOT/public/_redirects" << 'EOF'
# Cloudflare Pages - SPA routing
/* /index.html 200
EOF

echo "✓ Created public/_redirects"

# Create _headers for security
cat > "$PROJECT_ROOT/public/_headers" << 'EOF'
# Security headers
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

# Cache static assets
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Don't cache index.html
/index.html
  Cache-Control: no-cache, no-store, must-revalidate
EOF

echo "✓ Created public/_headers"

# Create GitHub workflow for Cloudflare Pages
mkdir -p "$PROJECT_ROOT/.github/workflows"
cat > "$PROJECT_ROOT/.github/workflows/deploy-cloudflare.yml" << 'EOF'
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    name: Deploy to Cloudflare Pages
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
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
          wranglerVersion: '3'
EOF

echo "✓ Created .github/workflows/deploy-cloudflare.yml"

# Create README for Cloudflare deployment
cat > "$PROJECT_ROOT/CLOUDFLARE_DEPLOY.md" << 'EOF'
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
EOF

echo "✓ Created CLOUDFLARE_DEPLOY.md"

echo ""
echo "✅ Cloudflare Pages configuration complete!"
echo ""
echo "Files created:"
echo "  - wrangler.toml"
echo "  - public/_redirects"
echo "  - public/_headers"
echo "  - .github/workflows/deploy-cloudflare.yml"
echo "  - CLOUDFLARE_DEPLOY.md"
echo ""
echo "📖 Next steps:"
echo "1. Read CLOUDFLARE_DEPLOY.md for deployment instructions"
echo "2. Set up Cloudflare Pages project"
echo "3. Configure environment variables"
echo "4. Deploy!"
echo ""
