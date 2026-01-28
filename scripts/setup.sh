#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Eryxon MES - Interactive Setup Script
# =============================================================================
# Walks through the full deployment: prerequisites, Supabase config,
# migrations, storage buckets, edge functions, and npm install.
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
NC='\033[0m' # No Color

ok()      { printf "${GREEN}  [OK]${NC} %s\n" "$1"; }
warn()    { printf "${YELLOW}  [WARN]${NC} %s\n" "$1"; }
fail()    { printf "${RED}  [FAIL]${NC} %s\n" "$1"; }
info()    { printf "${CYAN}  [INFO]${NC} %s\n" "$1"; }
header()  { printf "\n${BOLD}${BLUE}=== %s ===${NC}\n\n" "$1"; }
prompt()  { printf "${BOLD}  > %s${NC}" "$1"; }

# Track errors so the script can continue past non-fatal failures
ERRORS=0

# ---------------------------------------------------------------------------
# Helper: run a command, report success / failure, and optionally continue
# Usage: run_step "description" command [args...]
# ---------------------------------------------------------------------------
run_step() {
  local desc="$1"; shift
  if "$@" 2>&1; then
    ok "$desc"
  else
    fail "$desc"
    ERRORS=$((ERRORS + 1))
  fi
}

# Resolve project root (one level up from scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

printf "\n${BOLD}${CYAN}"
printf "  ╔══════════════════════════════════════════╗\n"
printf "  ║        Eryxon MES - Project Setup        ║\n"
printf "  ╚══════════════════════════════════════════╝${NC}\n\n"

# =========================================================================
# Step 1 - Check prerequisites
# =========================================================================
header "Step 1: Checking prerequisites"

# -- Node.js >= 20 --------------------------------------------------------
if command -v node &>/dev/null; then
  NODE_VERSION="$(node -v | sed 's/^v//')"
  NODE_MAJOR="${NODE_VERSION%%.*}"
  if [ "$NODE_MAJOR" -ge 20 ] 2>/dev/null; then
    ok "Node.js v${NODE_VERSION} (>= 20 required)"
  else
    fail "Node.js v${NODE_VERSION} found but >= 20 is required"
    info "Install Node.js 20+ from https://nodejs.org/ or use nvm:"
    info "  nvm install 20 && nvm use 20"
    ERRORS=$((ERRORS + 1))
  fi
else
  fail "Node.js is not installed"
  info "Install Node.js 20+ from https://nodejs.org/ or use nvm:"
  info "  nvm install 20 && nvm use 20"
  ERRORS=$((ERRORS + 1))
fi

# -- npm -------------------------------------------------------------------
if command -v npm &>/dev/null; then
  NPM_VERSION="$(npm -v)"
  ok "npm v${NPM_VERSION}"
else
  fail "npm is not installed (usually bundled with Node.js)"
  ERRORS=$((ERRORS + 1))
fi

# -- Supabase CLI ----------------------------------------------------------
if command -v supabase &>/dev/null; then
  SUPA_VERSION="$(supabase --version 2>&1 | head -1)"
  ok "Supabase CLI (${SUPA_VERSION})"
else
  warn "Supabase CLI not found"
  info "Installing via npm..."
  if npm install -g supabase 2>&1; then
    ok "Supabase CLI installed"
  else
    fail "Could not install Supabase CLI automatically"
    info "Install manually: npm install -g supabase"
    info "Or see https://supabase.com/docs/guides/cli/getting-started"
    ERRORS=$((ERRORS + 1))
  fi
fi

if [ "$ERRORS" -gt 0 ]; then
  warn "Some prerequisites are missing. You may continue, but later steps could fail."
  prompt "Continue anyway? [y/N] "
  read -r CONT
  if [[ ! "$CONT" =~ ^[Yy] ]]; then
    printf "\nSetup aborted.\n"
    exit 1
  fi
  ERRORS=0
fi

# =========================================================================
# Step 2 - Supabase credentials
# =========================================================================
header "Step 2: Supabase credentials"

ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  info ".env file already exists at $ENV_FILE"
  prompt "Overwrite it? [y/N] "
  read -r OVERWRITE
  if [[ ! "$OVERWRITE" =~ ^[Yy] ]]; then
    info "Keeping existing .env file"
    # Source existing values for later steps
    set +u
    # shellcheck disable=SC1090
    source "$ENV_FILE" 2>/dev/null || true
    set -u
    SKIP_ENV=true
  else
    SKIP_ENV=false
  fi
