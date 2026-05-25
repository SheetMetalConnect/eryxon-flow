# Eryxon Flow — Android App

The Android client is the same React app, packaged as a native APK / AAB via
[Capacitor 7](https://capacitorjs.com/). It targets phones and tablets, with
shop floor operator UX as the primary target (Pixel Tablet, Galaxy Tab S9,
Lenovo Tab P12, Surface-class detachables).

## Why Capacitor

- **One codebase.** The web SPA is the source of truth — no parallel React
  Native or Kotlin tree.
- **Native APIs we actually need.** Barcode/QR scanning, biometric auth,
  haptics, push notifications, camera, network status, hardware back button.
- **Tablet-friendly.** AndroidX, edge-to-edge, adaptive icons, Material
  splash, multi-window / DeX-ready out of the box.
- **Predictable builds.** Standard Gradle pipeline, integrates with Play
  Console, Firebase App Distribution, MDM (Intune, Workspace ONE, Knox).

## Prerequisites

| Tool | Version |
|------|---------|
| Node | 20+     |
| JDK  | 17 (Temurin recommended) |
| Android Studio | Iguana or later |
| Android SDK | API 35 (compileSdk), build-tools 35.0.0 |
| Gradle | 8.7 (wrapper checked in) |

`ANDROID_HOME` and `JAVA_HOME` must be set; on macOS install via `brew install
--cask android-studio temurin@17`.

## Workflows

```bash
# Open Android Studio with the project — for IDE-driven debugging.
npm run android:open

# One-shot install on a connected Pixel/Samsung device or emulator.
npm run android:run

# Live-reload from a workstation while iterating UI on a real tablet.
# The tablet hits the workstation's IP via Capacitor's dev server proxy.
CAPACITOR_SERVER_URL=http://192.168.1.42:8080 npm run android:livereload

# Produce a debug APK in android/app/build/outputs/apk/debug/.
npm run android:assemble:debug

# Produce a release APK (R8 shrunk, signed if signingConfig wired up).
npm run android:assemble:release

# Produce a release AAB for the Play Store.
npm run android:bundle:release
```

`android:sync` runs `vite build` then `cap sync android`, which copies
`dist/` into `android/app/src/main/assets/public/` and refreshes plugin
manifests. Run it after pulling changes from teammates.

## Native plugins shipped

| Plugin | Where it's used |
|--------|-----------------|
| `@capacitor/app` | Hardware back button, deep links, app lifecycle. |
| `@capacitor/status-bar` | Edge-to-edge dark status bar tint. |
| `@capacitor/splash-screen` | Branded launch (API 31+ SplashScreen + legacy fallback). |
| `@capacitor/keyboard` | `adjustResize` behaviour, accessory bar off. |
| `@capacitor/network` | Offline banner + write-blocking on the operator views. |
| `@capacitor/haptics` | Tactile confirm/error on shop floor actions. |
| `@capacitor/preferences` | Encrypted key/value (operator session, theme). |
| `@capacitor/device` | Diagnostics for support escalations. |
| `@capacitor/browser` | In-app TLS browser for OAuth / docs. |
| `@capacitor/share` | Share PDF travelers / NCR exports. |
| `@capacitor/filesystem` | Cache STEP/PDF assets under app sandbox. |
| `@capacitor/local-notifications` | Local reminders for breaks / handoffs. |
| `@capacitor/push-notifications` | FCM push for assignment / NCR alerts (requires `google-services.json`). |
| `@capacitor/camera` | Direct camera capture for issue / NCR photos. |
| `@capacitor/clipboard` | Copy job IDs / API keys. |
| `@capacitor-mlkit/barcode-scanning` | Job/part/batch scanning via the `ScanFab`. |
| `@capgo/capacitor-native-biometric` | Re-auth on sensitive operator actions. |

## Native-aware code paths

All native surface area is behind `src/native/` so components stay portable:

- `isNativeApp()` / `isAndroidNative()` — branch on platform.
- `useNetworkStatus()` — drives the persistent `OfflineBanner`.
- `haptics.success()` / `haptics.error()` — confirms in `ScanDialog` and
  operator submissions.
- `scanOnce()` — opens ML Kit on Android, falls back to `BarcodeDetector`
  in the browser.
- `capturePhoto()` — Capacitor Camera plugin → base64 JPEG; web fallback
  uses `<input capture="environment">` and downscales via canvas.
- `verifyBiometric()` — fingerprint / face for operator confirmation.

Components must import from `@/native`, never from `@capacitor/*` directly.

## Tablet & foldable optimisations

- `AndroidManifest.xml` declares `resizeableActivity="true"`,
  `windowSoftInputMode="adjustResize"`, and supports orientation/keyboard
  config changes without restart.
- `mobile.css` defines safe-area utilities (`.safe-area-top` etc) and bumps
  touch targets to ≥44 px on `body.app-mobile`.
- `useTabletLayout()` returns `isTablet` / `isLargeTablet` / `isLandscape`
  for split-pane decisions in feature components.
- Resource buckets `values-sw600dp/`, `values-sw720dp-land/` exist for any
  future tablet-only string overrides.
- App-bundle splits enabled (`bundle { language; density; abi }`) so the
  Play Store ships per-device APKs ~30% smaller.

## Self-hosted server URL

By default the WebView loads bundled assets from `https://localhost`.
To point the app at a remote backend (Eryxon Cloud, customer prod, or a
live-reload dev server) set `CAPACITOR_SERVER_URL` *before* running
`npx cap sync android` or any `android:*` script:

```bash
export CAPACITOR_SERVER_URL=https://app.eryxon.eu
npm run android:assemble:release
```

The capacitor config switches the WebView into hosted mode and toggles
cleartext only when the URL is plain HTTP.

### Cleartext / LAN policy (network security config)

`android/app/src/main/res/xml/network_security_config.xml` follows a
least-privilege strategy (ERY-71). Android's network-security-config cannot
CIDR-match, so we do **not** ship a hand-written list of sample RFC1918 IPs —
that only ever covered a few shops and widened the cleartext surface for no
real gain.

| Build | Cleartext allowed? |
|-------|--------------------|
| `assembleRelease` / `bundleRelease` | **No.** HTTPS only. System + user CAs trusted. |
| `assembleDebug` / `android:livereload` | Yes, via `debug-overrides` — covers loopback, emulator bridge (`10.0.2.2`), and the workstation/LAN host used for live-reload, without enumerating them. Never ships in a release build. |

**Self-hosting over plain HTTP on a real LAN** is supported per-host:

1. **Recommended:** front the on-prem backend with TLS (reverse proxy + a cert,
   or an internal CA installed on the tablet — `<certificates src="user" />` is
   already trusted). No cleartext exception needed.
2. **Plain HTTP, custom build:** uncomment the `SELF-HOST CLEARTEXT` template
   block in `network_security_config.xml`, add your actual backend host
   (hostname or fixed IP), and build a custom release APK/AAB. Only that one
   host is exempted. Do not commit a real customer host upstream.

### Offline barcode scanning

`app/build.gradle` sets the `mlkitBarcodeDependencies` manifest placeholder,
which is consumed by the `com.google.mlkit.vision.DEPENDENCIES` meta-data in
`AndroidManifest.xml`. This tells Google Play to fetch the ML Kit barcode model
at **install** time instead of on first scan — so a freshly provisioned tablet
does not stall on its first scan on a closed shop-floor network.

Caveat: install-time delivery still needs **Google Play services present at
provisioning**. Fully air-gapped or GMS-less rugged tablets (Zebra, some
Honeywell/Datalogic units) will not receive the model this way. For those
fleets, build with the **bundled** ML Kit model — add
`implementation 'com.google.mlkit:barcode-scanning:17.3.0'` to
`app/build.gradle` so the ~2.4 MB model ships inside the APK and no Play
download is ever required. This bundled variant is the supported path for
air-gapped fleets but increases APK size and must be validated against the
`@capacitor-mlkit/barcode-scanning` plugin on a device build before shipping.

## Signing for release

Capacitor ships an unsigned release variant. Wire up signing in
`android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file(System.getenv("ERYXON_KEYSTORE") ?: "release.keystore")
            storePassword System.getenv("ERYXON_KEYSTORE_PW")
            keyAlias System.getenv("ERYXON_KEY_ALIAS")
            keyPassword System.getenv("ERYXON_KEY_PW")
        }
    }
    buildTypes {
        release { signingConfig signingConfigs.release }
    }
}
```

Keystores must NEVER be checked in. Use Play App Signing for the production
upload key.

## Push notifications

Push requires a Firebase project — drop `google-services.json` into
`android/app/`. The build script auto-detects it and applies the
`google-services` plugin. Without it, push silently no-ops.

## Compatibility (mirrored across all three apps)

| Concern | Android native | iOS / iPadOS native | PWA / Web |
|---|---|---|---|
| **Min OS** | Android 7.0 (API 24) — Capacitor 7's floor | iOS / iPadOS 13+ | Chrome 88+, Safari 17+, Edge / Firefox modern |
| **Auth** | Supabase email + magic link → PIN keypad → optional fingerprint re-unlock | Same, Face ID / Touch ID | Same, no biometric |
| **Hosted backend** | `app.eryxon.eu` via runtime `env.js` | Same | Same |
| **Self-hosted backend** | `CAPACITOR_SERVER_URL=http://shop-floor.local:8080` for live-reload (debug builds allow LAN cleartext via `debug-overrides`). Release builds are HTTPS-only; for plain-HTTP LAN hosts either front with TLS or add the host to `network_security_config.xml` for a custom build (see "Cleartext / LAN policy"). | Same `CAPACITOR_SERVER_URL` knob | `VITE_SUPABASE_URL=http://127.0.0.1:54321` works; the meta-CSP localhost strip is auto-skipped when the URL is local. |
| **Language switching** | `LanguageSwitcher` on `/m/login`, persists via i18next-browser-languagedetector. EN / NL / DE locale parity. | Same | Same |
| **Viewports** | `viewport-fit=cover`, `100dvh`, safe-area utilities, plus `sw600dp` / `sw720dp` tablet breakpoints in `mobile.css` | Same minus the sw breakpoints; iPad split-view collapses below 768 px | Same |
| **Devices** | Pixel 6+, Galaxy S20+, Pixel Tablet, Galaxy Tab S7+, Lenovo Tab P12, Z Fold / Flip foldables | iPhone SE (3rd gen) → 16 Pro Max, iPad mini / Air / Pro M-series | Anything modern |

### Login flow (every surface)

1. App launch / tab open.
2. No Supabase session → `/auth` (email + magic link).
3. Session but no PIN → `/m/login` (touch shells) or `/operator/login` (desktop terminal).
4. Operator types badge + 6-digit PIN; biometric unlock available after the first PIN of the day.
5. Lands on `/m/queue` (mobile) or `/operator/work-queue` (desktop).

### PDF + STEP CAD preview on mobile

`MobileOperationDetail` lazy-loads the same viewers the desktop terminal uses:
PDF (~127 KB gz) and STEP / Three.js (~520 KB gz). Tapping a `.pdf` or `.step`
row pre-fetches the file as a Blob (so the loader doesn't trip on signed-URL
CORS) and opens it in an in-app modal. iPad Pro M-series and Android tablets
(Pixel Tablet, Galaxy Tab S9+) handle 3D fluidly. blob: URLs are revoked on
close so cheap tablets don't accumulate GPU memory across captures.

### PWA install — manifest of record

The hand-curated `public/manifest.webmanifest` is the single source of truth
for PWA install metadata. `vite-plugin-pwa` is configured with
`manifest: false` so it doesn't overwrite it. The static manifest references
`/icons/icon-{192,512,maskable-192,maskable-512}.png` which ship from
`public/icons/`. Home-screen shortcuts:

- **Work Queue** → `/operator/work-queue`
- **Scan Job** → `/operator/work-queue?scan=1` — `WorkQueue.tsx` watches
  for `?scan=1` on mount and pops the in-app `ScanDialog`.
- **My Activity** → `/operator/my-activity`

Operators on phones get the touch-first `/m/*` shell automatically via
`App.tsx`'s viewport-aware redirect.

### Hardware back / dialog dismissal

Android hardware back is wired into React Router via `useHardwareBack`. In
order:

1. If a Radix dialog / sheet / popover is open → dispatch Escape to close
   it. Operators with an `OperationDetailModal` open never get yanked off
   the page on the first back press.
2. Otherwise pop one entry off React Router history.
3. If history is empty → `App.minimizeApp()` instead of exiting, so the
   operator's state is preserved.

## Diagnostics

- `adb logcat | grep -i capacitor` for plugin errors.
- Chrome → `chrome://inspect/#devices` to remote-debug the WebView (debug
  builds only — `webContentsDebuggingEnabled` is gated on `NODE_ENV`).
- Battery / network throttling via Studio's "Profile" tab to validate the
  operator queue stays smooth on cellular.
