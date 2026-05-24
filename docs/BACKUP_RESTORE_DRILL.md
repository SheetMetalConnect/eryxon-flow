# Backup & Restore Drill

Engineer-owned, repeatable version of the ERY-41 manual restore drill. One command backs up
Flow's application-owned state, restores it into a **disposable** target, and runs smoke checks
that go beyond row counts.

> Source-available under BSL 1.1. This drill validates recovery of the local self-hosted
> Supabase stack. It never touches production (`app.eryxon.eu`) or the live working database —
> restores land in a throwaway scratch database and temp directory.

## What it covers

| Dimension | Backed up | Restored into | Verified |
| --- | --- | --- | --- |
| Database | `public`, `auth`, `storage` schemas (`pg_dump`) | scratch database `ery_restore_<ts>` | row-count parity per entity |
| Storage payload | Supabase storage volume (`tar`) | disposable temp dir | file-count parity + sample SHA-256 |

Excluded (same scope boundary as ERY-41): hosted-provider restore, secrets/config
re-provisioning, and Supabase internal runtime schemas (`cron`, `realtime`).

## Prerequisites

- Local Supabase stack running (`supabase status` healthy).
- `docker`, `pg_dump`/`psql` (the heavy dump/restore runs **inside** the db container, so the
  host `pg_dump` major version does not need to match the server).
- macOS or Linux; the script is bash 3.2 compatible.

## Usage

```bash
# Run the full drill (scratch DB + temp files auto-cleaned on success)
scripts/restore-drill.sh

# Keep the restored scratch DB and extracted files for inspection
scripts/restore-drill.sh --keep

# Also write a short markdown summary artifact
scripts/restore-drill.sh --log /tmp/flow-restore-drill.md
```

### Environment overrides (defaults target the local stack)

| Var | Default | Purpose |
| --- | --- | --- |
| `SUPABASE_DB_URL` | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | source DB (read-only queries) |
| `DB_CONTAINER` | `supabase_db_eryxon-flow` | container used for version-matched dump/restore |
| `STORAGE_CONTAINER` | `supabase_storage_eryxon-flow` | storage volume container |
| `STORAGE_ROOT` | `/mnt/stub/stub` | payload root inside the storage container |

## Smoke checks (beyond row counts)

1. **Count parity** — `jobs`, `parts`, `profiles`, `tenants`, `storage.buckets`,
   `storage.objects`, and on-disk file count, source vs restored.
2. **Sample checksum** — SHA-256 of the lexicographically-first storage file, compared between
   the live volume and the extracted snapshot (proves binary payload fidelity, not just counts).
3. **Referential integrity** — no orphan `parts` (every part resolves to a job) and no orphan
   `jobs` (every job resolves to a tenant) in the restored DB.
4. **RLS helper intact** — `public.get_user_tenant_id` is present and defined in the restored DB
   (tenant isolation depends on it).
5. **Pilot-tenant shape** — the busiest tenant's job/part counts match between source and restore.

Any mismatch prints `FAIL <check>` and the script exits non-zero.

## Expected output

```
=== Preflight ===
Source DB reachable, containers present, tools available.
=== 1/6 Backup database (public, auth, storage) ===
Dump written: <n> lines, <size>
=== 2/6 Snapshot storage payload volume ===
Storage snapshot: <size>
=== Capture source metrics ===
  source jobs: <n> ...
  sample sha256: <hash>
=== 3/6 Restore into disposable scratch database ===
Restore completed into ery_restore_<ts>
=== 4/6 Extract storage snapshot to disposable dir ===
Extracted to <tmp> (<n> files)
=== 5/6 Validate restored counts + checksum ===
  PASS  jobs: <n> ...
  PASS  sample_checksum: <hash>
=== 6/6 Restored-environment smoke checks ===
  PASS  no_orphan_parts: 0
  PASS  no_orphan_jobs: 0
  PASS  rls_helper_present: t
  PASS  pilot_jobs: <n>
  PASS  pilot_parts: <n>
=== Result ===
Drill result: PASS
Elapsed: <n>s
```

## Cadence

Keep the monthly drill cadence from ERY-41 for the managed pilot. Run before any pilot
expansion or stack upgrade. Provisional targets: RTO ≤ 4h, RPO ≤ 24h — the local artifact
path completes in seconds, well inside both.
