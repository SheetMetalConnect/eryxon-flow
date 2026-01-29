#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Eryxon MES - Post-Setup Verification Script
# =============================================================================
# Validates that the project is correctly configured: env vars, Supabase
# connectivity, required tables, storage buckets, node_modules, and build.
# =============================================================================

# ---------------------------------------------------------------------------
# Color and formatting helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ok()      { printf "${GREEN}  [PASS]${NC} %s\n" "$1"; }
fail()    { printf "${RED}  [FAIL]${NC} %s\n" "$1"; }
warn()    { printf "${YELLOW}  [WARN]${NC} %s\n" "$1"; }
info()    { printf "${CYAN}  [INFO]${NC} %s\n" "$1"; }
header()  { printf "\n${BOLD}${BLUE}--- %s ---${NC}\n\n" "$1"; }

# Resolve project root (one level up from scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

printf "\n${BOLD}${CYAN}"
printf "  ╔══════════════════════════════════════════════╗\n"
printf "  ║   Eryxon MES - Setup Verification Report    ║\n"
printf "  ╚══════════════════════════════════════════════╝${NC}\n"

TOTAL=0
PASSED=0
FAILURES=()

# ---------------------------------------------------------------------------
# Helper: register a check result
# ---------------------------------------------------------------------------
check_pass() {
  ok "$1"
  TOTAL=$((TOTAL + 1))
  PASSED=$((PASSED + 1))
}

check_fail() {
  fail "$1"
  TOTAL=$((TOTAL + 1))
  FAILURES+=("$1")
}

# =========================================================================
# Check 1 - .env file and required variables
# =========================================================================
header "Environment Configuration"

ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  check_pass ".env file exists"
else
  check_fail ".env file exists"
  info "Run scripts/setup.sh to generate the .env file."
  # Cannot continue with most checks without .env
  printf "\n${RED}Cannot continue without .env file. Aborting.${NC}\n\n"
  exit 1
fi

# Source the .env file
set +u
# shellcheck disable=SC1090
source "$ENV_FILE" 2>/dev/null || true
set -u

# -- VITE_SUPABASE_URL ----------------------------------------------------
if [ -n "${VITE_SUPABASE_URL:-}" ] && [ "$VITE_SUPABASE_URL" != "https://your-project-id.supabase.co" ]; then
  check_pass "VITE_SUPABASE_URL is set"
else
  check_fail "VITE_SUPABASE_URL is set"
fi

# -- VITE_SUPABASE_PUBLISHABLE_KEY ----------------------------------------
if [ -n "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ] && [ "$VITE_SUPABASE_PUBLISHABLE_KEY" != "your-anon-key-here" ]; then
  check_pass "VITE_SUPABASE_PUBLISHABLE_KEY is set"
else
  check_fail "VITE_SUPABASE_PUBLISHABLE_KEY is set"
fi

# =========================================================================
# Check 2 - Supabase connection
# =========================================================================
header "Supabase Connection"

SUPA_URL="${VITE_SUPABASE_URL:-}"
SUPA_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:-}"

if [ -n "$SUPA_URL" ] && [ -n "$SUPA_KEY" ]; then
  HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" \
    "${SUPA_URL}/rest/v1/" \
    -H "apikey: ${SUPA_KEY}" \
    -H "Authorization: Bearer ${SUPA_KEY}" 2>/dev/null || echo "000")"

  if [ "$HTTP_CODE" = "200" ]; then
    check_pass "Supabase REST API reachable (HTTP ${HTTP_CODE})"
  else
    check_fail "Supabase REST API reachable (HTTP ${HTTP_CODE})"
    info "Verify your VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env"
  fi
else
  check_fail "Supabase REST API reachable (credentials missing)"
fi

# =========================================================================
# Check 3 - Key tables exist
# =========================================================================
header "Database Tables"

REQUIRED_TABLES=("jobs" "parts" "operations" "tenants" "profiles")

for table in "${REQUIRED_TABLES[@]}"; do
  if [ -n "$SUPA_URL" ] && [ -n "$SUPA_KEY" ]; then
    TABLE_CODE="$(curl -s -o /dev/null -w "%{http_code}" \
      "${SUPA_URL}/rest/v1/${table}?select=count&limit=0" \
      -H "apikey: ${SUPA_KEY}" \
      -H "Authorization: Bearer ${SUPA_KEY}" 2>/dev/null || echo "000")"

    if [ "$TABLE_CODE" = "200" ] || [ "$TABLE_CODE" = "206" ]; then
      check_pass "Table '${table}' exists (HTTP ${TABLE_CODE})"
    else
      check_fail "Table '${table}' exists (HTTP ${TABLE_CODE})"
    fi
  else
    check_fail "Table '${table}' exists (no credentials)"
  fi
done

# =========================================================================
# Check 4 - Storage buckets
# =========================================================================
header "Storage Buckets"

REQUIRED_BUCKETS=("parts-images" "issues" "parts-cad" "batch-images")

for bucket in "${REQUIRED_BUCKETS[@]}"; do
  if [ -n "$SUPA_URL" ] && [ -n "$SUPA_KEY" ]; then
    BUCKET_CODE="$(curl -s -o /dev/null -w "%{http_code}" \
      "${SUPA_URL}/storage/v1/bucket/${bucket}" \
      -H "apikey: ${SUPA_KEY}" \
      -H "Authorization: Bearer ${SUPA_KEY}" 2>/dev/null || echo "000")"

    if [ "$BUCKET_CODE" = "200" ]; then
      check_pass "Storage bucket '${bucket}' exists"
    else
      check_fail "Storage bucket '${bucket}' exists (HTTP ${BUCKET_CODE})"
      info "Create it with: supabase storage create ${bucket}"
    fi
  else
    check_fail "Storage bucket '${bucket}' exists (no credentials)"
  fi
done

# =========================================================================
# Check 5 - Node modules
# =========================================================================
header "Node.js Dependencies"

if [ -d "$PROJECT_ROOT/node_modules" ]; then
  check_pass "node_modules/ directory exists"
else
  check_fail "node_modules/ directory exists"
  info "Run 'npm ci' to install dependencies."
fi

# =========================================================================
# Check 6 - Build test
# =========================================================================
header "Build Verification"

info "Running 'npm run build' -- this may take a moment..."
printf "\n"

if npm run build --prefix "$PROJECT_ROOT" >/dev/null 2>&1; then
  check_pass "Production build succeeds"
else
  check_fail "Production build succeeds"
  info "Run 'npm run build' manually to see the full error output."
fi

# =========================================================================
# Summary
# =========================================================================
FAILED=$((TOTAL - PASSED))

printf "\n${BOLD}${BLUE}"
printf "  ╔══════════════════════════════════════════════╗\n"
printf "  ║              Verification Summary            ║\n"
printf "  ╚══════════════════════════════════════════════╝${NC}\n\n"

if [ "$FAILED" -eq 0 ]; then
  printf "  ${GREEN}${BOLD}All ${TOTAL} checks passed.${NC}\n"
  printf "  ${GREEN}Your Eryxon MES setup is fully configured.${NC}\n\n"
else
  printf "  ${BOLD}${PASSED} of ${TOTAL} checks passed.${NC}\n"
  printf "  ${RED}${BOLD}${FAILED} check(s) failed:${NC}\n\n"
  for f in "${FAILURES[@]}"; do
    printf "    ${RED}- %s${NC}\n" "$f"
  done
  printf "\n"
  info "Fix the failing checks and re-run this script:"
  info "  bash scripts/verify-setup.sh"
  printf "\n"
fi

exit "$FAILED"