else
  SKIP_ENV=false
fi

if [ "${SKIP_ENV:-false}" = false ]; then
  # -- VITE_SUPABASE_URL ---------------------------------------------------
  prompt "Supabase project URL (e.g. https://abcdefgh.supabase.co): "
  read -r VITE_SUPABASE_URL
  while [ -z "${VITE_SUPABASE_URL:-}" ]; do
    warn "This field is required."
    prompt "Supabase project URL: "
    read -r VITE_SUPABASE_URL
  done

  # -- VITE_SUPABASE_PUBLISHABLE_KEY --------------------------------------
  prompt "Supabase anon (publishable) key: "
  read -r VITE_SUPABASE_PUBLISHABLE_KEY
  while [ -z "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ]; do
    warn "This field is required."
    prompt "Supabase anon key: "
    read -r VITE_SUPABASE_PUBLISHABLE_KEY
  done

  # -- VITE_SUPABASE_PROJECT_ID (auto-extract from URL) -------------------
  AUTO_PROJECT_ID="$(echo "$VITE_SUPABASE_URL" | sed -n 's|https://\([^.]*\)\.supabase\.co.*|\1|p')"
  if [ -n "$AUTO_PROJECT_ID" ]; then
    info "Extracted project ID from URL: $AUTO_PROJECT_ID"
    prompt "Project ID [${AUTO_PROJECT_ID}]: "
    read -r VITE_SUPABASE_PROJECT_ID
    VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID:-$AUTO_PROJECT_ID}"
  else
    prompt "Supabase project ID (the part before .supabase.co): "
    read -r VITE_SUPABASE_PROJECT_ID
    while [ -z "${VITE_SUPABASE_PROJECT_ID:-}" ]; do
      warn "This field is required."
      prompt "Supabase project ID: "
      read -r VITE_SUPABASE_PROJECT_ID
    done
  fi

  # -- Turnstile (optional) ------------------------------------------------
  VITE_TURNSTILE_SITE_KEY=""
  prompt "Enable Cloudflare Turnstile captcha? [y/N] "
  read -r USE_TURNSTILE
  if [[ "$USE_TURNSTILE" =~ ^[Yy] ]]; then
    prompt "Turnstile site key: "
    read -r VITE_TURNSTILE_SITE_KEY
  fi

  # =========================================================================
  # Step 3 - Generate .env file
  # =========================================================================
  header "Step 3: Generating .env file"

  cat > "$ENV_FILE" <<ENVEOF
# Eryxon MES - Generated by setup.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Supabase Configuration (Required)
VITE_SUPABASE_URL="${VITE_SUPABASE_URL}"
VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}"
VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID}"

# Cloudflare Turnstile (Optional)
VITE_TURNSTILE_SITE_KEY="${VITE_TURNSTILE_SITE_KEY}"
ENVEOF

  ok "Created .env file at ${ENV_FILE}"
fi

# Source the .env so variables are available for remaining steps
set +u
# shellcheck disable=SC1090
source "$ENV_FILE" 2>/dev/null || true
set -u

# Resolve the project ref for Supabase CLI commands
PROJECT_REF="${VITE_SUPABASE_PROJECT_ID:-}"
if [ -z "$PROJECT_REF" ]; then
  PROJECT_REF="$(echo "${VITE_SUPABASE_URL:-}" | sed -n 's|https://\([^.]*\)\.supabase\.co.*|\1|p')"
fi

# =========================================================================
# Step 4 - Link Supabase project
# =========================================================================
header "Step 4: Linking Supabase project"

if [ -z "$PROJECT_REF" ]; then
  fail "Could not determine project ref. Skipping Supabase link."
  ERRORS=$((ERRORS + 1))
else
  info "Linking to project ref: ${PROJECT_REF}"
  if supabase link --project-ref "$PROJECT_REF" 2>&1; then
    ok "Supabase project linked"
  else
    fail "Could not link Supabase project (you may need to run 'supabase login' first)"
    ERRORS=$((ERRORS + 1))
  fi
fi

# =========================================================================
# Step 5 - Apply database migrations
# =========================================================================
header "Step 5: Applying database migrations"

if supabase db push 2>&1; then
  ok "Database migrations applied"
else
  fail "Database migration failed"
  info "You can retry later with: supabase db push"
  ERRORS=$((ERRORS + 1))
