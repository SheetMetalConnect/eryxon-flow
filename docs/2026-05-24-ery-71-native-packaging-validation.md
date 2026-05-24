# ERY-71 Native Packaging Validation

## Lane decision

- Selected validation lane: GitHub Actions macOS 15 (`.github/workflows/native-build-smoke.yml`)
- Why: the current validation host only has Command Line Tools; it does not have `Xcode.app`, CocoaPods, Java, `sdkmanager`, or `adb`, so it cannot satisfy the iOS/Android acceptance checks locally.
- Scope of the lane: pin Node 20 + Java 17 on GitHub's macOS 15 runner, run `npm run ios:init`, build the generated iOS workspace for the simulator, then run `npm run android:assemble:debug` and `npm run android:assemble:release`, and upload logs/artifacts for review.

## Local host evidence captured on 2026-05-24

| Check | Result | Evidence |
| --- | --- | --- |
| `xcodebuild -version` | FAIL | active developer dir is `/Library/Developer/CommandLineTools`; `Xcode.app` is not installed |
| `pod --version` | FAIL | `pod: command not found` |
| `java -version` | FAIL | no Java runtime present |
| `sdkmanager --version` | FAIL | `sdkmanager: command not found` |
| `adb version` | FAIL | `adb: command not found` |
| `npm run build` | PASS | build succeeds after explicitly restoring the missing darwin-arm64 Rollup + SWC native bindings that `npm ci` skipped on this Apple Silicon host |
| `npm run ios:init` on this host | FAIL | after the Rollup/SWC repair, the script reaches `npx cap add ios` and then stops at the real blocker: `CocoaPods is not installed` |
| `ios/` workspace produced locally | FAIL | `npx cap add ios` aborted before creating `ios/` because CocoaPods is absent on this host |

## Native validation status

First recorded macOS-lane run: GitHub Actions run `26370648743` (`workflow_dispatch` on
branch `engineer/ery-81-native-smoke`), runner `macos-15`, conclusion **failure**.
Toolchain confirmed present on the runner: Xcode 16.4 (build 16F6), CocoaPods 1.16.2,
Node v20.20.2 / npm 10.8.2, Temurin OpenJDK 17.0.19+10, Android SDK at
`/Users/runner/Library/Android/sdk` with `android-35` platform and build-tools `35.0.0`/`35.0.1`.
A second run (`26370608416`, PR-triggered on `engineer/ery-99-native-smoke`) reproduced the
identical failure, confirming it is deterministic and not a flake.

| Check | Status | Evidence |
| --- | --- | --- |
| Toolchain availability (Xcode/CocoaPods/Java/Android SDK) | PASS | "Capture native toolchain versions" step, run `26370648743` |
| darwin-arm64 Rollup/SWC binding repair (`scripts/ios-init.sh`) | PASS | "▶ Repairing darwin-arm64 native bindings…" then web bundle builds, run `26370648743` |
| `npx cap add ios` generates the Xcode project | PASS | "✔ Adding native Xcode project in ios", run `26370648743` |
| `npm run ios:init` (full, incl. `pod install`) | FAIL | `pod install` cannot resolve `GoogleMLKit/BarcodeScanning (= 7.0.0)` — see root cause below |
| iOS simulator build of `ios/App/App.xcworkspace` | NOT RUN | step **skipped**: prior `ios:init` step failed (`set -e` short-circuit) |
| `npm run android:assemble:debug` | NOT RUN | step **skipped**: blocked by the iOS step failure earlier in the same job |
| `npm run android:assemble:release` | NOT RUN | step **skipped**: blocked by the iOS step failure earlier in the same job |

## Root cause of the iOS-lane failure

`@capacitor-mlkit/barcode-scanning@7.5.0` resolves `CapacitorMlkitBarcodeScanning`, which pins
`GoogleMLKit/BarcodeScanning (= 7.0.0)`. CocoaPods reports that specs satisfying that pin exist
but **require a higher minimum iOS deployment target** than the Capacitor-generated Podfile sets.
GoogleMLKit 7.x requires an iOS 15.5+ deployment target; the generated `ios/App/Podfile` ships a
lower `platform :ios` floor. Exact runner output:

```
[!] CocoaPods could not find compatible versions for pod "GoogleMLKit/BarcodeScanning":
  CapacitorMlkitBarcodeScanning (from `../../node_modules/@capacitor-mlkit/barcode-scanning`)
    was resolved to 7.5.0, which depends on GoogleMLKit/BarcodeScanning (= 7.0.0)
  Specs satisfying the `GoogleMLKit/BarcodeScanning (= 7.0.0)` dependency were found,
  but they required a higher minimum deployment target.
```

## Fix direction (tracked under ERY-81)

The iOS deployment-target floor must be raised to ≥ 15.5 **before** `pod install` runs. Two
candidate approaches, to be validated on the same lane:

1. Set the iOS deployment target in Capacitor config / the generated `ios/App/Podfile`
   (`platform :ios, '15.5'`) and a matching `IPHONEOS_DEPLOYMENT_TARGET`, applied by
   `scripts/ios-init.sh` after `npx cap add ios` generates the project but before pods install.
2. Pin `@capacitor-mlkit/barcode-scanning` to a version whose GoogleMLKit dependency supports the
   current floor (only if a compatible release exists — otherwise option 1 is required).

Workflow note: because the iOS step runs before the Android steps in a single job, an iOS failure
currently **skips** Android validation entirely. Splitting iOS and Android into separate jobs (or
adding `continue-on-error` on iOS) would let Android evidence be captured independently. Tracked as
a follow-up improvement on the lane.

## Remaining Apple-specific gaps

- The pre-TestFlight items remain explicitly tracked in [docs/IOS.md](./IOS.md): APNs wiring, Associated Domains / Universal Links, splash/icon assets, and App Store metadata polish.
