# Eryxon Flow on iOS / iPadOS

The same React 18 bundle ships to three places:

| Surface              | Entry                                  | Build                |
|----------------------|----------------------------------------|----------------------|
| Desktop browser      | `/admin/*`, `/operator/*`              | `npm run build`      |
| iOS / iPadOS native  | wraps `/m/*` in a Capacitor WebView    | `npm run ios:build`  |
| Mobile-Safari PWA    | `/m/*` + `manifest.webmanifest`        | `npm run build`      |

The native shell is a thin Capacitor wrapper around the web build. There is no
duplicated UI code — the iOS app and the PWA share a single set of mobile
components under `src/components/mobile/` and `src/pages/mobile/`.

## What the iOS shell adds

- **Bottom tab bar (iPhone) / split view (iPad)** — `MobileShell` picks the
  right chrome at runtime via `useNative()`.
- **Pull-to-refresh** with rubber-band damping and a haptic at the threshold.
- **Swipe actions** on every queue row — Start / Stop / Issue without ever
  opening a modal.
- **ML Kit barcode scanner** on a dedicated `/m/scan` route. Falls back to a
  manual lookup when the bundle runs in mobile Safari.
- **Face ID / Touch ID** unlock for the operator switcher (shared shop-floor
  iPads keep their PIN as the system of record; biometric only proves device
  ownership).
- **Status bar / splash screen** in lockstep with the React theme.
- **Haptics** on every confirmed action — `useHaptics()` exposes
  `light/medium/heavy/success/warning/error`.
- **Safe-area aware** — `viewport-fit=cover` + `env(safe-area-inset-*)`
  utilities in `src/styles/mobile-ios.css`.

## Quick start (macOS)

You need Xcode 15+, CocoaPods, and Node 20+.

```bash
npm run ios:init   # installs deps, builds web, runs `cap add ios`
npm run ios:open   # opens ios/App/App.xcworkspace in Xcode
```

After Xcode is open:

1. Pick the **App** target → **Signing & Capabilities** → choose your team.
2. Update the bundle id if needed (default `eu.eryxon.flow`).
3. Connect an iPhone or iPad and click **Run**.

When you change web code, rebuild + sync the WebView bundle:

```bash
npm run ios:sync   # build + cap sync ios
```

`npm run ios:run` does the build, sync, and `cap run ios` in one go.

## Architecture

```
+----------------------------------------+
|  Capacitor WKWebView (iOS / iPadOS)    |
|  +----------------------------------+  |
|  |  React 18 + Vite bundle (dist/)  |  |
|  |  + /m/* mobile shell + screens   |  |
|  +----------------------------------+  |
|  Bridge (only inside the native app)   |
|  - Haptics, StatusBar, SplashScreen    |
|  - ML Kit Barcode Scanner              |
|  - Face ID / Touch ID                  |
|  - Push Notifications (APNs)           |
|  - Keyboard show/hide events           |
+----------------------------------------+
```

`src/lib/native/*` is the only code that imports Capacitor plugins. Every
helper checks `isNative()` first and returns a no-op (or a graceful web
fallback) when running outside the native shell, so feature code never has
to branch.

## File map

