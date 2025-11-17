# Plan Limits & Monthly Reset Implementation

This document describes the implementation of subscription plan limits enforcement and monthly parts counter reset functionality.

## Overview

This implementation adds:

1. **Monthly parts counter reset** - Automated reset at the start of each billing cycle
2. **Plan limits enforcement** - API endpoints prevent exceeding plan limits
3. **Automated usage tracking** - Database triggers automatically update counters
4. **Audit trail** - All resets and quota checks are logged

## Plan Structure

### Updated Pricing

| Plan | Price | Jobs Limit | Parts/Month Limit | Storage | API Access |
|------|-------|------------|-------------------|---------|------------|
| **Free** | $0 | 100 | 1,000 | 5 GB | Limited (60 req/hr) |
| **Pro** | $97/month | 1,000 | 10,000 | 50 GB | Full (1000 req/hr) |
| **Enterprise** | Starting at $497/month | Unlimited | Unlimited | Unlimited | Full (10000 req/hr) |

### Plan Features

#### Free Plan
- All core features included
- Up to 100 jobs (cumulative)
- Up to 1,000 parts per month
- 5 GB file storage
- Limited API access (rate limited to 60 requests/hour)
- Multi-tenant architecture
- Email support
- Documentation access

#### Pro Plan
- Unlimited users
- Up to 1,000 jobs (cumulative)
- Up to 10,000 parts per month
- 50 GB file storage
- Full API access (rate limited to 1000 requests/hour)
- Multi-tenant architecture
- Priority email support
- Advanced analytics
- Webhook integrations

#### Enterprise Plan
- Everything in Pro
- Unlimited jobs
- Unlimited parts
- Unlimited storage
- Unlimited usage
- Self-hosted (on-premises) option
- Single-tenant deployment
- Completely air-gapped
- SSO integration
- Dedicated infrastructure
- Premium support
- Custom SLA
- White-label options

## Database Changes

### Migration: `20251117180000_usage_tracking_and_plan_limits.sql`

#### New Fields in `tenants` Table

```sql
-- Track when parts counter was last reset
last_parts_reset_date TIMESTAMPTZ DEFAULT NOW()

-- Track total jobs created (cumulative, not monthly)
current_jobs INTEGER DEFAULT 0
```

#### New Table: `monthly_reset_logs`

Tracks all monthly resets for audit trail:

```sql
CREATE TABLE monthly_reset_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  reset_date TIMESTAMPTZ NOT NULL,
  previous_parts_count INTEGER NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  reset_type TEXT NOT NULL, -- 'automatic' or 'manual'
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

#### Database Triggers

Automatic usage tracking triggers:

1. **`trigger_increment_jobs`** - Increments `current_jobs` when a job is created
2. **`trigger_decrement_jobs`** - Decrements `current_jobs` when a job is deleted
3. **`trigger_increment_parts`** - Increments `current_month_parts` when parts are created
4. **`trigger_decrement_parts`** - Decrements `current_month_parts` when parts are deleted

#### Database Functions

1. **`reset_monthly_parts_counters()`** - Resets parts counter for all active tenants
2. **`can_create_job(tenant_id)`** - Returns TRUE if tenant can create more jobs
3. **`can_create_parts(tenant_id, quantity)`** - Returns TRUE if tenant can create more parts
4. **`get_tenant_quota(tenant_id)`** - Returns detailed quota information

## API Changes

### Edge Function: `monthly-reset-cron`

**Purpose**: Monthly cron job to reset parts counters

**Schedule**: `0 0 1 * *` (midnight UTC on the 1st of each month)

**Security**: Requires `CRON_SECRET` header or service role key

**Configuration**:

```bash
# Set in Supabase Dashboard > Edge Functions > Environment Variables
CRON_SECRET=your-secure-random-secret
```

**Setup with Supabase Cron**:

```sql
-- Option 1: Supabase Dashboard
-- Go to Edge Functions > monthly-reset-cron > Add Cron Trigger
-- Schedule: 0 0 1 * *
-- Headers: x-cron-secret: your-secret-here

