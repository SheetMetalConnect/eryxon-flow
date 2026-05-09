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

## Diagnostics

- `adb logcat | grep -i capacitor` for plugin errors.
- Chrome → `chrome://inspect/#devices` to remote-debug the WebView (debug
  builds only — `webContentsDebuggingEnabled` is gated on `NODE_ENV`).
- Battery / network throttling via Studio's "Profile" tab to validate the
  operator queue stays smooth on cellular.