```
src/
  lib/native/             ← Capacitor wrappers (haptics, scanner, biometric…)
  hooks/useNative.ts      ← React snapshot of platform context
  hooks/useHaptics.ts     ← Stable haptic callback bag
  components/mobile/      ← Shell pieces (top bar, tab bar, swipe row, split)
  pages/mobile/           ← iOS-optimized operator pages
  routes/mobileRoutes.tsx ← `/m/*` route table
  styles/mobile-ios.css   ← Safe areas, momentum scroll, touch tuning

capacitor.config.ts       ← App id, plugins config, splash + status bar
public/manifest.webmanifest← PWA manifest (also used by Safari "Add to Home")
scripts/ios-init.sh       ← One-shot bootstrap for a fresh Mac
```

## Permissions / Info.plist

`scripts/ios-init.sh` patches the generated `ios/App/App/Info.plist` with the
three usage strings iOS requires:

| Key                              | Used for                                |
|----------------------------------|-----------------------------------------|
| `NSCameraUsageDescription`       | ML Kit barcode / QR scanning            |
| `NSFaceIDUsageDescription`       | Face ID operator unlock                 |
| `NSPhotoLibraryUsageDescription` | Attaching photos to issue reports       |

If you regenerate the iOS project, re-run `scripts/ios-init.sh` to re-patch.

## Push notifications

Capacitor Push is wired up but APNs config lives in your Apple Developer
account. Steps:

1. Enable the **Push Notifications** capability in Xcode.
2. Create an APNs auth key and upload it to your Supabase project →
   *Edge Functions secrets* (or your push backend of choice).
3. Use the existing webhook dispatcher (`src/lib/event-dispatch.ts`) to fan
   out lifecycle events to APNs — there's already an `issue.created` event,
   so subscribing the manager's iPhone is purely a backend change.

## TestFlight / App Store

The default bundle id `eu.eryxon.flow` is reserved for the hosted operator at
`app.eryxon.eu`. Change it in `capacitor.config.ts` (`appId`) **and** in the
Xcode target's *General → Identity → Bundle Identifier* before submitting
your own build.

Recommended export options:
- **Archive** in Xcode (`Product → Archive`).
- Distribute via **App Store Connect** → TestFlight for internal QA.
- Run on iPad Pro M-series and iPhone 15+ — those are the devices the UX is
  tuned for. (Older devices still work, just without 120Hz ProMotion.)

## Compatibility (across all three apps)

| Concern               | iOS native             | Android native          | PWA / Mobile Safari        |
|-----------------------|------------------------|--------------------------|----------------------------|
| **Min OS**            | iOS / iPadOS 13+       | Android 7.0 (API 24)+    | Safari 17+, Chrome 88+     |
| **Auth**              | Supabase email + magic link, PIN keypad, Face ID / Touch ID re-unlock | Supabase email + magic link, PIN keypad, fingerprint re-unlock | Same Supabase flow, biometric re-unlock not available |
| **Hosted backend**    | Default `app.eryxon.eu` via runtime `env.js` | Same | Same |
| **Self-hosted backend** | Build with `VITE_SUPABASE_URL=http://your-host` and either bundle that into the IPA or set `CAPACITOR_SERVER_URL=https://your-host` for live-reload | Same, plus Android `network_security_config` whitelists `*.local` and `localhost` for LAN setups | Build with `VITE_SUPABASE_URL=http://127.0.0.1:54321`; the meta-CSP localhost strip is auto-skipped when the URL is local (see `vite.config.ts:stripDevCspForProd`) |
| **Language switching** | `LanguageSwitcher` on `/m/login`; switch persists in localStorage and applies app-wide via i18next | Same | Same |
| **Viewports**         | `viewport-fit=cover` + `100dvh`, safe-area utilities for notch / home indicator. iPad split-view collapses below 768px. | Same plus sw600dp / sw720dp tablet breakpoints. | Same. |
| **Devices**           | iPhone SE (3rd gen) → 16 Pro Max. iPad mini, Air, Pro M-series. iPadOS 13+ stage-manager / split-view honored. | Pixel 6+, Galaxy S20+, Pixel Tablet, Galaxy Tab S7+, Lenovo Tab P12, foldables. | Anything modern with Safari 17+, Chrome / Edge / Firefox. |

### Login flow (every surface)

1. Operator opens the app / tab.
2. If no Supabase session → redirect to `/auth` (web) or the Auth screen inside the WebView (native).
3. If signed in but no PIN session → `/m/login` (touch shells) or `/operator/login` (desktop terminal).
4. Operator enters badge + 6-digit PIN, optionally Face ID / Touch ID after the first PIN of the day.
5. Lands on `/m/queue` (mobile) or `/operator/work-queue` (desktop). Mobile shell preserves the session even if the WebView reloads.

### Drawing / 3D inspection on mobile

The mobile operation detail page lazy-loads the same PDF viewer **and** the
STEP viewer the desktop terminal uses, but both chunks are split:

- **PDF preview** (~127 KB gzipped) loads on first tap, opens in an in-app modal.
- **STEP / 3D preview** (~520 KB gzipped Three.js + occt-import) loads on first tap of a `.step` / `.stp` file. Pre-fetched as a Blob to dodge signed-URL CORS in the loader.

iPad Pro M-series and modern Android tablets render the STEP viewer fluidly;
on a phone-class device the same dialog still works but the user is paying
the bandwidth bill — that's a deliberate trade so a fitter on the floor never
has to walk to the desktop terminal for a 3D check.

## Remaining iOS-only gaps you'll wire up before TestFlight

These can't be done from the web bundle — they live in Xcode / Apple Developer:

1. **APNs key + push subscription** — Capacitor Push is configured (`presentationOptions: ['badge','sound','alert']`) but you still need to upload an APNs auth key to Supabase Edge Function secrets and wire `PushNotifications.register()` into the auth context. See [Capacitor Push docs](https://capacitorjs.com/docs/apis/push-notifications).
2. **Universal Links / Associated Domains** — for `eryxon://job/...` deep links to also work as `https://app.eryxon.eu/job/...`. Add the `applinks:app.eryxon.eu` entitlement and serve `/.well-known/apple-app-site-association` from the host.
3. **Splash screen assets** — Xcode generates a launch storyboard; replace the placeholder logo at `ios/App/App/Assets.xcassets/Splash.imageset/`.
4. **App icon set** — replace `ios/App/App/Assets.xcassets/AppIcon.appiconset/` with the brand mark (1024x1024 master + auto-generated sizes).
5. **Localizations in Info.plist** — `CFBundleLocalizations = [en, nl, de]` and `CFBundleDevelopmentRegion = en` so the App Store listing appears in Dutch / German.

## Troubleshooting

- **WebView shows a blank screen on cold start** — the splash screen is
  hiding before the JS bundle paints. Bump
  `plugins.SplashScreen.launchShowDuration` in `capacitor.config.ts`.
- **Camera scanner does nothing** — the most common cause is a missing
  `NSCameraUsageDescription`. Re-run `scripts/ios-init.sh`.
- **Layout drifts under the home indicator** — a parent of the screen is
  setting `min-height: 100vh`. Use `100dvh` or apply `safe-pb`.
