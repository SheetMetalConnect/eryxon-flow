#!/bin/bash
# Prepare repository for open source by removing sensitive information
# Run this before making the repository public

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 Preparing Repository for Open Source${NC}"
echo "=========================================="
echo ""

# Warning
echo -e "${YELLOW}⚠️  WARNING${NC}"
echo "This script will:"
echo "  1. Remove sensitive files from git tracking"
echo "  2. Fix hardcoded credentials in source code"
echo "  3. Update .gitignore"
echo "  4. Run security audit"
echo ""
echo -e "${RED}This will modify files and git history!${NC}"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""

# Step 1: Remove sensitive files from tracking
echo -e "${BLUE}Step 1: Removing sensitive files from git tracking${NC}"
echo "---------------------------------------------------"

if git ls-files | grep -q "^.env$"; then
    echo "  Removing .env from git..."
    git rm --cached .env || true
    echo -e "${GREEN}  ✓ .env removed from tracking${NC}"
else
    echo -e "${GREEN}  ✓ .env not tracked${NC}"
fi

if git ls-files | grep -q "^supabase/config.toml$"; then
    echo "  Removing supabase/config.toml from git..."
    git rm --cached supabase/config.toml || true
    echo -e "${GREEN}  ✓ supabase/config.toml removed from tracking${NC}"
else
    echo -e "${GREEN}  ✓ supabase/config.toml not tracked${NC}"
fi

echo ""

# Step 2: Update .gitignore
echo -e "${BLUE}Step 2: Updating .gitignore${NC}"
echo "----------------------------"

cat >> "$PROJECT_ROOT/.gitignore" << 'EOF'

# === Added by prepare-for-open-source.sh ===

# Supabase configuration (contains project ID)
supabase/config.toml
supabase/.temp/

# Ensure all env files ignored
.env
.env.*
!.env.example

# Secrets and credentials
*.pem
*.key
*.p12
secrets/
credentials/

# IDE settings (may contain paths)
.vscode/settings.json

EOF

echo -e "${GREEN}✓ .gitignore updated${NC}"
echo ""

# Step 3: Fix hardcoded credentials in source code
echo -e "${BLUE}Step 3: Fixing hardcoded credentials${NC}"
echo "-------------------------------------"

# Fix upload-with-progress.ts
UPLOAD_FILE="$PROJECT_ROOT/src/lib/upload-with-progress.ts"
if [ -f "$UPLOAD_FILE" ]; then
    echo "  Fixing: src/lib/upload-with-progress.ts"

    # Backup
    cp "$UPLOAD_FILE" "$UPLOAD_FILE.bak"

    # Replace hardcoded key
    sed -i "s/const supabaseKey = 'eyJ[^']*';/const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;\n    if (!supabaseKey) throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY');/g" "$UPLOAD_FILE"

    echo -e "${GREEN}  ✓ Fixed upload-with-progress.ts${NC}"
else
    echo -e "${YELLOW}  ⚠ upload-with-progress.ts not found${NC}"
fi

# Fix supabase client
CLIENT_FILE="$PROJECT_ROOT/src/integrations/supabase/client.ts"
if [ -f "$CLIENT_FILE" ]; then
    echo "  Fixing: src/integrations/supabase/client.ts"

    # Backup
    cp "$CLIENT_FILE" "$CLIENT_FILE.bak"

    # Remove hardcoded fallback
    sed -i 's/|| "eyJ[^"]*"//g' "$CLIENT_FILE"

    # Add validation
    sed -i '/const SUPABASE_PUBLISHABLE_KEY/a\
if (!SUPABASE_PUBLISHABLE_KEY) {\
  throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY environment variable");\
}\
' "$CLIENT_FILE"

    echo -e "${GREEN}  ✓ Fixed supabase/client.ts${NC}"
else
    echo -e "${YELLOW}  ⚠ supabase/client.ts not found${NC}"
fi

echo ""

# Step 4: Create secure .env.example
echo -e "${BLUE}Step 4: Updating .env.example${NC}"
echo "--------------------------------"

cat > "$PROJECT_ROOT/.env.example" << 'EOF'
# Eryxon Flow - Environment Configuration
# Copy this file to .env and fill in your values

# =============================================================================
# SUPABASE CONFIGURATION (Required)
# =============================================================================
# Get these from your Supabase project dashboard: Settings -> API

# Your Supabase project URL
VITE_SUPABASE_URL="https://your-project-id.supabase.co"

# Supabase anon/public key (safe to expose in frontend)
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"

# Supabase project ID (the part before .supabase.co)
VITE_SUPABASE_PROJECT_ID="your-project-id"

# =============================================================================
# OPTIONAL CONFIGURATION
# =============================================================================

