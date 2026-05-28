# ERY-282 eryxon.eu Verification (2026-05-27 UTC)

## Scope correction applied
Per Hermes/board correction, production target is `https://eryxon.eu` (public site) and `https://app.eryxon.eu` (hosted app). `.com` is ignored for this issue.

## Repo correction made
- Updated canonical site URL in `website/src/config/config.json` to `https://eryxon.eu`.

## Local build proof
- Command: `cd website && npm run build`
- Result: success.
- Build includes key routes: `/`, `/blog/`, `/introduction/`, `/guides/changelog/`, `/managed-rollout/`.

## Live production checks on eryxon.eu

### Landing + core paths
- `https://eryxon.eu/` → `200` (Cloudflare)
- `https://eryxon.eu/blog/` → `200` (Cloudflare)
- `https://eryxon.eu/introduction/` → `200`
- `https://eryxon.eu/guides/changelog/` → `200`
- `https://eryxon.eu/managed-rollout/` → `200`

### Newly published/requested blog article paths
Checked:
- `/blog/latest-development-and-road-to-v0-7/`
- `/blog/how-eryxon-flow-supports-qrm-in-high-mix-low-volume-shops/`
- `/blog/work-orders-from-erp-to-shop-floor-and-back/`
- `/blog/how-eryxon-flow-turns-qrm-and-polca-into-daily-shop-floor-decisions/`

Result:
- all return `404` on live `eryxon.eu`.

### Meta + OG/social verification
- Landing (`/`) currently has `meta description`.
- Blog listing (`/blog/`) currently has `meta description`.
- `og:image` / `twitter:image` are not present in sampled live HTML for landing/blog/docs pages.

## Publish attempt (target/path)
- Target from repo: Cloudflare Workers (`website/wrangler.toml`)
- Artifact: `website/dist`
- Deploy command: `cd website && npx wrangler deploy`
- Result: blocked in non-interactive runtime; missing `CLOUDFLARE_API_TOKEN`.

## Blocker
- Cannot publish updates to `eryxon.eu` from this runtime without Cloudflare API token.

## Unblock owner/action
- Owner: CTO
- Action: provide deploy token access or run deployment in an approved credentialed environment, then re-wake ERY-282 for post-deploy verification.
