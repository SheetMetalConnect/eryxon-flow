# Cloudflare Pages Secrets Management

**Goal**: Store all secrets in Cloudflare Pages, not in `.env` files or git

---

## ✅ Benefits of Cloudflare Secrets

- 🔒 **Secure**: Secrets never touch your repository
- 🌍 **Global**: Available across all edge locations
- 🔄 **Per-environment**: Different values for production/preview
- 📝 **Audit log**: Track secret changes
- 🚀 **Zero deployment**: Update secrets without rebuilding

---

## 🎯 Your Setup

- **App**: `app.eryxon.eu` (Cloudflare Pages)
- **Website**: `eryxon.eu` (marketing site)
- **Secrets**: Stored in Cloudflare dashboard

---

## 📋 Required Secrets

### Production Secrets (app.eryxon.eu)

Configure these in **Cloudflare Pages Dashboard**:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `VITE_SUPABASE_URL` | Production Supabase URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production anon key | `eyJhbGc...` |
| `VITE_SUPABASE_PROJECT_ID` | Production project ref | `xxx` |
| `VITE_CAD_SERVICE_URL` | CAD service URL (optional) | `https://cad.eryxon.eu` |

### Preview Secrets (for PR previews)

Same as production, or use staging Supabase project.

---

## 🔧 How to Configure Secrets in Cloudflare

### Method 1: Cloudflare Dashboard (Easiest)

1. **Go to Cloudflare Pages**
   - [https://dash.cloudflare.com](https://dash.cloudflare.com)
   - **Pages** → Select `eryxon-flow` project

2. **Settings → Environment Variables**
   - Click **Add variable**

3. **Add each secret**:
   ```
   Name: VITE_SUPABASE_URL
   Value: https://your-prod-project.supabase.co
   Environment: Production
   ```

4. **Repeat for all secrets** listed above

5. **Click Save**

6. **Redeploy** (optional - next deployment will use new secrets)

### Method 2: Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Set secrets
wrangler pages secret put VITE_SUPABASE_URL \
  --project-name=eryxon-flow

# You'll be prompted to enter the value
# (Not shown on screen for security)
```

### Method 3: GitHub Actions (CI/CD)

Use GitHub Secrets to inject Cloudflare secrets:

```yaml
# .github/workflows/deploy-cloudflare.yml
- name: Deploy to Cloudflare Pages
  uses: cloudflare/pages-action@v1
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    projectName: eryxon-flow
    directory: dist
  env:
    # These get injected at BUILD time
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL_PROD }}
    VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY_PROD }}
```

---

## 🌍 Environment-Specific Secrets

Cloudflare supports **per-environment variables**:

### Production (app.eryxon.eu)
```
VITE_SUPABASE_URL = https://prod.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = prod_key_here
```

### Preview (PR deployments)
```
VITE_SUPABASE_URL = https://staging.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = staging_key_here
```

**How to set**:
1. In Cloudflare dashboard → Environment Variables
2. Select **Production** or **Preview** dropdown
3. Add variable
4. Each environment has isolated secrets

---

## 🔄 How Secrets Work at Build Time

### Vite Build Process

```
1. GitHub push to main
   ↓
2. Cloudflare Pages triggers build
   ↓
3. Cloudflare injects environment variables
   ↓
4. Vite build runs: npm run build
   ↓
5. Vite replaces import.meta.env.VITE_* with actual values
   ↓
6. Static files generated with secrets embedded
   ↓
7. Deployed to edge (secrets are in compiled JS, not runtime)
```

**Key point**: Secrets are **compiled into the bundle** at build time, not fetched at runtime.

This is fine for **public keys** like Supabase `anon` key, but:
- ❌ Don't store `service_role` key here (that's for backend only)
- ✅ Only public, client-safe keys

---

## 🔐 Security Best Practices

### ✅ DO Store in Cloudflare:
- Supabase URL (public)
- Supabase anon/publishable key (public, protected by RLS)
- Project ID (public)
- API endpoints (public)
- CAD service URL (public)

### ❌ DON'T Store in Cloudflare (Frontend):
- Supabase service_role key (backend only!)
- Database passwords
- Private API keys
- Encryption keys

### Backend Secrets (Supabase Edge Functions)

Store these in **Supabase** instead:

```bash
# For Edge Functions
supabase secrets set UPSTASH_REDIS_REST_URL=https://... \
  --project-ref YOUR_REF

supabase secrets set UPSTASH_REDIS_REST_TOKEN=xxx \
  --project-ref YOUR_REF
