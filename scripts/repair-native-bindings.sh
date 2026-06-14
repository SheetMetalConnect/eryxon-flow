#!/usr/bin/env bash
#
# scripts/repair-native-bindings.sh — restore darwin-arm64 native bindings that
# `npm ci` intermittently skips on Apple Silicon (npm optional-deps bug,
# https://github.com/npm/cli/issues/4828).
#
# Without this, Vite (`npm run build`) fails before any native tooling runs
# because Rollup and SWC cannot load their darwin-arm64 bindings. Both the iOS
# bootstrap (scripts/ios-init.sh) and the Android assemble lane build the web
# bundle, so they share this repair. Idempotent and a no-op off Apple Silicon.

set -euo pipefail

cd "$(dirname "$0")/.."

require_binding() {
  local package_name="$1"
  node -e "require(require.resolve(process.argv[1]));" "$package_name"
}

if [[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then
  if ! require_binding "@rollup/rollup-darwin-arm64" >/dev/null 2>&1 \
    || ! require_binding "@swc/core-darwin-arm64" >/dev/null 2>&1; then
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
