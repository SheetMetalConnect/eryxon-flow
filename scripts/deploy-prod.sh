#!/bin/bash
# Trigger Production Release
# Validates locally and then triggers the GitHub Action

echo "🚀 Eryxon Flow Production Release"
echo "================================="

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) could not be found."
    echo "   Please install it: brew install gh"
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo "❌ You are not logged in to GitHub CLI."
    echo "   Run: gh auth login"
    exit 1
fi

echo "✅ Environment checks passed."
echo ""

# Confirm
read -p "⚠️  Are you sure you want to deploy to PRODUCTION (Hetzner)? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

echo "Select migration option:"
echo "1) Quick Release (NO migrations)"
echo "2) Full Release (WITH migrations)"
read -p "Enter choice [1]: " choice
choice=${choice:-1}

if [ "$choice" == "2" ]; then
    RUN_MIGRATIONS="true"
    echo "Checking for pending migrations..."
    # Optional: could run supabase db diff here to show them what will happen
else
    RUN_MIGRATIONS="false"
fi

echo ""
echo "🚀 Triggering GitHub Action..."
echo "   - Migrations: $RUN_MIGRATIONS"
echo "   - Edge Functions: true"

gh workflow run release.yml \
  -f run_migrations=$RUN_MIGRATIONS \
  -f deploy_functions=true

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Release triggered successfully!"
    echo "   Track progress here:"
    echo "   https://github.com/sheetmetalconnect/eryxon-flow/actions/workflows/release.yml"
else
    echo ""
    echo "❌ Failed to trigger workflow."
fi
