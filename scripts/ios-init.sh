#!/usr/bin/env bash
#
# scripts/ios-init.sh — first-time iOS project bootstrap.
#
# Run this on a Mac with Xcode + CocoaPods installed. Idempotent: re-running
# only re-syncs the web bundle into the existing iOS project.

set -euo pipefail

cd "$(dirname "$0")/.."

# Minimum iOS deployment target. GoogleMLKit/BarcodeScanning (= 7.0.0), pulled in
# transitively by @capacitor-mlkit/barcode-scanning, refuses to resolve below
# iOS 15.5. Capacitor's stock Podfile ships `platform :ios, '14.0'`, so a plain
# `pod install` fails with "required a higher minimum deployment target". We
# floor the generated project to this value before any pod resolution runs.
# See ERY-109.
IOS_DEPLOYMENT_TARGET="15.5"

if ! command -v node >/dev/null 2>&1; then
  echo "✖ Node.js 20+ is required." >&2
  exit 1
fi

ensure_native_build_bindings() {
  require_binding() {
    local package_name="$1"
    node -e "require(require.resolve(process.argv[1]));" "$package_name"
  }

  # npm ci intermittently skips native optional packages on Apple Silicon.
  # Vite then fails before Capacitor even runs because Rollup and SWC cannot
  # load their darwin-arm64 bindings. Repair them once here so native
  # bootstrap stays deterministic on fresh machines and CI runners.
  if [[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then
    if ! require_binding "@rollup/rollup-darwin-arm64" >/dev/null 2>&1 \
      || ! require_binding "@swc/core-darwin-arm64" >/dev/null 2>&1; then
      local rollup_version
      local swc_version
      rollup_version="$(node -p "require('./node_modules/rollup/package.json').version")"
      swc_version="$(node -p "require('./node_modules/@swc/core/package.json').version")"
      echo "▶ Repairing darwin-arm64 native bindings for Rollup and SWC..."
      npm install --no-save \
        "@rollup/rollup-darwin-arm64@${rollup_version}" \
        "@swc/core-darwin-arm64@${swc_version}"
      require_binding "@rollup/rollup-darwin-arm64" >/dev/null
      require_binding "@swc/core-darwin-arm64" >/dev/null
    fi
  fi
}

# Raise the iOS deployment-target floor across the generated project so the
# GoogleMLKit barcode pod resolves. Idempotent: safe to re-run on every sync.
#
# Capacitor's `cap sync` rewrites only the `def capacitor_pods` block and the
# `require_relative` line of the Podfile, so the `platform :ios` line and the
# `post_install` hook we edit here survive subsequent syncs.
ensure_ios_deployment_floor() {
  local podfile="ios/App/Podfile"
  local pbxproj="ios/App/App.xcodeproj/project.pbxproj"

  if [[ -f "$podfile" ]]; then
    echo "▶ Flooring iOS deployment target to ${IOS_DEPLOYMENT_TARGET} (GoogleMLKit/BarcodeScanning needs ≥ 15.5)..."

    # 1. Podfile platform floor — drives CocoaPods dependency resolution.
    perl -0777 -pi -e "s/platform :ios, '[^']*'/platform :ios, '${IOS_DEPLOYMENT_TARGET}'/" "$podfile"

    # 2. post_install floor — Capacitor's assertDeploymentTarget only bumps pod
    #    targets up to 14.0, which is below GoogleMLKit's requirement. Raise any
    #    pod target still under the floor. Guarded by the ERY-109 marker so the
    #    block is injected exactly once.
    if ! grep -q "ERY-109" "$podfile"; then
      POST_INSTALL_FLOOR=$(cat <<RUBY

  # ERY-109: GoogleMLKit/BarcodeScanning (= 7.0.0) requires iOS ${IOS_DEPLOYMENT_TARGET}+.
  installer.pods_project.targets.each do |ery_target|
    ery_target.build_configurations.each do |ery_config|
      ery_current = ery_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f
      if ery_current != 0.0 && ery_current < ${IOS_DEPLOYMENT_TARGET}
        ery_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${IOS_DEPLOYMENT_TARGET}'
      end
    end
  end
RUBY
)
      export POST_INSTALL_FLOOR
      perl -0777 -pi -e 's/(\n\s*assertDeploymentTarget\(installer\))/$1 . $ENV{POST_INSTALL_FLOOR}/e' "$podfile"
      unset POST_INSTALL_FLOOR
    fi
  fi

  # 3. App target floor — bump any IPHONEOS_DEPLOYMENT_TARGET below the floor in
  #    the Xcode project, leaving already-higher values untouched.
  if [[ -f "$pbxproj" ]]; then
    perl -pi -e 's/IPHONEOS_DEPLOYMENT_TARGET = ([0-9.]+);/"IPHONEOS_DEPLOYMENT_TARGET = " . (($1 + 0) < '"${IOS_DEPLOYMENT_TARGET}"' ? "'"${IOS_DEPLOYMENT_TARGET}"'" : $1) . ";"/ge' "$pbxproj"
  fi
}

if [[ "${OSTYPE:-}" != darwin* ]]; then
  echo "⚠ Capacitor's iOS toolchain only runs on macOS — this script will" >&2
  echo "  configure the project but you must finish 'cap add ios' on a Mac." >&2
fi

echo "▶ Installing JS dependencies (npm ci)..."
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
ensure_native_build_bindings

# Generate the native iOS project BEFORE building the web bundle. `cap add ios`
# auto-runs its internal sync — and therefore `pod install` — only when the web
# build directory already exists. Adding the platform while `dist/` is still
# absent gives us a generated Podfile we can floor (below) before any pod
# resolution happens. The real `cap sync ios` after the build installs pods. See
# ERY-109.
if [[ ! -d ios ]]; then
  echo "▶ Generating native iOS project (npx cap add ios)..."
  npx cap add ios
fi

# Floor the deployment target before the build + sync run `pod install`.
ensure_ios_deployment_floor

echo "▶ Building production web bundle..."
npm run build

echo "▶ Syncing web bundle and native plugins into ios/..."
npx cap sync ios

# Re-assert the floor: `cap sync` rewrites parts of the Podfile, and a future
# Capacitor change could touch the platform line, so confirm it still holds.
ensure_ios_deployment_floor

# Ensure the generated Info.plist carries the strings ML Kit / Biometric
# need. Capacitor doesn't inject these automatically — without them iOS will
# crash on the first camera / Face ID call.
PLIST="ios/App/App/Info.plist"
if [[ -f "$PLIST" ]]; then
  echo "▶ Patching Info.plist usage strings..."
  /usr/libexec/PlistBuddy -c "Set :NSCameraUsageDescription 'Used to scan job, part, and CNC-program QR codes from the shop floor.'" "$PLIST" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :NSCameraUsageDescription string 'Used to scan job, part, and CNC-program QR codes from the shop floor.'" "$PLIST"
  /usr/libexec/PlistBuddy -c "Set :NSFaceIDUsageDescription 'Confirms the operator at the shared shop-floor terminal so timers stay accurate.'" "$PLIST" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :NSFaceIDUsageDescription string 'Confirms the operator at the shared shop-floor terminal so timers stay accurate.'" "$PLIST"
  /usr/libexec/PlistBuddy -c "Set :NSPhotoLibraryUsageDescription 'Attach photos to issue reports for quality and NCR review.'" "$PLIST" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :NSPhotoLibraryUsageDescription string 'Attach photos to issue reports for quality and NCR review.'" "$PLIST"

  # Register the `eryxon://` URL scheme so magic-link / deep-link
  # callbacks come back into the WebView. Self-hosters who don't want
  # Universal Links (which need app.eryxon.eu / Apple App Site
  # Association on a public host) can rely on this scheme alone, since
  # `src/native/appShell.ts` listens for both.
  if ! /usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$PLIST" 2>/dev/null | grep -q "eryxon"; then
    echo "▶ Registering CFBundleURLSchemes (eryxon://)..."
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" "$PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLName string eu.eryxon.flow" "$PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string eryxon" "$PLIST" 2>/dev/null || true
  fi

  # App Store listing localizations — match the i18n surface of the web
  # bundle. Safe to set even on self-host builds.
  /usr/libexec/PlistBuddy -c "Set :CFBundleDevelopmentRegion en" "$PLIST" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :CFBundleDevelopmentRegion string en" "$PLIST"
  if ! /usr/libexec/PlistBuddy -c "Print :CFBundleLocalizations" "$PLIST" 2>/dev/null | grep -q "nl"; then
    /usr/libexec/PlistBuddy -c "Add :CFBundleLocalizations array" "$PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :CFBundleLocalizations:0 string en" "$PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :CFBundleLocalizations:1 string nl" "$PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :CFBundleLocalizations:2 string de" "$PLIST" 2>/dev/null || true
  fi

  # App Transport Security exception for LAN deployments. Eryxon Flow is
  # primarily self-hosted; the operator's iPad talks to a plant-internal
  # host that often runs plain HTTP because the shop hasn't fronted it
  # with TLS yet. Without this, every Supabase REST / realtime call from
  # the WebView gets blocked by ATS.
  #
  # We allow:
  #   - `NSAllowsLocalNetworking` so RFC1918 ranges + .local / .lan can
  #     be reached over cleartext (Apple-blessed escape valve, doesn't
  #     require a justification at App Store review).
  #   - `NSAllowsArbitraryLoadsInWebContent` so the WebView itself can
  #     load HTTP assets from the LAN host (CSS, fonts, images).
  #
  # Public-host builds get cleartext blocked at the iOS level — this only
  # opens up the LAN. Operators standing up a TLS reverse proxy can ignore
  # all of this; the entries are inert for HTTPS targets.
  echo "▶ Patching App Transport Security for LAN deployments..."
  /usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity dict" "$PLIST" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c "Set :NSAppTransportSecurity:NSAllowsLocalNetworking true" "$PLIST" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity:NSAllowsLocalNetworking bool true" "$PLIST"
  /usr/libexec/PlistBuddy -c "Set :NSAppTransportSecurity:NSAllowsArbitraryLoadsInWebContent true" "$PLIST" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity:NSAllowsArbitraryLoadsInWebContent bool true" "$PLIST"

  # Bonjour / mDNS discovery. iOS 14+ requires apps to declare the
  # Bonjour service types they intend to browse. We claim `_http._tcp`
  # and `_https._tcp` so an operator can punch in `http://shop-floor.local`
  # without iOS silently dropping the resolution attempt.
  if ! /usr/libexec/PlistBuddy -c "Print :NSBonjourServices" "$PLIST" 2>/dev/null | grep -q "_http"; then
    /usr/libexec/PlistBuddy -c "Add :NSBonjourServices array" "$PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :NSBonjourServices:0 string _http._tcp" "$PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :NSBonjourServices:1 string _https._tcp" "$PLIST" 2>/dev/null || true
  fi

  # iOS 14+ also requires a usage-string for local-network access (the
  # OS pops a permission sheet on first connect-attempt). Without it
  # Bonjour resolution gets blocked on a managed device.
  /usr/libexec/PlistBuddy -c "Set :NSLocalNetworkUsageDescription 'Eryxon Flow connects to your shop-floor server on the local network for jobs, parts, and time tracking.'" "$PLIST" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :NSLocalNetworkUsageDescription string 'Eryxon Flow connects to your shop-floor server on the local network for jobs, parts, and time tracking.'" "$PLIST"
fi

cat <<'EOF'

✔ iOS workspace ready.

  Next steps on a Mac:
    npm run ios:open         # opens the workspace in Xcode
    npm run ios:run          # builds + runs on the connected device

  When you change web code, rebuild + sync with:
    npm run ios:sync

  See IOS.md for signing, TestFlight, and App Store Connect notes.
EOF
