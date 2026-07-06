# Deploy & Test — PWA

End-to-end guide for shipping Eryxon Flow as an installable Progressive Web
App. The React 18 bundle installs straight from the browser on desktop and
mobile — no app store, no native runtime.

> **Eryxon Flow is primarily a self-hosted product.** Most shops run their
> own Supabase + their own host on the LAN, and operators install the PWA
> directly from that host — no store distribution needed.

> **Common prerequisites:** Node.js 20+, a Supabase project (hosted or
> self-hosted via `supabase start`), and a clean clone of this repo.
> The [Self-hosting guide](https://eryxon.eu/guides/self-hosting/) on the website
> covers the Supabase stack and deployment.

---

## 1. PWA (web + desktop install)

### Local development

```bash
npm install
npm run dev                 # http://localhost:8080, HMR on
```

The dev server keeps the meta-CSP localhost origins in place, the SW is
disabled (`devOptions.enabled: false`), and `vite-plugin-pwa` skips its
manifest generation so the static one ships unchanged.

### Production build (every CI / preview)

```bash
npm run build               # emits dist/, includes sw.js + workbox-*.js
npm run preview             # serves dist/ on http://localhost:4173 to test
```

`vite-plugin-pwa` runs in `prompt` mode: a Sonner toast appears after a new
deploy and only reloads the WebView when the operator taps "Reload". No
mid-shift forced reloads.

### Hosted deploys (already wired)

| Target | Trigger | Config |
|---|---|---|
| **Vercel** | Push to any branch → preview; merge to `main` → production | `vercel.json` (CSP headers, SPA rewrites) |
| **Cloudflare Workers** | Push to any branch → preview; `main` → production | `.github/workflows/deploy-cloudflare.yml`, `wrangler.toml` |
| **Self-host (Docker)** | `docker compose up -d` against `Dockerfile` | `Caddyfile` / `nginx.conf` + `nginx-security-headers.conf` snippet |

PR previews come from both Vercel and Cloudflare. Both run the full
`npm run lint && npx tsc --noEmit && npm run test:run && npm run build`
chain through `.github/workflows/deploy-cloudflare.yml`.

### Installing the PWA (testing the install flow)

| Platform | How to install | Where the app appears |
|---|---|---|
| **macOS Safari 17+** | File → "Add to Dock" while on `app.eryxon.eu` | Launchpad, Dock, ⌘+Tab switcher |
| **macOS Chrome / Edge** | Install icon in the URL bar | Launchpad, Dock |
| **Windows 11** | Edge → "Install Eryxon Flow" in URL bar | Start menu, taskbar |
| **iOS Safari** | Share → "Add to Home Screen" | Home screen, Spotlight |
| **iPadOS** | Share → "Add to Home Screen" or "Add to Dock" | Home screen, Stage Manager |
| **Android Chrome** | "Install app" prompt or kebab menu → "Install app" | Launcher drawer |

The home-screen shortcut reads from `public/manifest.webmanifest`. Long-press
the installed icon to verify the **Work Queue / Scan Job / My Activity**
shortcuts render and route correctly.

### Test the PWA end-to-end

```bash
# 1. Build a production bundle and serve it locally.
npm run build
npm run preview &
PREVIEW_PID=$!

# 2. Install: Chrome → URL bar install icon → "Install".
#    Verify the title bar shows "Eryxon Flow" and not the browser chrome.

# 3. Service worker:
#    DevTools → Application → Service Workers → confirm sw.js is "activated"
#    DevTools → Application → Manifest → confirm icons + shortcuts render.

# 4. Offline:
#    DevTools → Network → "Offline" → reload. The app shell should still
#    render (workbox NetworkFirst on /env.js, CacheFirst on fonts).

# 5. Update prompt:
#    Bump version, rebuild, re-serve. The PwaUpdatePrompt toast should
#    appear; clicking "Reload" should activate the new SW without a
#    forced reload mid-session.

kill $PREVIEW_PID
```

Lighthouse PWA audit (Chrome DevTools → Lighthouse → "Progressive Web App")
should land at **100 / 100**: installable, manifest valid, SW registered,
HTTPS enforced.

### CI for the PWA

`.github/workflows/deploy-cloudflare.yml` runs on every PR:

```
Lint → Type check → Test (775 tests) → Build → Cloudflare preview
```

Vercel runs the same chain in parallel. PR cannot be merged if either
fails.

---

## 2. Cross-cutting test matrix

| Test | Where it runs | Trigger |
|---|---|---|
| **Vitest unit** | `npm run test:run` | Pre-commit, every PR (CI) |
| **TypeScript** | `npx tsc --noEmit` | Every PR (CI) |
| **ESLint** | `npm run lint` | Every PR (CI) |
| **Vite build** | `npm run build` | Every PR (Vercel + Cloudflare previews) |
| **API e2e** | `npm run test:api:e2e` | Manual; needs a Supabase project |
| **Lighthouse PWA** | DevTools → Lighthouse | Manual; recommended pre-release |
| **Service worker offline** | DevTools → Application → Network "Offline" | Manual |

### Pre-release checklist (every release)

- [ ] `npm run lint && npx tsc --noEmit && npm run test:run && npm run build` — all green
- [ ] `dist/manifest.webmanifest` matches `public/manifest.webmanifest` (vite-pwa is in `manifest: false` mode; no overwrite)
- [ ] `dist/icons/` contains all four PNGs the manifest references
- [ ] `dist/sw.js` is generated, registers via `PwaUpdatePrompt` (prompt mode, not auto-skip-waiting)
- [ ] PR preview on Vercel + Cloudflare both deploy green
- [ ] Smoke test the PWA install on at least one of: Chrome desktop, Safari iOS, Chrome Android
- [ ] CHANGELOG.md updated with the new version
- [ ] `package.json` version bumped
- [ ] Tag pushed (`git tag v0.5.x && git push --tags`) so `release.yml` can pick it up

### When something breaks

| Symptom | Where to look |
|---|---|
| PWA doesn't update on deploy | DevTools → Application → Service Workers → "Unregister"; bump version and rebuild |
| `?scan=1` shortcut doesn't fire scanner | Confirm `WorkQueue.tsx`'s search-params effect runs; the URL gets stripped after one tick |
| Camera scanner asks twice | Permission was previously denied — browser site settings → enable Camera |
| Self-host Supabase blocked by CSP | Confirm `VITE_SUPABASE_URL` is set at build time; `stripDevCspForProd` skips the strip for localhost URLs |
