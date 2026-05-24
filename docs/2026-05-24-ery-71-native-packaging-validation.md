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

| Check | Status | Evidence path |
| --- | --- | --- |
| `npm run ios:init` in a native-capable lane | PENDING | first run of `.github/workflows/native-build-smoke.yml` |
| iOS simulator build of `ios/App/App.xcworkspace` | PENDING | first run of `.github/workflows/native-build-smoke.yml` |
| `npm run android:assemble:debug` | PENDING | first run of `.github/workflows/native-build-smoke.yml` |
| `npm run android:assemble:release` | PENDING | first run of `.github/workflows/native-build-smoke.yml` |

## Remaining Apple-specific gaps

- The pre-TestFlight items remain explicitly tracked in [docs/IOS.md](/Users/vanenkhuizen/Documents/GitHub/products/eryxon-flow/docs/IOS.md): APNs wiring, Associated Domains / Universal Links, splash/icon assets, and App Store metadata polish.
