# Production Roadmap - Eryxon Flow

**Goal**: Launch production-ready SaaS with free alpha, then paid subscriptions

## 🎯 End State

- ✅ **Hosting**: Cloudflare Pages (free, unlimited traffic)
- ✅ **Database**: New Supabase production project (starts free, ~$25/mo for Pro)
- ✅ **License**: BSL 1.1 (source available, free self-hosting)
- ✅ **Monetization**: Free during alpha → Paid subscriptions when ready

---

## 📋 Deployment Checklist

### Phase 1: Clean & Prepare Repository (30 min)

- [ ] **Run security cleanup**
  ```bash
  ./scripts/security/prepare-for-open-source.sh
  ```

- [ ] **Verify cleanup**
  ```bash
  ./scripts/security/security-audit.sh
  ```

- [ ] **Update .gitignore** (automated by script)

- [ ] **Clean git history** (optional, see docs/security/)
  ```bash
  # Use git-filter-repo to remove .env from history
  git filter-repo --invert-paths --path .env --force
  ```

---

### Phase 2: Create Production Supabase (10 min)

- [ ] **Create new project** at [supabase.com](https://supabase.com)
  - Name: `eryxon-flow-production`
  - Region: **EU (Frankfurt)** (for GDPR) or **US East**
  - Plan: **Free** (start), **Pro** ($25/mo when needed)

- [ ] **Save credentials**
  - Project URL
  - anon/public key
  - service_role key (keep secret!)
  - Project Ref

- [ ] **Apply database schema**
  ```bash
  # Option 1: Supabase CLI (recommended)
  supabase link --project-ref YOUR_PROD_REF
  supabase db push

  # Option 2: Consolidated SQL
  ./scripts/deployment/consolidate-migrations.sh
  # Then paste into SQL Editor
  ```

- [ ] **Create storage buckets**
  ```bash
  supabase storage create parts-images
  supabase storage create issues
  ```

- [ ] **Deploy Edge Functions**
  ```bash
  supabase functions deploy --project-ref YOUR_PROD_REF
  ```

---

### Phase 3: Deploy to Cloudflare Pages (15 min)

#### Option A: GitHub Integration (Recommended)

- [ ] **Push to GitHub**
  ```bash
  git add .
  git commit -m "chore: prepare for production deployment"
  git push origin main
  ```

- [ ] **Connect Cloudflare Pages**
  1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
  2. **Pages** → **Create project** → **Connect to Git**
  3. Select repository: `SheetMetalConnect/eryxon-flow`
  4. Configure build:
     - Framework: **Vite**
     - Build command: `npm run build`
     - Build output: `dist`
  5. **Environment variables** (production):
     - `VITE_SUPABASE_URL` = `https://YOUR_PROD_REF.supabase.co`
     - `VITE_SUPABASE_PUBLISHABLE_KEY` = Your production anon key
     - `VITE_SUPABASE_PROJECT_ID` = `YOUR_PROD_REF`
  6. **Deploy**

- [ ] **Wait for build** (~2 min)
  - URL will be: `https://eryxon-flow.pages.dev`

#### Option B: Wrangler CLI

```bash
npm install -g wrangler
wrangler login
npm run build
wrangler pages deploy dist --project-name=eryxon-flow
```

---

### Phase 4: Configure Custom Domain (5 min)

- [ ] **Add custom domain** in Cloudflare Pages
  - Example: `app.eryxon.eu`
  - SSL: Automatic ✓

- [ ] **Update DNS**
  - Type: `CNAME`
  - Name: `app`
  - Target: `eryxon-flow.pages.dev`
  - Proxy: ✓ (orange cloud)

---

### Phase 5: Open Source Release (15 min)

- [ ] **Review license** (BSL 1.1 already in repo)

- [ ] **Update README.md** with:
  - Project description
  - Quick start guide
  - Link to self-hosting guide
  - License information
  - Contribution guidelines

- [ ] **Create GitHub release**
  ```bash
  # Tag version
  git tag -a v0.1.0-alpha -m "Alpha release"
  git push origin v0.1.0-alpha

  # Create release on GitHub
  # OR use GitHub CLI:
  gh release create v0.1.0-alpha --title "v0.1.0-alpha" --notes "Initial alpha release"
  ```

- [ ] **Make repository public**
  - GitHub → Settings → Danger Zone → Change visibility

---

### Phase 6: Alpha Launch Setup (30 min)

- [ ] **Configure subscription tiers** in Supabase
  ```sql
  -- Free tier (alpha)
  UPDATE tenants
  SET plan = 'free',
      max_jobs = 10,
      max_parts_per_month = 100,
      status = 'active';
  ```

- [ ] **Set up monitoring**
  - Supabase: Check logs, usage
  - Cloudflare: Enable Web Analytics (free)

- [ ] **Prepare for paid tier** (future)
  - Integrate Stripe (when ready)
  - Update pricing page
  - Add billing UI

- [ ] **Create landing page** (optional)
  - Explain alpha program
  - Invite users to sign up
  - Mention future paid plans

---

## 💰 Cost Breakdown

### Free Tier (Alpha Phase)

| Service | Plan | Cost | Limits |
|---------|------|------|--------|
| **Cloudflare Pages** | Free | $0/mo | Unlimited requests, 500 builds/mo |
| **Supabase** | Free | $0/mo | 500MB DB, 1GB storage, 2GB egress |
| **Total** | | **$0/mo** | Good for ~100 alpha users |

### When to Upgrade

Upgrade Supabase to **Pro ($25/mo)** when:
- Database > 500MB
- Storage > 1GB
- Need daily backups
- Want custom domain for Supabase
- Ready for production scale

### Paid Tier (Future)

Example pricing:
- **Free**: 10 jobs, 100 parts/month
- **Pro**: $29/mo - 100 jobs, 1000 parts/month
- **Business**: $99/mo - Unlimited
- **Enterprise**: Custom - On-premise, white-label

---

## 🔐 Security Considerations

### Current Issues (Fixed by Cleanup Script)

- ❌ `.env` tracked in git → Removed
- ❌ `supabase/config.toml` tracked → Removed
- ❌ Credentials in git history → Clean before open source

### Production Security

- ✅ New Supabase project = fresh credentials
- ✅ Environment variables only
- ✅ RLS policies enabled
- ✅ Cloudflare WAF protection (free)
- ✅ HTTPS everywhere (auto SSL)

### Monitoring

```bash
# Check Supabase logs
supabase functions logs --project-ref YOUR_REF

# Check Cloudflare analytics
# Dashboard → Pages → Analytics
```

---

## 📊 Alpha Metrics to Track

1. **User signups** - How many users register
2. **Active tenants** - Tenants with jobs created
3. **Database size** - When to upgrade Supabase
4. **API usage** - Track Edge Function calls
5. **Feature usage** - Which features are most used
6. **Bug reports** - GitHub Issues

**Goal**: 50-100 alpha users before paid launch

---

## 🚀 Launch Timeline

### Week 1: Preparation
- [ ] Clean repository
- [ ] Create production Supabase
- [ ] Deploy to Cloudflare Pages
- [ ] Test thoroughly

### Week 2: Alpha Release
- [ ] Open source repository
- [ ] Announce on Twitter, Reddit, HN
- [ ] Invite beta testers
- [ ] Monitor for issues

### Weeks 3-8: Alpha Testing
- [ ] Gather feedback
- [ ] Fix bugs
- [ ] Add requested features
- [ ] Improve documentation

### Week 9+: Paid Launch
- [ ] Integrate Stripe
- [ ] Finalize pricing
- [ ] Marketing push
- [ ] Move existing users to free tier

---

## 📚 Documentation Required

Before launch:

- [ ] **README.md** - Project overview
- [ ] **docs/QUICK_START.md** - 5-minute setup
- [ ] **docs/SELF_HOSTING_GUIDE.md** - ✅ Already exists
- [ ] **docs/API_DOCUMENTATION.md** - ✅ Already exists
- [ ] **docs/CONTRIBUTING.md** - How to contribute
- [ ] **LICENSE** - BSL 1.1 ✅ Already exists

---

## 🎓 Self-Hosting vs. Hosted

### Hosted (Your SaaS)
- **Alpha**: Free
- **Paid**: $29-99/mo
- Zero setup
- Managed updates
- Support included

### Self-Hosted (OSS)
- **Cost**: $0-25/mo (Supabase only)
- DIY setup
- Manual updates
- Community support
- Unlimited scale

**BSL 1.1 License**: Free self-hosting, but can't compete with eryxon.eu

---

## 🔄 CI/CD Pipeline

Already configured:

```yaml
# .github/workflows/deploy-cloudflare.yml
# Auto-deploys on push to main
```

To enable:
- Add GitHub secrets (Cloudflare API token, account ID)
- Every push to `main` → auto-deploy to production

---

## 📞 Support Plan

### Alpha Phase
- GitHub Issues (public)
- Email support (optional)
- Community Discord/Slack (optional)

### Paid Phase
- Ticket system
- Priority support for paid users
- SLA for Enterprise

---

## ✅ Pre-Launch Checklist

**Before making repository public:**

- [ ] Run security audit: `./scripts/security/security-audit.sh`
- [ ] All sensitive data removed
- [ ] .env.example has only placeholders
- [ ] Documentation complete
- [ ] License file present
- [ ] README updated
- [ ] Test with fresh database
- [ ] Cloudflare Pages deployed
- [ ] Custom domain configured
- [ ] Monitoring enabled

---

## 🎉 Launch Day Checklist

- [ ] Make GitHub repo public
- [ ] Create v0.1.0-alpha release
- [ ] Post on Hacker News
- [ ] Tweet announcement
- [ ] Post on r/selfhosted, r/opensource
- [ ] Update website with link
- [ ] Monitor for first users
- [ ] Respond to feedback quickly

---

## 📈 Growth Strategy

### Phase 1: Alpha (0-100 users)
- Focus: Quality, feedback, fixes
- Marketing: Word of mouth, HN, Reddit
- Goal: Product-market fit

### Phase 2: Beta (100-1000 users)
- Focus: Scale, features, polish
- Marketing: Content, SEO, partnerships
- Goal: Revenue validation

### Phase 3: Growth (1000+ users)
- Focus: Scale, support, enterprise
- Marketing: Paid ads, sales team
- Goal: Profitability

---

## 💡 Next Steps

**Right now**:
1. Run: `./scripts/security/prepare-for-open-source.sh`
2. Create production Supabase project
3. Deploy to Cloudflare Pages
4. Test thoroughly
5. Make repo public
6. Launch! 🚀

**Questions?**
- Technical: See `docs/`
- Security: See `docs/security/`
- Deployment: See `docs/SUPABASE_CLOUDFLARE_MIGRATION.md`

---

*Good luck with the launch! 🎉*
