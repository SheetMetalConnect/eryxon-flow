# ERY-71 — Native Packaging & Self-Host Distribution Validation Note

Date: 2026-05-24
Owner: Engineer
Issue: [ERY-71](/ERY/issues/ERY-71)
Parent: [ERY-55](/ERY/issues/ERY-55)
Branch: `engineer/ery-71-native-packaging` (worktree off `17575bb`)

This note replaces reliance on the old umbrella PR description as the validation
record for the native branch. It lists exactly what changed, what was verified
here, and what is explicitly blocked on build tooling.

## Changes in this branch

| Deliverable | Change | File(s) |
|---|---|---|
| ML Kit offline barcode | Wired the previously-dead `mlkitBarcodeDependencies` placeholder into a real `com.google.mlkit.vision.DEPENDENCIES` meta-data so Google Play fetches the model at install time, not first scan. Documented the GMS caveat + bundled-model path for air-gapped fleets (claim narrowed honestly). | `android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle`, `docs/ANDROID.md` |
| LAN self-host distribution | Removed the fabricated sample-IP RFC1918 enumeration (false coverage, no CIDR match). Release builds are HTTPS-only; dev/live-reload cleartext is confined to `debug-overrides`; plain-HTTP LAN hosts are supported per-host via a documented custom-build template or TLS fronting (least privilege). | `android/app/src/main/res/xml/network_security_config.xml`, `docs/ANDROID.md`, `docs/IOS.md` |
| Version alignment | `android/app/build.gradle` versionName `0.5.1 → 0.5.2`, README badge + status line `0.5.1 → 0.5.2`. Now consistent with `package.json` (0.5.2) and `CHANGELOG` (0.5.2). | `android/app/build.gradle`, `README.md` |

Note on target version: surfaces are aligned to the current canonical `0.5.2`.
The coordinated bump to `0.6.0` (package.json + gradle versionName + versionCode
increment + README + a new CHANGELOG section) is a release-tagging step under
[ERY-55](/ERY/issues/ERY-55) and should land atomically at the release cut, not
piecemeal here. Flagged for CTO decision.

## What was verified here (pass)

- **XML well-formedness** — `network_security_config.xml` and
  `AndroidManifest.xml` parse cleanly (`python3 xml.dom.minidom`). PASS.
- **Placeholder wiring** — `mlkitBarcodeDependencies` is now both defined
  (build.gradle) and consumed (`${mlkitBarcodeDependencies}` in the manifest
  meta-data). Confirmed by grep. PASS.
- **Version consistency** — package.json / build.gradle / README / CHANGELOG all
  report `0.5.2`. PASS.
- **Least-privilege review** — release artifacts now have zero blanket cleartext
  exception; cleartext is debug-only or one explicit operator-chosen host. PASS.

## What is BLOCKED on build tooling (fail / not-run)

This host has **Command Line Tools only (no Xcode.app), no CocoaPods, no JDK, no
Android SDK**. Probe output:

```
$ xcode-select -p            -> /Library/Developer/CommandLineTools
$ xcodebuild -version        -> error: requires Xcode (only CLT present)
$ pod --version              -> pod: command not found
$ java -version              -> Unable to locate a Java Runtime
$ echo $ANDROID_HOME         -> (empty)
```

Consequently the following could not be executed and remain unproven:

1. **iOS workspace bootstrap** — `npm run ios:init` (`npx cap add ios` + `pod
   install`) needs Xcode 15+ and CocoaPods. The `ios/` workspace therefore still
   does not exist as a checked-in/validated artifact. NOT RUN — blocked on
   toolchain.
2. **Android build smoke** — `npm run android:assemble:debug` / `:release`
   (gradle) needs JDK 17 + Android SDK (API 35). The ML Kit meta-data and the new
   network-security config are correct by inspection and parse cleanly, but have
   not been proven to compile/package/merge in a real build. NOT RUN — blocked on
   toolchain.

## Remaining Apple-specific blockers for TestFlight/App Store

Already enumerated in `docs/IOS.md` ("Remaining iOS-only gaps") and unchanged by
this branch — they require a Mac with Xcode + an Apple Developer account:

1. APNs auth key + `PushNotifications.register()` wiring.
2. Universal Links / Associated Domains (`applinks:app.eryxon.eu` entitlement +
   `/.well-known/apple-app-site-association`).
3. Splash screen assets + 1024×1024 app icon set.
4. `Info.plist` localizations (`CFBundleLocalizations = [en, nl, de]`).

## Recommended next steps

- CTO: approve commit+push of `engineer/ery-71-native-packaging`.
- Provision a native-build lane (local Mac with Xcode 15+/CocoaPods and JDK 17 +
  Android SDK, or a CI macOS runner) so iOS bootstrap and the Android build smoke
  can produce pass/fail evidence. Tracked as the ERY-71 build-validation follow-up.
- At the v0.6 release cut, perform the coordinated `0.6.0` version bump atomically.
