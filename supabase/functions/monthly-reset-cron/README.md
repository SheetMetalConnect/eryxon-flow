# Monthly Parts Counter Reset Cron Job

This Supabase Edge Function resets the `current_month_parts` counter for all active tenants at the start of each billing cycle (monthly).

## Purpose

- Resets `current_month_parts` to 0 for all tenants on the 1st of each month
- Logs the reset in the `monthly_reset_logs` table for audit trail
- Provides summary statistics of the reset operation

## Configuration

### 1. Environment Variables

Set the following environment variable in your Supabase project:

```bash
CRON_SECRET=your-secure-random-secret-here
```

Generate a secure secret:
```bash
openssl rand -hex 32
```

### 2. Supabase Cron Setup

You have two options to schedule this function:

#### Option A: Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard > Edge Functions
2. Select `monthly-reset-cron`
3. Add a Cron Trigger:
   - **Schedule**: `0 0 1 * *` (At 00:00 on day 1 of every month)
   - **HTTP Method**: POST
   - **Headers**: `x-cron-secret: your-secret-here`

#### Option B: pg_cron (Advanced)

If you prefer to use PostgreSQL's `pg_cron` extension:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the monthly reset
SELECT cron.schedule(
  'monthly-parts-reset',           -- Job name
  '0 0 1 * *',                      -- Cron schedule (1st of every month at midnight UTC)
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

-- View scheduled jobs
SELECT * FROM cron.job;

-- Unschedule if needed
SELECT cron.unschedule('monthly-parts-reset');
```

## Manual Trigger

You can manually trigger the reset (for testing) using:

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/monthly-reset-cron \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your-secret-here" \
  -d '{}'
```

Or using the service role key:

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/monthly-reset-cron \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{}'
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_tenants_reset": 15,
      "total_parts_reset": 2543,
      "successful_resets": 15,
      "failed_resets": 0,
      "duration_ms": 234,
      "reset_timestamp": "2025-12-01T00:00:00.000Z"
    },
    "reset_details": [
      {
        "tenant_id": "uuid-here",
        "previous_count": 523,
        "reset_successful": true
      }
    ],
    "message": "Successfully reset parts counters for 15 tenant(s)"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Database error: ...",
    "timestamp": "2025-12-01T00:00:00.000Z"
  }
}
```

## Monitoring

### Check Reset Logs

Query the reset logs to verify successful resets:

```sql
-- View recent resets
SELECT
  id,
  tenant_id,
  reset_date,
  previous_parts_count,
  billing_period_start,
  billing_period_end,
  reset_type,
  metadata
FROM monthly_reset_logs
ORDER BY reset_date DESC
LIMIT 50;

-- Summary by month
SELECT
  DATE_TRUNC('month', reset_date) as month,
  COUNT(*) as total_resets,
  SUM(previous_parts_count) as total_parts_reset
FROM monthly_reset_logs
WHERE reset_type = 'automatic'
GROUP BY DATE_TRUNC('month', reset_date)
ORDER BY month DESC;
```

### Check Cron Job Status (if using pg_cron)

```sql
-- View job run history
SELECT * FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'monthly-parts-reset')
ORDER BY start_time DESC
LIMIT 10;
```

## Security

- The function is protected by either a cron secret or service role key
- Only POST requests are accepted
- All resets are logged in the audit table
- Uses Row Level Security (RLS) to ensure data isolation

## Troubleshooting

### Cron job not running

1. Check if the cron job is scheduled:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'monthly-parts-reset';
   ```

2. Check for errors in job run details:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE status = 'failed'
   ORDER BY start_time DESC;
   ```

### Manual reset needed

If the cron job fails, you can manually reset counters:

```sql
-- Call the reset function directly
SELECT * FROM reset_monthly_parts_counters();
```

## Notes

- The reset happens at midnight UTC on the 1st of each month
- Only tenants with `status = 'active'` are included
- Previous month's part counts are logged for historical tracking
- The function is idempotent - running it multiple times won't cause issues
