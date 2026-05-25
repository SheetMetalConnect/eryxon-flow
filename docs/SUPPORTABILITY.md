# Flow Supportability Baseline

Operational baseline required before Eryxon Flow can run a managed pilot. Tracks
ERY-20. Three pillars: **observability** (structured logs, error capture, alerting),
**backup-and-restore**, and **audit coverage** for critical admin/security actions.

> Status legend: ✅ in place · 🟡 in place but needs a decision/wiring · ⛔ gap

---

## 1. Structured logs, error capture, alerting

### What exists today ✅

| Layer | Mechanism | Location |
|-------|-----------|----------|
| Frontend logging | Leveled, context-aware logger (`debug/info/warn/error`, scoped loggers, timed ops). Prod emits only `warn`+`error`. | `src/lib/logger.ts`, `docs/ERROR_HANDLING.md` |
| Frontend error typing | `AppError` + `ErrorCode` + `fromSupabaseError` + `Result` type | `src/lib/errors.ts` |
| Crash isolation | `ErrorBoundary` with `onError` hook + HOC + lazy fallbacks | `src/components/ErrorBoundary.tsx` |
| Edge function errors | Centralized `handleError` / `handleOptions` in the handler factory; standardized JSON error envelopes | `supabase/functions/_shared/handler.ts`, `_shared/validation/errorHandler.ts` |
| API/usage logs | `api_usage_logs`, `webhook_logs`, `mqtt_logs`, `mcp_server_logs`, `mcp_key_usage_logs` tables | DB |

### Gaps for the managed pilot

- 🟡 **`ErrorBoundary.onError` is a no-op by default** — there is no sink. The pilot
  needs frontend crashes and unhandled promise rejections shipped to a collector.
- ⛔ **No alerting.** Nothing pages or notifies on error-rate spikes, edge-function
  5xx, auth failures, or backup failure.
- 🟡 **Edge function logs** are only visible in Supabase's dashboard log viewer; no
  retention/drain beyond the platform default.

### Recommendation (decision required — see "Open decisions")

For a single managed pilot, keep it lean:

1. **Error capture**: wire `ErrorBoundary.onError` + a global
   `window.onunhandledrejection` handler to a hosted error tracker (Sentry free/team
   tier) **or** to a `client_errors` table via an existing public edge function if we
   want to avoid a third-party processor for pilot data residency. Tag every event
   with `tenant_id` and release/version.
2. **Edge function errors**: enable a Supabase **log drain** to the same destination,
   or have `handleError` emit a structured `console.error` JSON line (level, route,
   tenant, request id) that the drain can parse.
3. **Alerting**: a single rule set on the chosen destination — error-rate threshold,
   edge-function 5xx threshold, auth-failure spike, and **daily backup-success
   heartbeat** (alert on absence). Route to one on-call channel for the pilot.

This pillar needs a tool/data-residency decision and likely a small recurring cost,
so it is escalated rather than silently chosen. The frontend wiring and the structured
`console.error` envelope are implementable immediately once the destination is agreed.

---

## 2. Backup-and-restore drill

Hosted Flow runs on managed Supabase Postgres. Two layers:

- **Platform PITR / daily backups** — provided by Supabase for the project (verify the
  plan tier includes daily backups + PITR for the pilot project).
- **Portable logical backup** — `pg_dump -Fc` of the project DB, stored off-platform,
  so we can restore into *any* Postgres (self-host fallback, forensic copy, migration).

### Drill runbook (logical backup — the portable path)

```bash
# 1. Backup (custom format, compressed)
pg_dump -Fc "$SOURCE_DATABASE_URL" -f flow_backup_$(date +%Y%m%d).dump

# 2. Record a checksum: row counts of the tables that matter
psql "$SOURCE_DATABASE_URL" -tA -c \
  "SELECT 'jobs='||count(*) FROM jobs UNION ALL \
   SELECT 'activity_log='||count(*) FROM activity_log UNION ALL \
   SELECT 'tenants='||count(*) FROM tenants;"

# 3. Restore into a fresh, empty target (NEVER the live DB)
createdb flow_restore_test
pg_restore --no-owner -d "$RESTORE_DATABASE_URL" flow_backup_YYYYMMDD.dump

# 4. Verify: re-run the row-count checksum against the restored DB and diff.
# 5. Functional check: confirm triggers/functions survived — insert one row into an
#    audited table and confirm a matching activity_log row appears.
```