fi

# -- Apply seed.sql (storage buckets, RLS policies, cron jobs) -------------
info "Applying seed file (storage policies & cron jobs)..."
SEED_FILE="$PROJECT_ROOT/supabase/seed.sql"
if [ -f "$SEED_FILE" ]; then
  if supabase db execute --file "$SEED_FILE" 2>&1; then
    ok "Seed file applied (storage policies & cron jobs)"
  else
    warn "Seed file had errors (some items may already exist - this is usually fine)"
  fi
else
  warn "supabase/seed.sql not found - skipping"
fi

# =========================================================================
# Step 6 - Create storage buckets
# =========================================================================
header "Step 6: Creating storage buckets"

BUCKETS=("parts-images" "issues" "parts-cad" "batch-images")

for bucket in "${BUCKETS[@]}"; do
  OUTPUT="$(supabase storage create "$bucket" 2>&1)" || true
  if echo "$OUTPUT" | grep -qi "already exists"; then
    info "Bucket '${bucket}' already exists - skipping"
  elif echo "$OUTPUT" | grep -qi "error"; then
    fail "Could not create bucket '${bucket}': ${OUTPUT}"
    ERRORS=$((ERRORS + 1))
  else
    ok "Created storage bucket '${bucket}'"
  fi
done

# =========================================================================
# Step 7 - Deploy edge functions
# =========================================================================
header "Step 7: Deploying edge functions"

if supabase functions deploy 2>&1; then
  ok "Edge functions deployed"
else
  fail "Edge function deployment failed"
  info "You can retry later with: supabase functions deploy"
  ERRORS=$((ERRORS + 1))
fi

# =========================================================================
# Step 8 - Set edge function secrets
# =========================================================================
header "Step 8: Setting edge function secrets"

prompt "Supabase service role key (from Dashboard > Settings > API): "
read -rs SERVICE_ROLE_KEY
printf "\n"

if [ -n "${SERVICE_ROLE_KEY:-}" ]; then
  SUPA_URL="${VITE_SUPABASE_URL:-}"
  if supabase secrets set \
      "SUPABASE_URL=${SUPA_URL}" \
      "SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}" 2>&1; then
    ok "Edge function secrets configured"
  else
    fail "Could not set edge function secrets"
    ERRORS=$((ERRORS + 1))
  fi
else
  warn "Skipped - no service role key provided"
  info "Set secrets later with:"
  info "  supabase secrets set SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key>"
fi

# =========================================================================
# Step 9 - Install npm dependencies
# =========================================================================
header "Step 9: Installing npm dependencies"

if npm ci 2>&1; then
  ok "npm dependencies installed"
else
  fail "npm ci failed"
  info "Try running 'npm install' manually."
  ERRORS=$((ERRORS + 1))
fi

# =========================================================================
# Step 10 - Next steps
# =========================================================================
header "Setup complete"

if [ "$ERRORS" -gt 0 ]; then
  warn "${ERRORS} step(s) encountered errors. Review the output above."
  printf "\n"
fi

printf "${BOLD}${GREEN}"
printf "  ╔══════════════════════════════════════════════════════════════╗\n"
printf "  ║                      Next steps                            ║\n"
printf "  ╠══════════════════════════════════════════════════════════════╣\n"
printf "  ║                                                            ║\n"
printf "  ║  1. Start the dev server:                                  ║\n"
printf "  ║     npm run dev                                            ║\n"
printf "  ║                                                            ║\n"
printf "  ║  2. Open the app in your browser (default: localhost:5173) ║\n"
printf "  ║                                                            ║\n"
printf "  ║  3. The first user to sign up becomes the admin.           ║\n"
printf "  ║     Create your account to get started.                    ║\n"
printf "  ║                                                            ║\n"
printf "  ║  4. (Optional) Enable Cloudflare Turnstile for captcha     ║\n"
printf "  ║     protection on auth forms. Add your site key to .env:   ║\n"
printf "  ║     VITE_TURNSTILE_SITE_KEY=\"your-key\"                     ║\n"
printf "  ║                                                            ║\n"
printf "  ║  5. Run the verification script to confirm everything:     ║\n"
printf "  ║     bash scripts/verify-setup.sh                           ║\n"
printf "  ║                                                            ║\n"
printf "  ╚══════════════════════════════════════════════════════════════╝${NC}\n\n"
