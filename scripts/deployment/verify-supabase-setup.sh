#!/bin/bash
# Verify Supabase setup - checks migrations, functions, and configuration
# Useful before migrating to a new project

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔍 Verifying Supabase Setup"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check migrations
echo "📁 Checking Migrations..."
MIGRATION_COUNT=$(find "$PROJECT_ROOT/supabase/migrations/archive" -name "*.sql" 2>/dev/null | wc -l)
if [ "$MIGRATION_COUNT" -eq 0 ]; then
    check_fail "No migration files found"
else
    check_pass "$MIGRATION_COUNT migration files found"
fi
echo ""

# Check Edge Functions
echo "⚡ Checking Edge Functions..."
FUNCTION_COUNT=$(ls -1 "$PROJECT_ROOT/supabase/functions/" 2>/dev/null | grep -v "^_shared$" | grep -v "^.env" | wc -l)
if [ "$FUNCTION_COUNT" -eq 0 ]; then
    check_warn "No Edge Functions found"
else
    check_pass "$FUNCTION_COUNT Edge Functions found"

    # List functions
    echo "   Functions:"
    ls -1 "$PROJECT_ROOT/supabase/functions/" | grep -v "^_shared$" | grep -v "^.env" | while read -r func; do
        echo "   - $func"
    done
fi
echo ""

# Check shared utilities
echo "🔧 Checking Shared Utilities..."
UTIL_COUNT=$(ls -1 "$PROJECT_ROOT/supabase/functions/_shared/" 2>/dev/null | wc -l)
if [ "$UTIL_COUNT" -eq 0 ]; then
    check_warn "No shared utilities found"
else
    check_pass "$UTIL_COUNT shared utilities found"
fi
echo ""

# Check configuration
echo "⚙️  Checking Configuration..."
if [ -f "$PROJECT_ROOT/supabase/config.toml" ]; then
    check_pass "config.toml exists"
    PROJECT_ID=$(grep "project_id" "$PROJECT_ROOT/supabase/config.toml" | cut -d'"' -f2)
    echo "   Current project ID: $PROJECT_ID"
else
    check_fail "config.toml not found"
fi
echo ""

# Check environment files
echo "🔐 Checking Environment Files..."
if [ -f "$PROJECT_ROOT/.env.example" ]; then
    check_pass ".env.example exists"
else
    check_fail ".env.example not found"
fi

if [ -f "$PROJECT_ROOT/.env" ]; then
    check_pass ".env exists"
    # Check if it has required variables
    if grep -q "VITE_SUPABASE_URL" "$PROJECT_ROOT/.env" && grep -q "VITE_SUPABASE_PUBLISHABLE_KEY" "$PROJECT_ROOT/.env"; then
        check_pass "Required environment variables found"
    else
        check_warn "Missing required environment variables"
    fi
else
    check_warn ".env not found (expected for fresh setup)"
fi
echo ""

# Check package.json
echo "📦 Checking Package Configuration..."
if [ -f "$PROJECT_ROOT/package.json" ]; then
    check_pass "package.json exists"
    VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version" 2>/dev/null)
    if [ -n "$VERSION" ]; then
        echo "   Version: $VERSION"
    fi
else
    check_fail "package.json not found"
fi
echo ""

# Check Dockerfile
echo "🐳 Checking Docker Configuration..."
if [ -f "$PROJECT_ROOT/Dockerfile" ]; then
    check_pass "Dockerfile exists"
else
    check_warn "Dockerfile not found"
fi

if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
    check_pass "docker-compose.yml exists"
else
    check_warn "docker-compose.yml not found"
fi
echo ""

# Check GitHub workflows
echo "🔄 Checking CI/CD Workflows..."
WORKFLOW_COUNT=$(ls -1 "$PROJECT_ROOT/.github/workflows/" 2>/dev/null | wc -l)
if [ "$WORKFLOW_COUNT" -eq 0 ]; then
    check_warn "No GitHub workflows found"
else
    check_pass "$WORKFLOW_COUNT GitHub workflows found"
    ls -1 "$PROJECT_ROOT/.github/workflows/" | while read -r workflow; do
        echo "   - $workflow"
    done
fi
echo ""

# Summary
echo "📊 Summary"
echo "========="
echo "Migrations: $MIGRATION_COUNT files"
echo "Edge Functions: $FUNCTION_COUNT functions"
echo "Shared Utils: $UTIL_COUNT files"
echo "CI/CD Workflows: $WORKFLOW_COUNT workflows"
echo ""

# Estimate migration complexity
TOTAL_SQL_LINES=$(cat "$PROJECT_ROOT/supabase/migrations/archive"/*.sql 2>/dev/null | wc -l)
echo "Total SQL lines: $TOTAL_SQL_LINES"
echo ""

# Recommendations
echo "💡 Recommendations"
echo "================="
echo ""
echo "For migration to new Supabase project:"
echo "1. Run: npm run scripts/consolidate-migrations.sh"
echo "2. Create new Supabase project"
echo "3. Apply consolidated-schema.sql via SQL Editor"
echo "4. Deploy Edge Functions: supabase functions deploy"
echo "5. Update .env with new credentials"
echo "6. Deploy frontend to Cloudflare Pages or Vercel"
echo ""
echo "For Cloudflare Pages deployment:"
echo "1. Connect GitHub repo to Cloudflare Pages"
echo "2. Set build command: npm run build"
echo "3. Set build output: dist"
echo "4. Add environment variables (VITE_SUPABASE_URL, etc.)"
echo "5. Deploy!"
echo ""
