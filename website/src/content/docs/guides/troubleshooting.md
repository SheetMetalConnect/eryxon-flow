---
title: "Troubleshooting"
description: "Common issues and solutions for Eryxon Flow."
---

## Application Issues

### 1. "I don't see any operations in my Work Queue"
- Check if work has been assigned to you.
- Clear all filters in the UI.
- Check "My Activity" - you might have completed them all.

### 2. Timer doesn't start (Click "Start Timing" fails)
- **Cause**: You likely have *another* operation still timing.
- **Fix**: Check the "Currently Timing" widget at the top of the screen. Stop that timer first.

### 3. "Cannot complete - next cell at capacity"
- This is a **QRM restriction**. The destination cell is full.
- **Fix**: Wait for capacity, or ask Supervisor to increase limit/override.

### 4. Can't create new job (Admin)
- Check **My Plan** page. You might have hit the Hosted Alpha Trial limits.
- **Fix**: Delete old jobs, or switch to a self-hosted deployment and set the tenant's `plan` to `enterprise` with `null` limit columns in the database (see [Self-Hosting Guide](/guides/self-hosting/) for details on plan configuration).

### 5. "Data export taking too long"
- Large datasets take 30-60s. **Do not close the tab.**
- CSV is faster than JSON.

---

## Deployment & Self-Hosting Issues

### New Users Can't Log In

The `on_auth_user_created` trigger must exist on `auth.users`. Without it, new signups won't get profiles/tenants. The consolidated migration `20260127230000_post_schema_setup.sql` ensures this.

Release `0.3.3` expects the signup notification path to be configured as a **Database Webhook**, not a hardcoded SQL URL. That keeps hosted and self-hosted deployments aligned.

### Admin Signup Notifications Duplicated or Missing

- The consolidated migration `20260127230000_post_schema_setup.sql` removes the old duplicate-prone trigger path
- Confirm the `notify-new-signup` database webhook is configured in Supabase Dashboard (see [Self-Hosting Guide Step 7](/guides/self-hosting/))
- Confirm `RESEND_API_KEY`, `SIGNUP_NOTIFY_EMAIL`, `APP_URL`, and `EMAIL_FROM` are set as edge function secrets

### Template Literal Errors

If URLs aren't interpolating correctly, you're using single quotes instead of backticks:

```javascript
// Wrong
const url = 'https://${projectId}.supabase.co';

// Correct
const url = `https://${projectId}.supabase.co`;
```

### Storage 403 Forbidden Errors

Private buckets require signed URLs, not public URLs. Use `createSignedUrl()` with appropriate expiry.

Required buckets: `parts-images`, `issues`, `parts-cad`, `batch-images`

### Edge Functions Return 502

Import map might not be deployed. Redeploy all functions:

```bash
supabase functions deploy
```

Other checks:
- View logs: `supabase functions logs`
- Verify secrets: `supabase secrets list`
- If experiencing 15s+ timeouts or cold start issues: functions use consolidated handlers to avoid deep module resolution. Circular dependencies in `_shared/` folder can cause startup delays.

### Migrations Fail with "Type Already Exists"

Database has partial state from previous attempts. For fresh setups only (DESTRUCTIVE):

```sql
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO service_role;
```

Then re-run: `supabase db push`

### Verify Edge Functions Work

Smoke-test function reachability with the `plan-mode` endpoint (no API key required):

```bash
curl https://yourproject.supabase.co/functions/v1/plan-mode \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

A successful response returns a JSON payload with `selfHosted`, `trialDays`, and `pricingStatus` fields. If you get 404 or 502, the functions are not deployed correctly — redeploy with `supabase functions deploy`.

> **Note:** The `api-*` endpoints (e.g. `api-jobs`) require an Eryxon API key (`ery_live_*` / `ery_test_*`), not the Supabase anon key. Use `plan-mode` for reachability checks.

### Cron Jobs Not Running

Verify `pg_cron` extension is enabled:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

If empty, run `seed.sql` to schedule jobs.

---

## 3D STEP Viewer Issues

### "Failed to load STEP parser library"

This is usually a CSP (Content Security Policy) issue. Check your browser console for errors:

- **`EvalError: Refused to evaluate`** → Your proxy is blocking `'unsafe-eval'`. The STEP parser's Emscripten embind requires it. Add `'unsafe-eval'` to your proxy's `script-src` directive, or remove any proxy-level CSP to let the built-in `<meta>` tag handle it.
- **`Refused to create a worker`** → Add `worker-src 'self' blob:` to your CSP. The WASM parser spawns Web Workers from blob URLs.
- **`Failed to fetch` from cdn.jsdelivr.net** → The `occt-import-js` library is loaded from the jsDelivr CDN. Ensure `https://cdn.jsdelivr.net` is allowed in `script-src`.

If you're behind a corporate firewall that blocks CDN access, the viewer will not work without network access to jsDelivr.

### 3D CAD viewer won't load
- Verify file is `.step` or `.stp` format (the viewer only supports STEP files; PDF viewing is separate).
- Storage limit is **100MB**, but browser STEP parsing works best under **50MB**.
- Try re-exporting from CAD software.
- Click **"Fit View"** if model is off-screen.

### "No geometry found in STEP file"
- Corrupt STEP file
- Unsupported STEP version
- Empty or invalid file

**Solution**: Verify file is valid STEP format, try re-exporting from CAD software.

---

## Configuration Reference

### Key Migration: `20260127230000_post_schema_setup.sql`

This consolidated migration applies:
- Storage buckets and RLS policies
- Cron jobs (pg_cron)
- Auth trigger for new user signup (`on_auth_user_created`)
- `blocked` status to batch_status enum
- `parent_batch_id` column for batch nesting
- `nesting_image_url` and `layout_image_url` columns
- `batch_requirements` table with RLS
- Signup notification trigger cleanup (migrated to Database Webhook)

Always run migrations in order. Never skip migrations.

### SQL Syntax Notes
- ✅ Use `IF EXISTS ... THEN ... END IF` blocks
- ❌ Don't use `PERFORM ... WHERE EXISTS` (invalid syntax)

### Performance Tips

- Enable Redis caching for high-traffic deployments
- Use Cloudflare Pages for global edge distribution
- Configure proper database indexes (included in migrations)
- Monitor Edge Function execution times in Supabase dashboard

---

## Reporting Bugs
If you find a system bug:
- **GitHub Issues**: [Report Here](https://github.com/SheetMetalConnect/eryxon-flow/issues)
