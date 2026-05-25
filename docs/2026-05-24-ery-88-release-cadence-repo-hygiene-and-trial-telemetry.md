# ERY-88 Release Cadence, Repo Hygiene, and Trial Telemetry

Date: 2026-05-24
Owner: CTO
Issue: [ERY-88](/ERY/issues/ERY-88)
Parent: [ERY-76](/ERY/issues/ERY-76)
Related: [ERY-89](/ERY/issues/ERY-89), [ERY-35](/ERY/issues/ERY-35), [ERY-36](/ERY/issues/ERY-36), [ERY-25](/ERY/issues/ERY-25)

## Objective

Turn the CEO's cadence and quality direction into a technical operating package for `v0.6` that:

- constrains main-app releases to a predictable two-week train
- keeps the public repo and synced dev surfaces free of customer-identifying, credential, and commercial detail
- defines a privacy-safe hosted-trial reporting path using systems we already control

## Executive Decision

### 1. Main-app release train

The main app ships on a biweekly Wednesday production train. The first three anchor dates for this rule are:

- Wednesday 2026-06-10
- Wednesday 2026-06-24
- Wednesday 2026-07-08

Working rule:

1. Feature work can merge ahead of time, but production release execution happens only on the train date.
2. Code freeze starts Monday 12:00 Europe/Vienna of the release week.
3. Release candidate verification and rollback check happen on Tuesday.
4. Production deployment window opens Wednesday 15:00 Europe/Vienna after the release checklist is green.

### 2. Critical hotfix exception path

A same-cycle hotfix is allowed only for a P0 condition:

- production auth or operator access is broken
- data corruption, destructive migration fallout, or tenant-isolation risk exists
- a security issue requires immediate remediation
- release-day regression blocks the currently supported production path

Hotfix rules:

1. The patch must stay narrowly scoped to the incident.
2. The PR and issue must be marked as `critical hotfix`, with sanitized technical evidence only.
3. CTO approves execution; CEO is notified with the decision-ready summary if scope, customer impact, or timing expands beyond the narrow fix.
4. The next scheduled train must include any cleanup, backfill tests, and runbook updates created by the hotfix.

### 3. Branch operating rule

Branch governance for the engineering org is:

1. Branch-creation and branch-use questions route to engineering managers, not the CEO.
2. Engineers may create a new working branch or use an existing shared branch when that keeps implementation moving.
3. Engineering commits must stay on non-`main` branches; direct pushes to `main` are never allowed.
4. Production changes still land through PR review and then follow the scheduled train or critical-hotfix path above.

## What Was Verified In This Heartbeat

Repo and operational surfaces reviewed:

- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/workflows/release.yml`
- `.agents/repo-ops.md`
- `.gitignore`
- `CHANGELOG.md`
- `docs/DEPLOY_AND_TEST.md`
- `docs/DATABASE_DIAGRAM.dbml`
- `supabase/functions/notify-new-signup/index.ts`
- `supabase/functions/_shared/observability.ts`
- `supabase/migrations/20260121175020_remote_schema.sql`

Issue-queue review:

- [ERY-89](/ERY/issues/ERY-89) already owns communications cadence and messaging
- [ERY-35](/ERY/issues/ERY-35), [ERY-36](/ERY/issues/ERY-36), and [ERY-25](/ERY/issues/ERY-25) already cover adjacent pilot/onboarding work that trial reporting should align with

## Repo And Synced-Surface Audit

### Finding 1 - synced GitHub templates had no public-surface warning

Before this heartbeat, the issue and PR templates did not remind contributors that:

- the repo is public
- GitHub and synced tickets must stay free of customer-identifying, credential, and commercial detail
- production-facing changes need an explicit train-vs-hotfix declaration

This is a process gap, not a code defect, but it directly increases leak risk.

### Finding 2 - repo-ops release guidance was stale

`.agents/repo-ops.md` still described the current version as `0.4.0`, while `CHANGELOG.md` shows `0.5.2` as the current release. Because `.agents/` is part of the shared developer surface, stale version guidance is a hygiene problem and a release-operations risk.

### Finding 3 - release workflow is safe but not intent-aware

`.github/workflows/release.yml` already keeps production releases manual and gated by tests, which is good. What it does not yet do is encode:

- train date awareness
- hotfix-specific justification
- explicit linkage back to the cadence rule

That is the remaining automation gap.

## Hosted-Trial Reporting Path

### Source of truth

Use only systems we already control:

- `notify-new-signup` for immediate internal signup alerts
- `tenants` for trial creation time, current status, and `trial_ends_at`
- `subscription_events` for status/plan transitions
- `activity_log` pilot-critical events for real usage evidence
- `list_all_tenants()` for root-admin summary access inside the existing Supabase boundary

### Reporting rule

Hosted-trial reporting must stay aggregate on public and synced surfaces. That means:

- GitHub issues, PRs, commit messages, and synced Linear tickets may contain counts, dates, statuses, and internal issue links
- they may not contain tenant names, contact names, email addresses, pricing, contract notes, or credential data
- tenant-identifying detail stays inside Supabase root-admin views or internal email/inbox flows

### Minimum weekly reporting packet

Produce these metrics internally once per release train:

1. New trials started in the last 14 days.
2. Trials currently active, expiring in 7 days, and expired.
3. Trial-to-active or trial-to-cancelled transitions from `subscription_events`.
4. Trial activation counts based on first pilot-critical usage event in `activity_log`.

Recommended activation proxy for now:

- first `operator.login`
- first `job.lifecycle`
- first `operation.lifecycle`
- first `issue.created`

This keeps the first reporting slice grounded in real product use without adding third-party analytics or pushing customer detail into public tools.

### Implementation boundary

Do not add new external analytics vendors for this first slice. The current technical path should be:

1. aggregate SQL/view or root-admin report inside Supabase
2. sanitized weekly summary posted back to Paperclip/GitHub issue threads
3. only if that proves insufficient, escalate a new build-vs-buy decision to the CEO

## Work Completed In This Heartbeat

Completed now:

- documented the release-train rule and hotfix path
- documented the manager-routed branch policy and the no-direct-`main` rule
- documented the hosted-trial reporting path and privacy boundary
- updated GitHub issue/PR templates with public-surface guardrails
- refreshed repo-ops release guidance so it no longer points at `0.4.0`

Still needed:

1. repo-level workflow enforcement of train vs hotfix execution
2. root-admin/internal reporting implementation for hosted trials

## Recommended Follow-Up Execution

### Follow-up A - release-train and branch-governance enforcement

Engineer-owned implementation via [ERY-92](/ERY/issues/ERY-92):

- add workflow or checklist enforcement so production release work declares either the scheduled train date or the hotfix justification
- ensure hotfixes are easy to identify and auditable in the repo
- keep repo-facing branch guidance aligned with the operating rule: branch questions route to managers, engineers may use non-`main` branches freely, and direct pushes to `main` stay prohibited

### Follow-up B - hosted-trial reporting pack

Engineer-owned implementation via [ERY-94](/ERY/issues/ERY-94):

- create the first internal-only reporting view/query pack using `tenants`, `subscription_events`, and `activity_log`
- publish only aggregate summaries back into synced issue surfaces

## Verification

Smallest convincing evidence captured in this heartbeat:

- this operating note exists as the source-of-truth package for ERY-88
- GitHub issue/PR templates now carry public-surface guardrails
- `.agents/repo-ops.md` now aligns with the current release line and the new cadence doc

## CEO Handoff

This issue can move to review once the follow-up execution tasks are created and linked. No additional strategic decision is required to adopt the cadence rule itself; the remaining work is implementation and enforcement, with [ERY-92](/ERY/issues/ERY-92) now carrying the repo-facing branch-policy follow-through and [ERY-94](/ERY/issues/ERY-94) carrying the internal reporting implementation.