-- Option 2: pg_cron
SELECT cron.schedule(
  'monthly-parts-reset',
  '0 0 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/monthly-reset-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'your-secret-here'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Manual Trigger** (for testing):

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/monthly-reset-cron \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your-secret-here" \
  -d '{}'
```

### Shared Helper: `_shared/plan-limits.ts`

Provides utilities for enforcing plan limits across all API endpoints:

```typescript
// Check if tenant can create a job
const quotaCheck = await canCreateJob(supabase, tenantId);
if (!quotaCheck.allowed) {
  return createLimitErrorResponse(quotaCheck, 'job');
}

// Check if tenant can create parts (with quantity)
const quotaCheck = await canCreateParts(supabase, tenantId, quantity);
if (!quotaCheck.allowed) {
  return createLimitErrorResponse(quotaCheck, 'part');
}

// Get detailed quota information
const limits = await getTenantLimits(supabase, tenantId);
```

### API Endpoints Updated

#### `api-jobs/index.ts`

**POST /api-jobs** - Create Job

Now checks:
1. ✅ Job quota (are they under their job limit?)
2. ✅ Parts quota (can they create all the parts in this job?)

**Error Response** (402 Payment Required):

```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Job limit reached. Your free plan allows 100 jobs. Please upgrade your plan to create more jobs.",
    "resource_type": "job",
    "limit": 100,
    "current": 100,
    "remaining": 0,
    "upgrade_url": "/pricing"
  }
}
```

**Headers**:
- `X-Quota-Limit`: Maximum allowed
- `X-Quota-Current`: Current usage
- `X-Quota-Remaining`: Remaining quota

#### `api-parts/index.ts`

**POST /api-parts** - Create Part

Now checks:
1. ✅ Parts quota (including quantity)

**Error Response** (402 Payment Required):

```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Monthly parts limit reached. Your pro plan allows 10000 parts per month. You have 0 parts remaining this month. This operation requires 5 parts. Please upgrade your plan or wait until next month.",
    "resource_type": "part",
    "limit": 10000,
    "current": 10000,
    "remaining": 0,
    "upgrade_url": "/pricing"
  }
}
```

## Frontend Changes

### Pricing Pages Updated

#### `src/pages/Pricing.tsx`
- Updated Pro plan pricing: $499/month → **$97/month**
- Updated Pro plan limits: Unlimited → **1,000 jobs, 10,000 parts/month**
- Updated Premium plan: Renamed to **"Enterprise"**, starting at **$497/month**
- Added "Limited API access" to Free plan features
- Added "Full API access" to Pro plan features
- Added "Unlimited users" to Pro plan features

#### `src/pages/MyPlan.tsx`
- Updated Pro plan pricing: $499/month → **$97/month**
- Updated Pro plan limits: Unlimited → **1,000 jobs, 10,000 parts/month**
- Updated Premium plan: Renamed to **"Enterprise"**, starting at **$497/month**
- Same feature updates as Pricing.tsx

## Testing

### Test Plan Limits Enforcement

#### Test Free Plan Job Limit

```bash
# Create 101 jobs (should fail on 101st)
for i in {1..101}; do
  curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/api-jobs \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "job_number": "JOB'$i'",
      "customer": "Test Customer",
      "parts": [{
        "part_number": "PART1",
        "material": "Steel",
        "quantity": 1,
        "operations": [{
          "operation_name": "Cut",
          "cell_name": "Laser",
          "estimated_time": 30,
          "sequence": 1
        }]
      }]
    }'
done
```

#### Test Free Plan Parts Limit

```bash
# Create a job with 1001 parts (should fail)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/api-jobs \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "job_number": "LARGE_JOB",
    "customer": "Test Customer",
    "parts": [...]  # 1001 parts array
  }'
```

#### Test Monthly Reset

```bash
# Manually trigger reset (as admin)
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/monthly-reset-cron \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your-secret" \
  -d '{}'

# Check reset logs
SELECT * FROM monthly_reset_logs ORDER BY reset_date DESC LIMIT 10;

# Verify counters reset
SELECT tenant_id, current_month_parts, last_parts_reset_date
FROM tenants
WHERE status = 'active';
```

### Test Usage Tracking Triggers

```sql
-- Create a job and check current_jobs increments
SELECT current_jobs FROM tenants WHERE id = 'your-tenant-id';
-- Insert job via API
SELECT current_jobs FROM tenants WHERE id = 'your-tenant-id'; -- Should be +1

-- Create parts and check current_month_parts increments
SELECT current_month_parts FROM tenants WHERE id = 'your-tenant-id';
-- Insert 5 parts with quantity 2 each
SELECT current_month_parts FROM tenants WHERE id = 'your-tenant-id'; -- Should be +10

-- Delete parts and check decrements
DELETE FROM parts WHERE id = 'some-part-id';
SELECT current_month_parts FROM tenants WHERE id = 'your-tenant-id'; -- Should decrement
```

## Deployment Steps

1. **Run Database Migration**

```bash
# Apply migration
supabase db push

# Or manually run the migration file
psql -h YOUR_DB_HOST -U postgres -d postgres -f supabase/migrations/20251117180000_usage_tracking_and_plan_limits.sql
```

2. **Deploy Edge Functions**

```bash
# Deploy monthly reset cron function
supabase functions deploy monthly-reset-cron