For platform PITR, the equivalent drill is: restore the project to a new project at a
chosen timestamp via the Supabase dashboard/CLI, then run steps 2/4/5 against it.

### Drill executed once ✅

Run on 2026-05-24 against a throwaway Postgres 15 seeded with the audit schema below.
Procedure and result (full transcript in ERY-20 thread):

| Step | Result |
|------|--------|
| `pg_dump -Fc` | 11,489-byte dump produced |
| Pre-restore counts | `activity_log=5, api_keys=1, tenants=1` |
| Drop DB + restore into fresh DB | restore completed, no errors |
| Post-restore counts | `activity_log=5, api_keys=1, tenants=1` — **match** |
| Functional check (insert into `api_keys`) | audit trigger fired, `activity_log` 5 → 6 |

**Outstanding:** repeat once against the *actual* hosted pilot project (needs prod DB
read access + a scratch restore target) before go-live. That access is an approval gate.

---

## 3. Audit coverage for critical admin/security actions

All audit rows land in the existing **`activity_log`** table (tenant-scoped RLS for
SELECT, system INSERT, full-text search, `get_activity_logs()` reader).

### Coverage before ERY-20 ✅

`log_activity()` trigger on business data: **cells, jobs, operations, parts, profiles**.

### Coverage added by ERY-20 (proposed — needs CTO sign-off on the list)

New `log_admin_activity()` trigger (`supabase/migrations/20260524120000_audit_admin_security_actions.sql`)
on the admin/security-sensitive tables, with **secret redaction** and robust tenant
resolution:

| Table | Why it's pilot-critical | Secret columns redacted |
|-------|------------------------|-------------------------|
| `api_keys` | API credential lifecycle | `key_hash` |
| `mcp_authentication_keys` | MCP credential lifecycle | `key_hash` |
| `user_roles` | Privilege grants/revokes (no `tenant_id` col → resolved via `profiles.user_id`) | — |
| `invitations` | Tenant access grants | `token` |
| `webhooks` | Outbound data egress config | `secret_key` |
| `installed_integrations` | Third-party integration installs | `config` |
| `mcp_server_config` | MCP server enable/disable | — |
| `tenants` | Tenant lifecycle (tenant = row `id`) | — |

Redaction is enforced in the trigger: `key_hash`, `secret_key`, `token`, and `config`
are replaced with `"[redacted]"` before the diff is written. Rows are tagged
`metadata.admin_audit = true`.

### Verified ✅

Trigger logic proven on a throwaway Postgres 15 (transcript in ERY-20 thread):

- All 5 exercised admin actions logged with correct `tenant_id` and `admin_audit=true`.
- `user_roles` (no `tenant_id` column) → tenant correctly resolved via `profiles`.
- `tenants` → tenant correctly resolved to the row `id`.
- **Secret-leak check returned 0 rows** — raw `key_hash`/`secret_key` values never reach
  the log; both render as `[redacted]`.

### Not yet covered (proposed out-of-scope for pilot — confirm)

`mqtt_publishers`, `mcp_endpoints`, `factory_*` config, `integrations` (global catalog,
no tenant) — lower security sensitivity. Add later if the pilot needs it.

---

## Open decisions (escalated to CTO)

1. **Error-capture/alerting destination** — Sentry vs. in-DB `client_errors` table;
   drives data residency and a small recurring cost.
2. **Audit coverage list** — confirm the 8 tables above are the agreed set for the
   pilot (success criterion uses the word *agreed*).
3. **Prod backup drill** — grant scratch access to run the drill once against the
   hosted pilot project (approval gate; no prod access used yet).

Migration and frontend wiring are ready to implement on agreement; nothing has been
committed, deployed, or run against production.
