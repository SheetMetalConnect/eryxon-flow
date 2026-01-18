#!/bin/bash
# Clean .env and config.toml from git history
# WARNING: This rewrites git history!

set -e

echo "🧹 Git History Cleanup"
echo "====================="
echo ""
echo "⚠️  WARNING: This will rewrite git history!"
echo ""
echo "This removes from ALL commits:"
echo "  - .env"
echo "  - supabase/config.toml"
echo ""
echo "After running:"
echo "  - All contributors must re-clone"
echo "  - Force push required"
echo "  - Cannot be undone easily"
echo ""
read -p "Are you SURE? (type 'yes' to continue): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Checking for git-filter-repo..."

if ! command -v git-filter-repo &> /dev/null; then
    echo "❌ git-filter-repo not found"
    echo ""
    echo "Install it:"
    echo "  pip install git-filter-repo"
    echo ""
    echo "Or on macOS:"
    echo "  brew install git-filter-repo"
    echo ""
    exit 1
fi

echo "✓ git-filter-repo found"
echo ""

# Backup current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# Create backup tag
BACKUP_TAG="backup-before-history-clean-$(date +%Y%m%d-%H%M%S)"
echo "Creating backup tag: $BACKUP_TAG"
git tag "$BACKUP_TAG"
echo "✓ Backup tag created"
echo ""

# Remove .env from history
echo "Removing .env from git history..."
git filter-repo --invert-paths --path .env --force
echo "✓ .env removed from history"
echo ""

# Remove config.toml from history
echo "Removing supabase/config.toml from git history..."
git filter-repo --invert-paths --path supabase/config.toml --force
echo "✓ supabase/config.toml removed from history"
echo ""

echo "✅ Git history cleaned!"
echo ""
echo "Next steps:"
echo ""
echo "1. Verify the cleanup:"
echo "   git log --all --full-history -- .env"
echo "   (should show nothing)"
echo ""
echo "2. Force push to remote:"
echo "   git push --force --all"
echo "   git push --force --tags"
echo ""
echo "3. Notify all contributors to re-clone:"
echo "   git clone <repo-url>"
echo ""
echo "4. If something went wrong, restore from backup:"
echo "   git reset --hard $BACKUP_TAG"
echo ""
