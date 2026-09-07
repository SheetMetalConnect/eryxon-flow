# Deploy and test

Eryxon Flow uses one responsive web interface for phones, tablets, and desktops.
PWA installation and offline shell caching are optional. Use Node 22 for local
builds; [RELEASING.md](../RELEASING.md) is the source of truth for required checks,
versioning, PR review, publication, production rollout, and recovery.

## Local development

Copy `.env.example` to `.env` and configure the intended Supabase backend. Install
locked dependencies with `npm ci`, then run `npm run dev`. The development server
runs on port 8080 and does not register a service worker.

Use `npm run typecheck` to check all referenced TypeScript projects. `npm run build`
produces the frontend bundle; it does not replace typechecking or tests. Build and
preview locally with `npm run build` followed by `npm run preview`.

## Optional PWA

The default build omits the install manifest link and does not generate or register
an app service worker. To enable PWA support:

```sh
VITE_ENABLE_PWA=true npm run build
npm run preview
```

For a custom Docker image, pass `--build-arg VITE_ENABLE_PWA=true` to `docker build`.
This is a build option, not runtime configuration: changing `.env` on an existing
container cannot add or remove service-worker support. Rebuild and deploy the image
when changing this option.

For an enabled build, verify the following over HTTPS or localhost:

- The manifest loads and `sw.js` registers. The install action is available in a
  supported browser.
- Work Queue, Scan Job, and My Activity shortcuts reach the shared operator routes.
  Previously installed `/m` links still redirect correctly.
- Reloading offline renders the cached app shell. Database reads and production
  actions still require a backend connection; there is no offline write queue.
- A newer build offers Reload and Later. Only Reload activates the waiting worker.

When a disabled build loads, it unregisters only this app's `sw.js`, leaving other
registrations and caches intact. Existing controlled tabs complete their current
lifecycle before the change takes effect on subsequent navigation or reload.

## Deployment verification

A merge does not deploy production. Publish a reviewed version through the manual
Release workflow; deploy only after its matching database migrations and Edge
Functions are ready. Use the image digest recorded in that release. See
[RELEASING.md](../RELEASING.md) for configuration and rollback details rather than
rebuilding an old tag or deploying the legacy `latest` image.

Check sign-in, PIN operator switching, queue selection, scan input, operation detail,
time tracking, issue reporting, and activity at phone, tablet, and desktop widths.
The container's `http://127.0.0.1/health` check confirms HTTP readiness, not these
authenticated workflows. For a schema change, also replay and test migrations on a
disposable local database before targeting a deployment.
