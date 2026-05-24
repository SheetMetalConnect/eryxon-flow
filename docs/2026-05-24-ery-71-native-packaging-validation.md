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

First macOS lane run: GitHub Actions run [`26370608416`](https://github.com/SheetMetalConnect/eryxon-flow/actions/runs/26370608416) on `macos-15` (PR [#598](https://github.com/SheetMetalConnect/eryxon-flow/pull/598), `pull_request` trigger), 2026-05-24. Conclusion: **failure** at iOS bootstrap; downstream steps skipped. Logs/artifacts: `native-build-smoke-26370608416`.

| Check | Status | Evidence |
| --- | --- | --- |
| macOS toolchain present (Xcode, CocoaPods, Java 17, Android SDK API 35) | PASS | "Capture native toolchain versions" step succeeded — confirms the lane is correctly provisioned |
| `npm run ios:init` (web build + `npx cap add ios`) | PARTIAL | web `vite build` PASS, `npx cap add ios` PASS (Xcode project + assets generated), then `pod install` FAILED |
| iOS `pod install` (CocoaPods dependency resolution) | FAIL | `GoogleMLKit/BarcodeScanning (= 7.0.0)` — pulled transitively by `@capacitor-mlkit/barcode-scanning` 7.5.0 — "required a higher minimum deployment target" than the Capacitor-generated Podfile's iOS target. Root cause below. |
| iOS simulator build of `ios/App/App.xcworkspace` | SKIPPED | iOS step failed before a workspace existed |
| `npm run android:assemble:debug` | SKIPPED | job halts on first failed step; Android never ran this run |
| `npm run android:assemble:release` | SKIPPED | job halts on first failed step; Android never ran this run |

## Root cause + proposed fix (iOS)

- `@capacitor-mlkit/barcode-scanning@7.5.0` depends on `GoogleMLKit/BarcodeScanning = 7.0.0`, which requires a higher minimum iOS deployment target than the default Capacitor Podfile emits.
- Fix: pin the generated iOS deployment target high enough for GoogleMLKit 7.0.0 (iOS 15.5+). Because `ios/` is not committed and `npx cap add ios` runs `pod install` during `add`, the target must be injected before pod resolution — e.g. set a Capacitor iOS `platform`/deployment-target config or generate the Podfile with `platform :ios, '15.5'` (+ a `post_install` target override) prior to `cap add ios`. This is a native-packaging change owned by ERY-71 follow-up, not the smoke-lane itself.

## Workflow follow-up

- The iOS failure masked Android validation (steps skipped). Split iOS and Android into independent jobs (or `if: always()` gating) so a failure in one still produces evidence for the other on the same run.

## Remaining Apple-specific gaps

## Remaining Apple-specific gaps

- The pre-TestFlight items remain explicitly tracked in [docs/IOS.md](/Users/vanenkhuizen/Documents/GitHub/products/eryxon-flow/docs/IOS.md): APNs wiring, Associated Domains / Universal Links, splash/icon assets, and App Store metadata polish.
