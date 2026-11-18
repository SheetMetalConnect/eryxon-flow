# CSV Import Templates

Sample CSV files for importing data into Eryxon Flow via **Admin > Data Import**.

## Import Order

Import in this order to satisfy dependencies:

1. **cells.csv** — production cells / work centers
2. **resources.csv** — machines, tooling, fixtures
3. **jobs.csv** — customer orders / work orders
4. **parts.csv** — parts within jobs (references jobs via `job_external_id`)
5. **operations.csv** — routing steps (references parts via `part_external_id`, cells via `cell_name`)

## How It Works

The import wizard maps CSV columns to database fields. Records are upserted using `external_id` + `external_source` as the unique key — importing the same file twice updates existing records instead of creating duplicates.

## Customizing

- Replace the sample data with your own
- Keep the header row — column names must match exactly
- `external_id` and `external_source` are required for every record
- Dates use `YYYY-MM-DD` format
- `estimated_time_minutes` is in minutes
- `cell_name` in operations must match a cell name exactly

## API Alternative

These same records can be synced programmatically via the bulk-sync API:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/api-jobs/bulk-sync \
  -H "Authorization: Bearer ery_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"items": [...]}'
```
