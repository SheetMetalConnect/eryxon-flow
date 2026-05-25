# ERY-94 Hosted-Trial Reporting Pack

Date: 2026-05-24
Owner: Engineer
Issue: [ERY-94](/ERY/issues/ERY-94)
Parent: [ERY-88](/ERY/issues/ERY-88)
Related: [ERY-35](/ERY/issues/ERY-35), [ERY-36](/ERY/issues/ERY-36), [ERY-25](/ERY/issues/ERY-25)

## Objective

First internal-only hosted-trial reporting path defined in [ERY-88](/ERY/issues/ERY-88):
show trial health from signals we already control, with no third-party
analytics and no tenant-identifying detail crossing the internal boundary.

## Reporting surface

One root-admin SECURITY DEFINER function, modelled on `list_all_tenants()`:

```
public.report_hosted_trial_summary(
  p_new_trial_window_days integer DEFAULT 14,
  p_expiring_window_days  integer DEFAULT 7
)
```

Migration: `supabase/migrations/20260525000000_hosted_trial_reporting_pack.sql`.

It returns a single aggregate row — counts and timestamps only. It never
returns tenant ids, names, emails, plans-per-tenant, or contract detail, so
its output is safe to paste into synced issue/PR surfaces verbatim. The body
hard-guards on `is_root_admin()`; non-root callers get an exception.

Run it (root-admin Supabase session or service role):

```sql
select * from public.report_hosted_trial_summary();        -- default 14d / 7d
select * from public.report_hosted_trial_summary(30, 14);  -- custom windows
```

### Columns

| Column | Meaning |
|--------|---------|
| `new_trials_in_window` | Trial-cohort tenants created within `new_trial_window_days`. |
| `trials_live` | `status = 'trial'`, ends beyond the expiring window. |
| `trials_expiring_soon` | `status = 'trial'`, ends within `expiring_window_days`. |
| `trials_lapsed_unconverted` | Trial/expired tenants whose `trial_ends_at` has passed. |
| `trials_converted_active` | Trial-cohort tenants now `status = 'active'`. |
| `trial_to_active_transitions` | `subscription_events` trial→active within window. |
| `trial_to_cancelled_transitions` | `subscription_events` trial→cancelled within window. |
| `trials_activated` | Trial-cohort tenants with a pilot-critical activation event. |
| `trials_not_yet_activated` | Trial/expired tenants with no activation event yet. |

## Documented proxies

**Trial cohort.** A tenant is a hosted trial when `trial_ends_at IS NOT NULL`
and it is not cancelled. `tenants.status` carries the lifecycle marker
(`trial` = live, `expired` = lapsed, `active` = converted). `billing_enabled`
is intentionally *not* used as a discriminator: in current hosted data every
tenant has billing disabled, so it carries no signal.

**Activation.** A trial is "activated" on its first pilot-critical product
event in `activity_log`. Production-work entity types count as activation
evidence: `job(s)`, `operation(s)`, `part(s)`, `quantity`, `time_entry`,
`issue`. Setup/admin events (`cells`, `profiles`) do not. The activity-log
path writes both singular (`job`) and plural (`jobs`) `entity_type` values, so
both are matched. This keeps the first reporting slice grounded in real
product use without adding analytics vendors.

**Transitions.** Sourced from `subscription_events` (`old_status = 'trial'`).
This table is empty today, so the transition counts read `0` until subscription
events start flowing — the query is already correct for when they do.

## Privacy boundary

- Function output is aggregate-only and contains no tenant-identifying detail.
- Aggregate counts, dates, and statuses may go onto GitHub/synced issues.
- Tenant-identifying detail stays inside Supabase root-admin sessions and the
  existing internal `notify-new-signup` inbox flow — never in synced surfaces.

## Verification

Query logic was run read-only against the live hosted dataset (48 tenants) on
2026-05-24. The single output row reconciles against the raw breakdown
(15 `trial` + 30 `expired` + 3 `active`; `subscription_events` empty;
`activity_log` ~11.6k rows across all tenants).

### Sanitized weekly summary (sample, 2026-05-24)

```
Hosted-trial summary — window 14d new / 7d expiring
  New trials (14d):            2
  Live trials:                 3
  Expiring within 7d:          0
  Lapsed, unconverted:         42
  Converted to active:         1
  Trial -> active (14d):       0   (no subscription_events yet)
  Trial -> cancelled (14d):    0   (no subscription_events yet)
  Activated (pilot usage):     31
  Not yet activated:           15
```

This sample is aggregate-only and safe to post into synced issue threads.

## Deployment note

The migration is implemented and the query is verified, but not yet applied to
production. Applying the migration to `app.eryxon.eu` is a board-gated step
(per Engineer approval gates) and is left for the next release train.
