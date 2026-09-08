# Development and releases

The repository is private. Community retains the Business Source License 1.1;
“Community” does not mean that the current version has an open-source license.
Premium remains separate. Keep customer information and credentials out of code,
issues, pull requests, release notes, and fixtures.

## Feature changes

Use a focused branch, preferably in `.worktrees/` when work overlaps. Trace callers
before changing shared contracts. Fix a reproducible failure, cover behavior at its
boundary, and remove obsolete paths when consolidating functionality. Avoid parallel
implementations for device sizes: the operator interface is responsive, and PWA is
optional (`VITE_ENABLE_PWA=true` at build time). Record improvements and upgrade requirements in `CHANGELOG.md`.

Open a pull request with the problem, resulting behavior, relevant checks, and
migration implications. Review the diff and CI results before merging. A feature
merge does not deploy production. Keep unrelated changes in separate pull requests.

## PR feedback checks

Run `npm run pr:review -- <PR number or URL>` whenever resuming a pull request,
after pushing fixes and receiving review results, and immediately before merging.
Read edited discussion comments and all inline review threads, including resolved
and outdated threads. Record requested reviewers and the commit each review covers;
verify current-head completion separately from CI. Every finding needs a disposition. Verify each fix, rerun relevant tests, then fetch
fresh feedback. The script reports the head and a fingerprint; use its expected
head/fingerprint options to detect changes since review. It does not decide whether
a prose comment has been substantively addressed and never resolves threads.

Use `gh pr merge --match-head-commit <reviewed SHA>` to avoid merging new commits
that arrived after review. Recheck after merging for late feedback and open a
follow-up fix when needed. Do not describe a skipped bot review as a completed one.

`.coderabbit.yaml` configures assertive reviews and incremental reviews on every
push without automatically pausing. CodeRabbit has reviewed earlier PRs, but its
access and plan must also support this now-private repository. Configuration alone
does not install or activate the app; verify its response on the current PR.
See the [CodeRabbit review controls](https://docs.coderabbit.ai/configuration/auto-review).

## Required checks

Use Node 22, the lockfile-installed Supabase CLI, Docker, and Deno 2. Run:

```sh
npm ci
npm run lint
npm run typecheck
npm run test:run
npm run test:release
npm run typecheck:edge
npm run test:edge
npm run build
npm --prefix website ci
npm --prefix website run check
npm --prefix website run build
npm --prefix mcp-server ci
npm --prefix mcp-server run build
npm --prefix mcp-server test
```

`typecheck` checks the referenced TypeScript projects; the root `tsc --noEmit`
command alone does not. CI runs these checks on pull requests, `main`, and release
candidates. ESLint warnings are visible debt, not a claim of a warning-free codebase.

Database checks use a disposable local Supabase stack, never a linked remote target:

```sh
npx --no-install supabase start --exclude studio,postgres-meta,imgproxy,logflare,vector,supavisor,mailpit,realtime,edge-runtime,gotrue,postgrest,storage-api,kong
npm run test:db
npx --no-install supabase stop --no-backup
```

`test:db` exercises tenant isolation, PIN sessions, atomic lifecycle changes, and
concurrent calls. SQL fixtures roll back; concurrency fixtures remove their own rows.
When sharing OrbStack, stop only this project's containers and leave the service
and other projects running. A full migration replay is required for schema changes.
Regenerate `src/integrations/supabase/types.ts` from that tested local schema.

## Versioning and publication

`package.json` is the app version source. Keep both lockfile version fields in
sync. Use SemVer: patches for compatible fixes, minor versions for features, major
versions for incompatible contracts. Before 1.0, use a minor increment and explicit
upgrade notes for incompatible changes. Do not overwrite released versions.
The separately released MCP server has its own version.

After the version and changelog are merged, dispatch **Release** from `main`.
Leave all deployment inputs false to publish the tested image and GitHub release.
The workflow validates the version, rejects existing tags/releases, runs CI, builds
a versioned image, and records the commit and immutable image digest in the notes.
It creates the release tag; do not create that tag beforehand. This is the only
workflow publishing application images. It does not update the old `latest` tag.

## Optional production rollout

Set `deploy_production` only for an intended rollout. For database or function
changes also set the corresponding input and supply the exact expected
`project_ref`; it must match `SUPABASE_PROJECT_REF_PROD`. The workflow serializes
production actions and rejects missing deployment configuration.

Required repository configuration:

- Image deployment: `HETZNER_HOST`, `HETZNER_USER`, `HETZNER_SSH_KEY`,
  `HETZNER_HOST_FINGERPRINT` secrets and the `DEPLOY_DIRECTORY` variable.
- Database changes: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF_PROD`, and
  `SUPABASE_DB_PASSWORD_PROD` secrets.
- Functions: a verified project and `SUPABASE_ACCESS_TOKEN`; configure function
  secrets, including `INTERNAL_SERVICE_SECRET`, on that project beforehand.

The server must have the reviewed Compose configuration using `${ERYXON_IMAGE}`,
a configured `.env`, Docker Compose with `--wait`, and registry access. Deployment
pulls the built digest, persists it in `.release-image.env`, and waits for health.
Failure restores the previous app image when one exists. It does not remove other
services or prune the host. For later manual recovery, use a previously verified
digest with `scripts/deploy-image.sh`; never rebuild a tag as a rollback.

Back up the target before migrations and run `scripts/audit-tenant-references.sql`.
The 0.10 migrations enforce tenant references and add verified employee attribution;
review invalid existing records before rollout. Apply migrations, then matching
Edge Functions, then the frontend. A frontend rollback does not undo a migration.
Production health confirms HTTP readiness, not every authenticated workflow.

## Hosted rollout (Supabase + Vercel)

The hosted frontend runs on Vercel. Git previews remain enabled; automatic deployment
of `main` is disabled in `vercel.json`, so merging cannot publish a frontend ahead of
its required schema. After the release is published, roll out from the repository:

```sh
npx supabase login            # once
npx supabase link --project-ref <ref>   # once; stored in supabase/.temp (ignored)
npx vercel login              # once
npm run deploy:hosted
```

`deploy:hosted` always runs from the repository root and applies, in order, pending
migrations, all Edge Functions, and a Vercel production deployment. It prints the
Supabase and Vercel targets first. Never run `vercel` from a parent directory: the
CLI links and uploads whatever directory it is started in.

The separate Cloudflare Pages workflow is manual, runs CI, and fails if required
credentials are missing. It publishes the frontend only; coordinate its backend
migration requirements using the same runbook.

## GitHub configuration limits

Actions use read-only default permissions and narrowly scoped write permissions.
Dependabot alerts, security fixes, and grouped version updates are enabled.
On the current user-account plan, the private-repository rulesets API returns
HTTP 403 requiring GitHub Pro. Branch protection and required reviews are therefore
not server-enforced. Do not describe manual review conventions as enforced rules.

Package visibility is independent of repository visibility. The existing
`ghcr.io/sheetmetalconnect/eryxon-flow:latest` package is publicly pullable; the
source visibility change does not revoke previously distributed images.
