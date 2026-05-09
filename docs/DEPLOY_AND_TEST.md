# Deploy & Test — iOS, Android, PWA

End-to-end guide for shipping each of the three Eryxon Flow surfaces. The
same React 18 bundle ships everywhere; this doc covers what's different
about getting each surface into testers' hands and onto production stores.

> **Prerequisites that are common to all three:** Node.js 20+, a Supabase
> project (hosted or self-hosted), and a clean clone of this repo. See
> [`SELF_HOSTING.md`](SELF_HOSTING.md) for the local Supabase stack.

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

## 2. iOS / iPadOS native app

### Prerequisites

- macOS (Sonoma or newer)
- Xcode 15+ (App Store)
- CocoaPods 1.15+ (`brew install cocoapods` or `gem install cocoapods`)
- Apple Developer account ($99 / yr) for device provisioning + TestFlight + App Store
- A Supabase project (the iOS app talks to the same backend as the PWA)

### One-time bootstrap

```bash
npm run ios:init            # installs deps, builds web, runs `npx cap add ios`
                            # patches Info.plist with Camera / Face ID / Photos
                            # usage strings via PlistBuddy
npm run ios:open            # opens ios/App/App.xcworkspace in Xcode
```

In Xcode, set the signing team:
1. Select the **App** target in the project navigator.
2. *Signing & Capabilities* → check "Automatically manage signing".
3. Pick your team. Bundle id defaults to `eu.eryxon.flow`; change it to your
   own reverse-DNS for your own builds (you cannot ship the eu.eryxon.flow
   bundle without owning the domain).

### Local development cycle

```bash
# Web changes only (no native code touched):
npm run ios:sync            # build + cap sync ios
                            # → re-run from Xcode (Cmd+R)

# Live reload against a remote dev server (most efficient inner loop):
CAPACITOR_SERVER_URL=https://your-dev-host.example.com \
  npm run ios:run           # builds, syncs, runs on the connected device
                            # / simulator with HMR pointed at the URL
```

`CAPACITOR_SERVER_URL` is read at build time by `capacitor.config.ts`. The
WebView loads from the URL instead of the bundled `dist/`, and HMR works
through the simulator / device.

### Test on simulator

```bash
# From inside Xcode: select an iPhone / iPad simulator → Cmd+R.
# Or from CLI:
npx cap run ios --target "iPhone 16 Pro"
npx cap run ios --target "iPad Pro 13-inch (M4)"
```

Recommended simulators to validate:

| Device | What it covers |
|---|---|
| **iPhone SE (3rd gen)** | Smallest supported screen, no notch, lower-power chip |
| **iPhone 15 / 16 Pro** | Dynamic Island, ProMotion, Action Button, Face ID |
| **iPad mini (6th gen)** | Compact tablet — bottom-tab shell stays single-column |
| **iPad Pro 13" (M4)** | iPadOS split-view + stage manager + 120 Hz ProMotion |

### Test on a physical device (the only way to catch real-world issues)

1. Plug in iPhone / iPad via USB-C.
2. Trust the Mac on the device.
3. Xcode → Run destination dropdown → select your device.
4. First run: iOS will prompt to trust the developer certificate
   (Settings → General → VPN & Device Management).

### What to actually exercise on device

