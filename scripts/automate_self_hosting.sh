#!/bin/bash
set -e

# =============================================================================
# Eryxon MES - Automated Self-Hosting Deployment
# =============================================================================
# This script automates the setup, migration, and verification of Eryxon MES.
# It is designed to be idempotent and fixes common configuration issues.
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

header() { echo -e "\n${BLUE}=== $1 ===${NC}"; }
ok() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}x $1${NC}"; exit 1; }

# 1. Check Prerequisites
header "Checking Environment"
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${RED}Error: SUPABASE_DB_PASSWORD environment variable is not set.${NC}"
    echo "Usage: export SUPABASE_DB_PASSWORD='your_password' && ./scripts/automate_self_hosting.sh"
    exit 1
fi
ok "Database password found."

if [ ! -f .env ]; then
    fail ".env file not found. Please create it first."
fi
ok ".env file exists."

# 2. Install Dependencies
header "Installing Dependencies"
npm install --save-dev dotenv pg pg-connection-string
ok "Dependencies installed."

# 3. Fix Configuration
header "Fixing Supabase Config"
# Create backup
cp supabase/config.toml supabase/config.toml.bak
# Comment out problematic lines if they exist and aren't already commented
sed -i.bak 's/^verify_jwt = false/# verify_jwt = false/' supabase/config.toml || true
sed -i.bak 's/^\[project\]/# [project]/' supabase/config.toml || true
sed -i.bak 's/^id =/# id =/' supabase/config.toml || true
ok "config.toml patched."

# 4. Link Project
header "Linking Supabase Project"
# Extract project ID from .env
PROJECT_ID=$(grep VITE_SUPABASE_PROJECT_ID .env | cut -d '"' -f 2)
if [ -z "$PROJECT_ID" ]; then
    fail "Could not find VITE_SUPABASE_PROJECT_ID in .env"
fi
./node_modules/.bin/supabase link --project-ref "$PROJECT_ID"
ok "Project linked."

# 5. Push Migrations
header "Pushing Database Migrations"
# Repair history if needed (optional check, but safe to ignore error)
./node_modules/.bin/supabase migration repair --status reverted 20260127213556 2>/dev/null || true
./node_modules/.bin/supabase db push --yes
ok "Migrations applied."

# 6. Apply Seed Data (as Migration)
header "Applying Seed Data & Policies"
# We converted seed.sql to a migration file (20260127230000_apply_seed.sql) 
# and added 20260127231500_ensure_default_tenant.sql
# so 'db push' above has already applied them.
ok "Seed data and default tenant applied via migration."

# 7. Verification
header "Verifying Setup"
bash scripts/verify-setup.sh
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}SUCCESS! Your self-hosted environment is ready.${NC}"
    echo "Start the server with: npm run dev"
else
    echo -e "\n${RED}Verification failed. Check the logs above.${NC}"
    exit 1
fi