# Deploy updated API endpoints
supabase functions deploy api-jobs
supabase functions deploy api-parts
```

3. **Set Environment Variables**

In Supabase Dashboard > Edge Functions > Environment Variables:

```
CRON_SECRET=your-secure-random-secret-here
```

Generate secret:
```bash
openssl rand -hex 32
```

4. **Configure Cron Job**

Option A: Supabase Dashboard
- Go to Edge Functions > monthly-reset-cron
- Add Cron Trigger:
  - Schedule: `0 0 1 * *`
  - Headers: `x-cron-secret: your-secret`

Option B: pg_cron (see above SQL)

5. **Deploy Frontend Changes**

```bash
# Build and deploy frontend
npm run build
# Deploy to your hosting platform
```

6. **Verify Deployment**

```bash
# Test API endpoints
curl https://YOUR_PROJECT.supabase.co/functions/v1/api-jobs \
  -H "Authorization: Bearer YOUR_API_KEY"

# Test cron function manually
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/monthly-reset-cron \
  -H "x-cron-secret: your-secret" \
  -d '{}'
```

## Monitoring

### Check Reset Logs

```sql
-- View recent resets
SELECT
  r.reset_date,
  t.name as tenant_name,
  r.previous_parts_count,
  r.billing_period_start,
  r.billing_period_end,
  r.reset_type
FROM monthly_reset_logs r
JOIN tenants t ON t.id = r.tenant_id
ORDER BY r.reset_date DESC
LIMIT 50;

-- Monthly reset summary
SELECT
  DATE_TRUNC('month', reset_date) as month,
  COUNT(*) as total_tenants_reset,
  SUM(previous_parts_count) as total_parts_reset,
  AVG(previous_parts_count) as avg_parts_per_tenant
FROM monthly_reset_logs
WHERE reset_type = 'automatic'
GROUP BY DATE_TRUNC('month', reset_date)
ORDER BY month DESC;
```

### Check Quota Usage

```sql
-- Tenants approaching limits
SELECT
  t.name,
  t.plan,
  t.current_jobs,
  t.max_jobs,
  ROUND(100.0 * t.current_jobs / NULLIF(t.max_jobs, 0), 2) as job_usage_pct,
  t.current_month_parts,
  t.max_parts_per_month,
  ROUND(100.0 * t.current_month_parts / NULLIF(t.max_parts_per_month, 0), 2) as parts_usage_pct
FROM tenants t
WHERE t.status = 'active'
  AND (
    (t.max_jobs IS NOT NULL AND t.current_jobs > t.max_jobs * 0.8)
    OR (t.max_parts_per_month IS NOT NULL AND t.current_month_parts > t.max_parts_per_month * 0.8)
  )
ORDER BY parts_usage_pct DESC;
```

### Quota Exceeded Events

Monitor API logs for 402 responses:

```sql
-- If you have an API request log table
SELECT
  tenant_id,
  endpoint,
  status_code,
  error_message,
  COUNT(*) as quota_exceeded_count
FROM api_request_logs
WHERE status_code = 402
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY tenant_id, endpoint, status_code, error_message
ORDER BY quota_exceeded_count DESC;
```

## Troubleshooting

### Counters Out of Sync

If counters become out of sync with actual data:

```sql
-- Manually recalculate and fix counters
UPDATE tenants t
SET
  current_jobs = (SELECT COUNT(*) FROM jobs WHERE tenant_id = t.id),
  current_month_parts = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM parts
    WHERE tenant_id = t.id
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
  );
```

### Cron Job Not Running

1. Check cron job schedule:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'monthly-parts-reset';
   ```

2. Check job run history:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'monthly-parts-reset')
   ORDER BY start_time DESC
   LIMIT 10;
   ```

3. Manually trigger reset:
   ```sql
   SELECT * FROM reset_monthly_parts_counters();
   ```

### API Limits Not Enforcing

1. Check tenant plan limits are set correctly:
   ```sql
   SELECT id, name, plan, max_jobs, max_parts_per_month
   FROM tenants
   WHERE id = 'your-tenant-id';
   ```

2. Check current usage:
   ```sql
   SELECT * FROM get_tenant_quota('your-tenant-id');
   ```

3. Test limit check functions:
   ```sql
   SELECT can_create_job('your-tenant-id');
   SELECT can_create_parts('your-tenant-id', 10);
   ```

## Future Enhancements

1. **Storage Tracking** - Implement actual file size tracking and storage quota enforcement
2. **Usage Analytics** - Dashboard showing usage trends and forecasting
3. **Proactive Notifications** - Email alerts when approaching limits
4. **Soft Limits** - Warning threshold before hard limit
5. **Overage Allowance** - Allow small overages with notification
6. **Usage Export** - API endpoint to export usage data for billing
7. **Custom Billing Cycles** - Support non-monthly billing periods
8. **Rate Limiting** - More sophisticated rate limiting based on plan tier

## Support

For issues or questions:
- Check database logs for errors
- Review Supabase Edge Function logs
- Contact support: office@sheetmetalconnect.com