| Flow | What you're verifying |
|---|---|
| **Cold launch** | Splash hides cleanly, web bundle paints under 1 s on iPhone 15+ |
| **Sign-in** | Email + magic link Supabase flow round-trips through the WebView; cookies persist |
| **PIN keypad** | `/m/login` accepts badge + PIN, errors are translated |
| **Face ID / Touch ID** | After the first PIN of the day, biometric unlock prompt appears with the iOS sheet |
| **Scanner** | `/m/scan` opens ML Kit camera UI on first tap; permission prompt shows the configured `NSCameraUsageDescription` string |
| **Pull-to-refresh** | Drag the work queue down, haptic fires at the threshold, the spinner rotates, list refreshes |
| **Swipe actions** | Swipe a row left → Issue, swipe right → Start; full-swipe past threshold fires the action immediately |
| **Operation timer** | Start / stop / complete each haptics correctly and persist across sign-out |
| **Offline banner** | Toggle airplane mode mid-shift, banner appears, list still scrolls (queries serve from React Query cache) |
| **PDF preview** | Tap a `.pdf` row → PDFViewer opens in a 92-vh modal |
| **STEP preview** | Tap a `.step` row → 3D viewer loads (~520 KB chunk), rotates fluidly on iPad Pro |
| **Push registration** | First sign-in pops the iOS push permission sheet (simulator can't deliver pushes; physical device required) |
| **Status bar** | Light/dark theme toggle flips the iOS status bar in lockstep |
| **Hardware back equivalent** | Swipe-from-left dismisses modals before popping routes |

### Internal distribution — TestFlight

```bash
# Bump CFBundleShortVersionString and CFBundleVersion in Xcode first.
# Then:
#   Xcode → Product → Archive
#   Organizer → "Distribute App" → "App Store Connect" → "Upload"
```

After ~10 minutes (Apple processing) the build appears in App Store Connect →
TestFlight. Internal testers are added by Apple ID; external testers go
through a 24-hour beta-review pass.

### Production release

1. App Store Connect → My Apps → Eryxon Flow → "+ Version".
2. Pick the TestFlight build that's been internally tested.
3. Fill the screenshots + description in **English, Dutch, German**
   (`CFBundleLocalizations` should declare all three).
4. Submit for review. Typically 24–48 hours.

### Remaining iOS-only gaps before App Store

These can't be done from the web bundle — they live in Xcode / Apple Developer.
See [`IOS.md`](IOS.md#remaining-ios-only-gaps-youll-wire-up-before-testflight).

---

## 3. Android native app

### Prerequisites

- Android Studio Hedgehog (2023.1.1) or newer
- Android SDK 34 with build-tools 34.0.0
- Java 17 (`brew install openjdk@17` on macOS, `apt-get install openjdk-17-jdk` on Linux)
- Optional: a Google Play Console account ($25 one-time) for Play Store distribution
- Optional: Firebase project with `google-services.json` in `android/app/` for FCM push

### One-time bootstrap

```bash
npm install
npm run build
npx cap add android         # generates android/ on first run
npm run android:open        # opens android/ in Android Studio
```

Studio will prompt to install Gradle and any missing SDK platforms.

### Local development cycle

```bash
# Web changes only:
npm run android:sync        # build + cap sync android
                            # → "Run" in Studio or `npm run android:run`

# Live reload against a remote dev server:
CAPACITOR_SERVER_URL=https://your-dev-host.example.com \
  npm run android:livereload
```

### Test on emulator

```bash
# Studio → Device Manager → create or boot a device:
npx cap run android --target "Pixel_8_API_34"
npx cap run android --target "Pixel_Tablet_API_34"
```

Recommended emulators to validate:

| Device | What it covers |
|---|---|
| **Pixel 6** | Stock Android, mid-range chip, 6.4" 1080p |
| **Pixel 8 Pro** | Edge-to-edge display, 120 Hz, Material You themed icons |
| **Pixel Tablet** | sw600dp landscape, dock posture |
| **Galaxy Tab S9** | Samsung One UI, S Pen events |
| **Z Fold 5** | Foldable hinge events, freeform mode |

### Test on a physical device

1. Enable **Developer options** (Settings → About phone → tap "Build number" 7×).
2. Toggle **USB debugging** on.
3. Plug in via USB-C, accept the RSA fingerprint prompt.
4. `npm run android:run` or Studio "Run" → pick your device.

### What to actually exercise on device (in addition to the iOS flows)

| Flow | What you're verifying |
|---|---|
| **Hardware back** | Open `OperationDetailModal`, press back → modal closes (Escape dispatched), second press → pop route, third press at root → app minimises (does not exit) |
| **System back gesture** | Edge-swipe back equivalent to hardware back |
| **Material You themed icon** | Toggle "Themed icons" in Pixel launcher → adaptive icon recolors |
| **Split-screen** | Drag from recents → app continues to render in narrow shell |
| **Network security** | `network_security_config.xml` permits `localhost` / `*.local` for self-host LAN setups but blocks arbitrary cleartext |
| **FCM push** | Drop `google-services.json` into `android/app/`, sign in, send a test push from Firebase Console — payload should appear in the system tray |

### Internal distribution

```bash
npm run android:bundle:release    # generates app-release.aab
                                  # signs with the keystore named in
                                  # android/app/build.gradle
```

Upload the AAB to **Play Console → Internal testing → Create new release**.
Internal testers (via mailing list) get the build within ~10 minutes.
Open testing / production releases require a Play review (typically a few
hours, can be a few days for first submission).

### Production release

1. Play Console → Production → Create new release.
2. Promote the internal AAB up the tracks: Internal → Closed → Open → Production.
3. Pick a rollout percentage (10 % is the conservative default).
4. Localized listings (EN / NL / DE) with screenshots from the Pixel Tablet
   and a Pixel phone.

### Diagnostics

```bash
adb logcat | grep -i capacitor                # native plugin errors
adb logcat *:S Capacitor:V Capacitor/Plugin:V # quieter filter
```

Chrome → `chrome://inspect/#devices` to remote-debug the WebView (debug
builds only — `webContentsDebuggingEnabled` is gated on `NODE_ENV`).

---

## 4. Cross-cutting test matrix

| Test | Where it runs | Trigger |
|---|---|---|
| **Vitest unit** | `npm run test:run` | Pre-commit, every PR (CI) |
| **TypeScript** | `npx tsc --noEmit` | Every PR (CI) |
| **ESLint** | `npm run lint` | Every PR (CI) |
| **Vite build** | `npm run build` | Every PR (Vercel + Cloudflare previews) |
| **API e2e** | `npm run test:api:e2e` | Manual; needs a Supabase project |
| **Capacitor sync** | `npm run ios:sync` / `android:sync` | Manual; copies `dist/` into native projects |
| **iOS device** | Xcode "Run" or `npx cap run ios` | Manual; requires macOS + Xcode |
| **Android device** | `npx cap run android` | Manual; requires SDK + emulator/device |
| **Lighthouse PWA** | DevTools → Lighthouse | Manual; recommended pre-release |
| **Service worker offline** | DevTools → Application → Network "Offline" | Manual |

### Pre-release checklist (every release, every surface)

- [ ] `npm run lint && npx tsc --noEmit && npm run test:run && npm run build` — all green
- [ ] `dist/manifest.webmanifest` matches `public/manifest.webmanifest` (vite-pwa is in `manifest: false` mode; no overwrite)
- [ ] `dist/icons/` contains all four PNGs the manifest references
- [ ] `dist/sw.js` is generated, registers via `PwaUpdatePrompt` (prompt mode, not auto-skip-waiting)
- [ ] PR preview on Vercel + Cloudflare both deploy green
- [ ] Smoke test the PWA install on at least one of: Chrome desktop, Safari iOS, Chrome Android
- [ ] Smoke test the iOS app on physical iPhone + iPad (TestFlight)
- [ ] Smoke test the Android app on physical phone + tablet (Play internal track)
- [ ] CHANGELOG.md updated with the new version
- [ ] `package.json` version bumped (and `CFBundleShortVersionString` / `versionName` for native releases)
- [ ] Tag pushed (`git tag v0.5.x && git push --tags`) so `release.yml` can pick it up

### When something breaks

| Symptom | Where to look |
|---|---|
| WebView blank on iOS / Android | `adb logcat` (Android) or Xcode console (iOS) for JS errors; check `dist/` was synced |
| PWA doesn't update on deploy | DevTools → Application → Service Workers → "Unregister"; bump version and rebuild |
| `?scan=1` shortcut doesn't fire scanner | Confirm `WorkQueue.tsx`'s search-params effect runs; the URL gets stripped after one tick |
| Camera scanner asks twice | Permission was previously denied — Settings → Eryxon Flow → enable Camera |
| Push registration silently fails | iOS: APNs key missing in Apple Developer; Android: `google-services.json` missing in `android/app/` |
| Self-host Supabase blocked by CSP | Confirm `VITE_SUPABASE_URL` is set at build time; `stripDevCspForProd` skips the strip for localhost URLs |
| Hardware back kicks user out | Confirm `<MobileShell>` is mounted (it calls `useHardwareBack`); on the desktop SPA this is intentional — back goes to history |
