## Summary
<!-- 1-3 bullet points -->

## Release Path
<!-- Mark the intended production path for this change. -->
- [ ] Next biweekly train
- [ ] Critical hotfix exception

Planned train date (`YYYY-MM-DD`) or hotfix issue:
<!-- If this is a hotfix, include the sanitized incident/approval reference. -->

## Changes
<!-- What was modified and why -->

## Checklist
- [ ] Change was prepared on a non-`main` branch; no direct push to `main` was used
- [ ] `npm run build` passes
- [ ] `npm run test:run` passes
- [ ] New tables have RLS policies
- [ ] New UI text uses i18n keys (EN + NL + DE)
- [ ] Edge functions have `deno.json` with import map
- [ ] Column names verified against actual DB schema
- [ ] No customer-identifying, credential, or commercial details were added to repo, PR, commit, or synced ticket surfaces
