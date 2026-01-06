# Open Source Security Guide

⚠️ **CRITICAL**: This repository currently has exposed credentials that must be cleaned before open sourcing!

## 🚨 Security Issues Found

### 1. Tracked Sensitive Files
- ❌ `.env` - Contains Supabase credentials
- ❌ `supabase/config.toml` - Contains project ID

### 2. Hardcoded Credentials in Source Code
- ❌ `src/lib/upload-with-progress.ts` - Hardcoded Supabase key
- ❌ `src/integrations/supabase/client.ts` - Hardcoded fallback credentials

### 3. Git History
- ⚠️ These files have been committed multiple times in git history
- ⚠️ Project ID appears in 28+ files across the repo

---

## ✅ Cleanup Required Before Open Sourcing

### Step 1: Remove Sensitive Files from Tracking

```bash
# Run the cleanup script
./scripts/prepare-for-open-source.sh
```

Or manually:

```bash
# Remove from git tracking (keep local copy)
git rm --cached .env
git rm --cached supabase/config.toml

# Update .gitignore
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
echo "!.env.example" >> .gitignore
echo "supabase/config.toml" >> .gitignore

# Commit the removal
git commit -m "security: remove sensitive files from tracking"
```

### Step 2: Clean Git History (Recommended)

**⚠️ WARNING**: This rewrites git history. Coordinate with all contributors!

```bash
# Use git-filter-repo (recommended)
# Install: pip install git-filter-repo

git filter-repo --invert-paths \
  --path .env \
  --path supabase/config.toml \
  --force

# Or use BFG Repo-Cleaner (alternative)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

java -jar bfg.jar --delete-files .env
java -jar bfg.jar --delete-files config.toml
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Step 3: Remove Hardcoded Credentials

**File: `src/lib/upload-with-progress.ts`**

❌ **Before** (line with hardcoded key):
```typescript
const supabaseKey = 'eyJhbGc...';
```

✅ **After**:
```typescript
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY');
}
```

**File: `src/integrations/supabase/client.ts`**

❌ **Before** (fallback with real credentials):
```typescript
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGc...";
```

✅ **After**:
```typescript
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY environment variable');
}
```

### Step 4: Rotate Compromised Credentials

Since credentials are in git history:

1. **Go to Supabase Dashboard**
2. **Settings** → **API** → **Reset anon key** (if possible)
3. Or create a new Supabase project and migrate (recommended)

### Step 5: Update Documentation

Replace all references to your actual project:

```bash
# Find all occurrences
grep -r "vatgianzotsurljznsry" .

# Replace with placeholder
# In docs, use: YOUR_PROJECT_ID
# In configs, use: your-project-id
```

---

## 🔒 .gitignore Configuration

Update `.gitignore` to ensure these are never committed:

```gitignore
# Environment variables
.env
.env.local
.env.*.local
!.env.example

# Supabase
supabase/config.toml
supabase/.temp
.supabase/

# Secrets
*.pem
*.key
*.p12
secrets/
credentials/

# IDE
.vscode/settings.json
.idea/

# OS
.DS_Store
Thumbs.db
```

---

## 📝 What's Safe to Keep

### ✅ Safe Files (public info)
- `.env.example` - Template with placeholders
- `supabase/migrations/*.sql` - Database schema (no credentials)
- `supabase/functions/**/*` - Edge Function code (no credentials)
- Documentation with placeholder values
- Build configurations

### ⚠️ Review Carefully
- GitHub workflows - Check for hardcoded secrets (use `${{ secrets.* }}`)
- Docker files - Should use build args, not hardcoded values
- Config files - Should reference env vars, not actual values

---

## 🛡️ Security Best Practices for Open Source

### 1. Use Environment Variables Everywhere

```typescript
// ✅ Good
const apiUrl = import.meta.env.VITE_SUPABASE_URL;

// ❌ Bad
const apiUrl = "https://vatgianzotsurljznsry.supabase.co";
```

### 2. Provide Example Files Only

```bash
# ✅ Commit this
.env.example

# ❌ Never commit this
.env
```

### 3. Document Required Variables

In README.md:

```markdown
## Environment Variables

Copy `.env.example` to `.env` and fill in:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon key
```

### 4. Use GitHub Secrets for CI/CD

```yaml
# ✅ Good
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}

# ❌ Bad
env:
  VITE_SUPABASE_URL: https://vatgianzotsurljznsry.supabase.co
```

### 5. Add Pre-commit Hooks

Install `git-secrets` or `gitleaks`:

```bash
# Install gitleaks
brew install gitleaks

# Scan repo
gitleaks detect --source . --verbose

# Add pre-commit hook
gitleaks protect --staged
```

---

## 🔍 Security Audit Checklist

Before making repo public, verify:

- [ ] `.env` removed from git tracking
- [ ] `supabase/config.toml` removed from git tracking
- [ ] Git history cleaned (optional but recommended)
- [ ] Hardcoded credentials removed from source code
- [ ] `.env.example` has only placeholder values
- [ ] Documentation uses placeholder values
- [ ] GitHub Actions use secrets, not hardcoded values
- [ ] `.gitignore` updated with all sensitive patterns
- [ ] All contributors notified of history rewrite (if done)
- [ ] New credentials generated (recommended)
- [ ] Security scan completed (`gitleaks detect`)

---

## 🚀 Quick Cleanup Script

Run this to prepare for open source:

```bash
./scripts/prepare-for-open-source.sh
```

This script:
1. Removes sensitive files from tracking
2. Fixes hardcoded credentials in source
3. Updates .gitignore
4. Runs security scan
5. Generates cleanup report

---

## ⚠️ Important Notes

### About Supabase Anon Keys

The exposed key is an **anon/publishable key**, which is designed to be public-facing. However:

- ✅ **It's safe** in frontend code when RLS is enabled
- ⚠️ **Still sensitive** because it identifies your specific project
- 🔒 **Best practice**: Don't hardcode it, even if it's public
- 🔄 **Rotate it**: After exposure in git history, generate new one

### About Project IDs

Your project ID `vatgianzotsurljznsry` is visible in:
- Public API endpoints
- Browser network requests
- Frontend bundle

**For open source**:
- Replace with placeholder in docs: `YOUR_PROJECT_ID`
- Keep in `.env.example` as template
- Users will use their own project IDs

### What About Service Role Keys?

Check if `service_role` key is exposed anywhere:

```bash
grep -r "service.role\|service_role" --include="*.ts" --include="*.js" .
```

If found: **IMMEDIATELY ROTATE** - This key has admin access!

---

## 📚 Additional Resources

- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [git-filter-repo](https://github.com/newren/git-filter-repo)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [Gitleaks - Secrets scanner](https://github.com/gitleaks/gitleaks)
- [Supabase: Security Best Practices](https://supabase.com/docs/guides/api/api-keys)

---

## 🆘 If Credentials Already Leaked

If you already made the repo public with credentials:

1. **Immediately**: Rotate all credentials in Supabase Dashboard
2. **Clean history**: Use BFG or git-filter-repo
3. **Force push**: `git push --force --all`
4. **Notify**: Tell anyone who cloned to re-clone
5. **Monitor**: Check Supabase logs for unauthorized access

---

*Run `./scripts/security-audit.sh` to check current status*
