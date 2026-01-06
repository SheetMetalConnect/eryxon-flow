#!/bin/bash
# Security audit script - scan for exposed credentials and sensitive data
# Run this before making repository public

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Security Audit${NC}"
echo "================="
echo ""

ISSUES_FOUND=0

# Check 1: Tracked sensitive files
echo -e "${BLUE}[1/8] Checking for tracked sensitive files...${NC}"
TRACKED_SENSITIVE=$(git ls-files | grep -E "^\.env$|^supabase/config\.toml$|\.pem$|\.key$|secrets|credentials" || true)
if [ -n "$TRACKED_SENSITIVE" ]; then
    echo -e "${RED}  ✗ FAIL: Sensitive files are tracked in git${NC}"
    echo "$TRACKED_SENSITIVE" | while read file; do
        echo "    - $file"
    done
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}  ✓ PASS: No sensitive files tracked${NC}"
fi
echo ""

# Check 2: .env in git history
echo -e "${BLUE}[2/8] Checking git history for .env...${NC}"
if git log --all --full-history --pretty=format:"%H" -- .env | head -1 | grep -q .; then
    COMMIT_COUNT=$(git log --all --full-history --oneline -- .env | wc -l)
    echo -e "${YELLOW}  ⚠ WARNING: .env found in git history ($COMMIT_COUNT commits)${NC}"
    echo "    Recommendation: Clean git history before open sourcing"
    echo "    See: OPEN_SOURCE_SECURITY_GUIDE.md"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}  ✓ PASS: .env not in git history${NC}"
fi
echo ""

# Check 3: Hardcoded JWT tokens
echo -e "${BLUE}[3/8] Scanning for hardcoded JWT tokens...${NC}"
JWT_FILES=$(grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\\.eyJ" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.jsx" \
  "$PROJECT_ROOT/src" 2>/dev/null || true)

if [ -n "$JWT_FILES" ]; then
    echo -e "${RED}  ✗ FAIL: Hardcoded JWT tokens found${NC}"
    echo "$JWT_FILES" | head -5 | while read line; do
        echo "    $line"
    done
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}  ✓ PASS: No hardcoded JWT tokens${NC}"
fi
echo ""

# Check 4: Project ID references
echo -e "${BLUE}[4/8] Checking for hardcoded project IDs...${NC}"
PROJECT_ID_REFS=$(grep -r "vatgianzotsurljznsry\|\.supabase\.co" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.md" \
  "$PROJECT_ROOT" 2>/dev/null | \
  grep -v "node_modules" | \
  grep -v ".git" | \
  grep -v "security-audit.sh" | \
  grep -v "prepare-for-open-source.sh" | \
  grep -v ".env.example" | \
  grep -v "OPEN_SOURCE_SECURITY_GUIDE.md" || true)

if [ -n "$PROJECT_ID_REFS" ]; then
    REF_COUNT=$(echo "$PROJECT_ID_REFS" | wc -l)
    echo -e "${YELLOW}  ⚠ WARNING: Found $REF_COUNT references to specific project${NC}"
    echo "    Replace with placeholders before open sourcing"
    echo "$PROJECT_ID_REFS" | head -5 | while read line; do
        echo "    $line"
    done
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}  ✓ PASS: No hardcoded project references${NC}"
fi
echo ""

# Check 5: Sensitive patterns in code
echo -e "${BLUE}[5/8] Scanning for other sensitive patterns...${NC}"
SENSITIVE=$(grep -r "password\s*=\s*['\"].\|api.key\s*=\s*['\"].\|secret\s*=\s*['\"]." \
  --include="*.ts" \
  --include="*.js" \
  "$PROJECT_ROOT/src" 2>/dev/null | \
  grep -v "placeholder\|example\|your-\|INSERT" || true)

if [ -n "$SENSITIVE" ]; then
    echo -e "${YELLOW}  ⚠ WARNING: Potential secrets in code${NC}"
    echo "$SENSITIVE" | head -3 | while read line; do
        echo "    $line"
    done
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}  ✓ PASS: No obvious secrets in code${NC}"
fi
echo ""

# Check 6: .gitignore configuration
echo -e "${BLUE}[6/8] Verifying .gitignore...${NC}"
GITIGNORE_OK=1

if ! grep -q "^\.env$" "$PROJECT_ROOT/.gitignore"; then
    echo -e "${RED}  ✗ .env not in .gitignore${NC}"
    GITIGNORE_OK=0
fi

if ! grep -q "supabase/config.toml" "$PROJECT_ROOT/.gitignore"; then
    echo -e "${RED}  ✗ supabase/config.toml not in .gitignore${NC}"
    GITIGNORE_OK=0
fi

if [ $GITIGNORE_OK -eq 1 ]; then
    echo -e "${GREEN}  ✓ PASS: .gitignore properly configured${NC}"
else
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

# Check 7: GitHub workflows
echo -e "${BLUE}[7/8] Checking GitHub workflows...${NC}"
if [ -d "$PROJECT_ROOT/.github/workflows" ]; then
    WORKFLOW_SECRETS=$(grep -r "VITE_SUPABASE\|SUPABASE" "$PROJECT_ROOT/.github/workflows" | grep -v "\${{ secrets\." || true)
    if [ -n "$WORKFLOW_SECRETS" ]; then
        echo -e "${YELLOW}  ⚠ WARNING: Potential hardcoded secrets in workflows${NC}"
        echo "$WORKFLOW_SECRETS"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}  ✓ PASS: Workflows use GitHub secrets${NC}"
    fi
else
    echo -e "${BLUE}  ℹ INFO: No GitHub workflows found${NC}"
fi
echo ""

# Check 8: .env.example
echo -e "${BLUE}[8/8] Verifying .env.example...${NC}"
if [ -f "$PROJECT_ROOT/.env.example" ]; then
    if grep -q "eyJ\|vatgianzotsurljznsry" "$PROJECT_ROOT/.env.example"; then
        echo -e "${RED}  ✗ FAIL: .env.example contains real credentials${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}  ✓ PASS: .env.example uses placeholders${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠ WARNING: .env.example not found${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

# Summary
echo "=========================================="
echo ""

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ Security Audit PASSED${NC}"
    echo ""
    echo "Repository appears ready for open sourcing!"
    echo ""
    echo "Final checklist:"
    echo "  [ ] Review OPEN_SOURCE_SECURITY_GUIDE.md"
    echo "  [ ] Rotate Supabase credentials"
    echo "  [ ] Test with fresh .env from .env.example"
    echo "  [ ] Consider cleaning git history"
    exit 0
else
    echo -e "${RED}❌ Security Audit FAILED${NC}"
    echo ""
    echo "Found $ISSUES_FOUND issue(s)"
    echo ""
    echo "Required actions:"
    echo "  1. Run: ./scripts/prepare-for-open-source.sh"
    echo "  2. Read: OPEN_SOURCE_SECURITY_GUIDE.md"
    echo "  3. Fix all issues above"
    echo "  4. Run this audit again"
    exit 1
fi