```

---

## 📝 Local Development

**Problem**: Cloudflare secrets only available in production

**Solution**: Use `.env` for local dev (git-ignored)

```bash
# Create local .env (not committed)
cp .env.example .env

# Edit with local values
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=local_dev_key
```

**Development flow**:
```bash
# Local dev - uses .env
npm run dev

# Production - uses Cloudflare secrets
git push → auto-deploys with Cloudflare secrets
```

---

## 🎯 Complete Setup Guide

### Step 1: Create Secrets in Cloudflare

```bash
# Go to: https://dash.cloudflare.com
# Pages → eryxon-flow → Settings → Environment Variables

Production:
  VITE_SUPABASE_URL = https://YOUR_PROD.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY = eyJ...
  VITE_SUPABASE_PROJECT_ID = YOUR_PROD

Preview (optional):
  VITE_SUPABASE_URL = https://YOUR_STAGING.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY = eyJ...
  VITE_SUPABASE_PROJECT_ID = YOUR_STAGING
```

### Step 2: Remove .env from Git

```bash
# Already done by security cleanup script
git rm --cached .env
git commit -m "security: remove .env from git"
```

### Step 3: Configure Custom Domain

```bash
# In Cloudflare Pages:
Custom Domains → Add domain
  - Enter: app.eryxon.eu
  - DNS: CNAME app → eryxon-flow.pages.dev
  - SSL: Automatic ✓
```

### Step 4: Deploy

```bash
git push origin main
# Cloudflare auto-deploys with secrets injected
```

### Step 5: Verify

```bash
# Check deployed site
open https://app.eryxon.eu

# Check browser console
# Secrets should be embedded in JS bundle
```

---

## 🔍 Troubleshooting

### "Environment variable not defined"

**Problem**: Vite shows `undefined` for secret

**Solution**:
1. Check Cloudflare dashboard: is variable set?
2. Check environment: Production vs. Preview
3. Trigger new deployment (secrets apply at build time)

### "Old secret still in use"

**Problem**: Updated secret but old value still showing

**Solution**:
```bash
# Cloudflare caches builds
# Trigger new deployment:
git commit --allow-empty -m "redeploy"
git push
```

### "Secret visible in browser"

**Explanation**: This is normal for `anon` keys!
- Supabase `anon` key is **designed** to be public
- Protected by Row-Level Security (RLS)
- Not a security issue

**If you exposed `service_role` key**:
- ⚠️ IMMEDIATELY rotate in Supabase dashboard
- Never put `service_role` in frontend

---

## 📊 Cloudflare vs. .env Comparison

| Aspect | Cloudflare Secrets | .env Files |
|--------|-------------------|------------|
| **Security** | ✅ Never in git | ❌ Easy to commit |
| **Per-environment** | ✅ Built-in | ❌ Manual |
| **Audit log** | ✅ Yes | ❌ No |
| **Runtime updates** | ✅ Redeploy | ❌ Redeploy |
| **CI/CD** | ✅ Automatic | ⚠️ Manual |
| **Local dev** | ❌ Need .env | ✅ Easy |

**Best practice**: Use both!
- `.env` for local development (git-ignored)
- Cloudflare secrets for production

---

## 🌐 Multi-Site Setup (eryxon.eu)

### app.eryxon.eu (This Project)
- **Cloudflare Pages Project**: `eryxon-flow`
- **Build**: `npm run build`
- **Output**: `dist`
- **Secrets**: Configured in Cloudflare

### eryxon.eu (Marketing Site)
- **Separate Cloudflare Pages Project**: `eryxon-website`
- **Or Static HTML**
- **No secrets needed** (just marketing content)

### DNS Setup

```
# Zone: eryxon.eu

# Marketing site (root)
@ → CNAME to eryxon-website.pages.dev

# App subdomain
app → CNAME to eryxon-flow.pages.dev

# API subdomain (optional)
api → Points to Supabase (if custom domain)
```

---

## 🚀 Production Deployment Checklist

- [ ] Create production Supabase project
- [ ] Add secrets to Cloudflare Pages dashboard
- [ ] Configure custom domain: `app.eryxon.eu`
- [ ] Point DNS CNAME to Cloudflare Pages
- [ ] Deploy to Cloudflare Pages
- [ ] Verify secrets work (check app logs)
- [ ] Remove .env from git
- [ ] Update `.env.example` with placeholders
- [ ] Configure separate marketing site at `eryxon.eu`

---

## 📚 Additional Resources

- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)

---

*No more .env files in production! All secrets in Cloudflare. 🎉*
