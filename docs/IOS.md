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

## Troubleshooting

- **WebView shows a blank screen on cold start** — the splash screen is
  hiding before the JS bundle paints. Bump
  `plugins.SplashScreen.launchShowDuration` in `capacitor.config.ts`.
- **Camera scanner does nothing** — the most common cause is a missing
  `NSCameraUsageDescription`. Re-run `scripts/ios-init.sh`.
- **Layout drifts under the home indicator** — a parent of the screen is
  setting `min-height: 100vh`. Use `100dvh` or apply `safe-pb`.
