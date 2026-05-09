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

echo "▶ Building production web bundle..."
npm run build

if [[ ! -d ios ]]; then
  echo "▶ Generating native iOS project (npx cap add ios)..."
  npx cap add ios
fi

echo "▶ Syncing web bundle and native plugins into ios/..."
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