# App title (shown in browser tab)
# VITE_APP_TITLE="Eryxon Flow"

# Default language (en, nl, de)
# VITE_DEFAULT_LANGUAGE="en"

# =============================================================================
# CAD PROCESSING SERVICE (Optional)
# =============================================================================
# Server-side CAD processing for geometry and PMI extraction
# See services/pmi-extractor/README.md for deployment instructions

# CAD service URL (leave empty to use browser-based processing)
# VITE_CAD_SERVICE_URL="https://your-cad-service.example.com"

# API key for CAD service authentication (optional if service allows anonymous)
# VITE_CAD_SERVICE_API_KEY="your-api-key-here"

# =============================================================================
# SELF-HOSTED NOTES
# =============================================================================
#
# For self-hosted deployments:
# 1. Create a Supabase project (cloud or self-hosted)
# 2. Apply the database schema from supabase/migrations/
# 3. Deploy edge functions: supabase functions deploy
# 4. Configure storage buckets: parts-images, issues
# 5. Set these environment variables
#
# See docs/SELF_HOSTING_GUIDE.md for complete instructions.
#
# License: BSL 1.1 - Self-hosting is free and unlimited.
# You cannot offer commercial hosted versions that compete with eryxon.eu
#
EOF

echo -e "${GREEN}✓ .env.example updated with placeholders${NC}"
echo ""

# Step 5: Check for other sensitive patterns
echo -e "${BLUE}Step 5: Scanning for other sensitive data${NC}"
echo "------------------------------------------"

SENSITIVE_FOUND=0

# Check for project ID in various files
echo "  Checking for project ID references..."
PROJECT_ID_COUNT=$(grep -r "vatgianzotsurljznsry" \
  --include="*.md" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.toml" \
  "$PROJECT_ROOT" 2>/dev/null | \
  grep -v "node_modules" | \
  grep -v ".git" | \
  grep -v "prepare-for-open-source.sh" | \
  wc -l)

if [ "$PROJECT_ID_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ Found $PROJECT_ID_COUNT references to project ID${NC}"
    echo "    Run: grep -r 'vatgianzotsurljznsry' --exclude-dir=node_modules ."
    echo "    Replace with: YOUR_PROJECT_ID or your-project-id"
    SENSITIVE_FOUND=1
else
    echo -e "${GREEN}  ✓ No project ID references found${NC}"
fi

# Check for JWT tokens
echo "  Checking for JWT tokens..."
JWT_COUNT=$(grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  "$PROJECT_ROOT/src" 2>/dev/null | \
  wc -l)

if [ "$JWT_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ Found $JWT_COUNT hardcoded JWT tokens${NC}"
    SENSITIVE_FOUND=1
else
    echo -e "${GREEN}  ✓ No hardcoded JWT tokens found${NC}"
fi

echo ""

# Step 6: Git commit
echo -e "${BLUE}Step 6: Committing changes${NC}"
echo "---------------------------"

git add .gitignore
git add .env.example
[ -f "$UPLOAD_FILE" ] && git add "$UPLOAD_FILE"
[ -f "$CLIENT_FILE" ] && git add "$CLIENT_FILE"

git commit -m "security: prepare repository for open source

- Remove .env and supabase/config.toml from tracking
- Remove hardcoded credentials from source code
- Update .gitignore with security patterns
- Update .env.example with safe placeholders
- Add validation for required environment variables

IMPORTANT: Rotate credentials before making repo public!" || echo "Nothing to commit"

echo ""

# Summary
echo -e "${BLUE}Summary${NC}"
echo "======="
echo ""

if [ "$SENSITIVE_FOUND" -eq 0 ]; then
    echo -e "${GREEN}✅ Repository is ready for open source!${NC}"
else
    echo -e "${YELLOW}⚠️  Manual review needed${NC}"
    echo ""
    echo "Additional steps required:"
    echo "  1. Search and replace project ID with placeholders"
    echo "  2. Review any remaining hardcoded values"
    echo "  3. Run: ./scripts/security-audit.sh"
fi

echo ""
echo "Next steps:"
echo "  1. Review changes: git diff HEAD~1"
echo "  2. Test locally: npm run dev"
echo "  3. Clean git history (optional): See OPEN_SOURCE_SECURITY_GUIDE.md"
echo "  4. Rotate Supabase credentials"
echo "  5. Push to GitHub: git push"
echo ""
echo "⚠️  IMPORTANT: Before making repo public:"
echo "  - Read: OPEN_SOURCE_SECURITY_GUIDE.md"
echo "  - Run: ./scripts/security-audit.sh"
echo "  - Rotate: All Supabase credentials"
echo ""
