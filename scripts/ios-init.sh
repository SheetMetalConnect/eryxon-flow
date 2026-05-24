#!/usr/bin/env bash
#
# scripts/ios-init.sh — first-time iOS project bootstrap.
#
# Run this on a Mac with Xcode + CocoaPods installed. Idempotent: re-running
# only re-syncs the web bundle into the existing iOS project.

set -euo pipefail

cd "$(dirname "$0")/.."

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

# @capacitor-mlkit/barcode-scanning@7.5.0 pulls in GoogleMLKit/BarcodeScanning
# (= 7.0.0), which declares a minimum deployment target of iOS 15.5. The
# Capacitor 7 template ships a Podfile pinned to `platform :ios, '14.0'`, so a
# stock `cap add ios` fails CocoaPods resolution before any build runs
# (ERY-108). Pin the whole project to 15.5 so pod install resolves.
IOS_DEPLOYMENT_TARGET="15.5"

# Raise the iOS deployment target in the generated (uncommitted) iOS project so
# CocoaPods can resolve GoogleMLKit 7.0.0. Idempotent: safe to re-run on every
# init/sync. We touch three places:
#   - Podfile `platform :ios` line (controls the App pod target floor)
#   - Podfile post_install (raises every transitive Pods target)
#   - App.xcodeproj deployment target (so the app target links the 15.5 pods)
# `cap sync` only rewrites the capacitor_pods block + require_relative line, so
# these edits survive the sync that runs pod install.
patch_ios_deployment_target() {
  local podfile="ios/App/Podfile"
  local pbxproj="ios/App/App.xcodeproj/project.pbxproj"

  if [[ -f "$podfile" ]]; then
    echo "▶ Pinning iOS deployment target to ${IOS_DEPLOYMENT_TARGET} (GoogleMLKit 7.0.0 needs >= 15.5)..."
    sed -i '' -E "s/^platform :ios, '[0-9.]+'/platform :ios, '${IOS_DEPLOYMENT_TARGET}'/" "$podfile"
    if ! grep -q "ERYXON_DEPLOYMENT_FLOOR" "$podfile"; then
      perl -0pi -e "s/(post_install do \|installer\|\n)/\$1  # ERYXON_DEPLOYMENT_FLOOR: GoogleMLKit\/BarcodeScanning 7.0.0 requires iOS 15.5+\n  installer.pods_project.targets.each do |t|\n    t.build_configurations.each do |c|\n      if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${IOS_DEPLOYMENT_TARGET}\n        c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${IOS_DEPLOYMENT_TARGET}'\n      end\n    end\n  end\n/" "$podfile"
    fi
  fi

  if [[ -f "$pbxproj" ]]; then
    sed -i '' -E "s/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]+;/IPHONEOS_DEPLOYMENT_TARGET = ${IOS_DEPLOYMENT_TARGET};/g" "$pbxproj"
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

if [[ ! -d ios ]]; then
  echo "▶ Generating native iOS project (npx cap add ios)..."
  # `cap add ios` only runs `cap sync` (and therefore `pod install`) when the
  # web bundle (dist/) already exists. We deliberately add the platform BEFORE
  # building so that first pod install is skipped — it would otherwise resolve
  # against the default 'platform :ios, 14.0' Podfile and fail on GoogleMLKit
  # 7.0.0. Removing any stale dist/ keeps this deterministic on dev machines.
  rm -rf dist
  npx cap add ios
  patch_ios_deployment_target
fi

echo "▶ Building production web bundle..."
npm run build

echo "▶ Syncing web bundle and native plugins into ios/..."
# Re-assert the deployment floor before sync in case the iOS project predates
# this pin, then sync (which runs pod install against the corrected Podfile).
patch_ios_deployment_target
npx cap sync ios

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
