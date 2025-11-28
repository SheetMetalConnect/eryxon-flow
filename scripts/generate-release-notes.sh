#!/bin/bash
# generate-release-notes.sh
# Generates release notes from merged PRs and updates releases.json
# Usage: ./scripts/generate-release-notes.sh <version>

set -e

VERSION="${1:-}"
RELEASES_FILE="public/releases.json"

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 1.0.0"
  exit 1
fi

# Get the current date
DATE=$(date -u +"%Y-%m-%d")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Get the short SHA of HEAD
SHA=$(git rev-parse --short HEAD)

# Find the previous release tag (if any)
PREV_TAG=$(git tag --list 'v*' --sort=-version:refname | head -n 1 || echo "")

echo "Generating release notes for v$VERSION"
echo "Previous tag: ${PREV_TAG:-none}"
echo "Current SHA: $SHA"

# Get PR titles from merge commits since last tag
# This looks for commits with "Merge pull request" or PR number patterns
if [ -n "$PREV_TAG" ]; then
  # Get commits since last tag
  COMMITS=$(git log "$PREV_TAG"..HEAD --oneline --merges 2>/dev/null || git log --oneline --merges -20)
else
  # Get recent merge commits if no previous tag
  COMMITS=$(git log --oneline --merges -20)
fi

# Extract PR titles from merge commits
# Format: "Merge pull request #123 from user/branch" followed by PR title
CHANGES=()

while IFS= read -r line; do
  # Skip empty lines
  [ -z "$line" ] && continue

  # Try to extract PR number and get the PR title from commit message
  if [[ "$line" =~ Merge\ pull\ request\ \#([0-9]+) ]]; then
    PR_NUM="${BASH_REMATCH[1]}"
    # Get the full commit message which contains the PR title
    SHA_FULL=$(echo "$line" | cut -d' ' -f1)
    PR_TITLE=$(git log -1 --format=%b "$SHA_FULL" | head -n 1)
    if [ -n "$PR_TITLE" ]; then
      CHANGES+=("$PR_TITLE")
    fi
  else
    # For non-PR merges, use the commit subject (removing SHA prefix)
    SUBJECT=$(echo "$line" | cut -d' ' -f2-)
    # Skip if it's just a merge commit without meaningful title
    if [[ ! "$SUBJECT" =~ ^Merge ]]; then
      CHANGES+=("$SUBJECT")
    fi
  fi
done <<< "$COMMITS"

# If no changes found from merges, get recent non-merge commits
if [ ${#CHANGES[@]} -eq 0 ]; then
  echo "No merge commits found, using recent commits..."
  if [ -n "$PREV_TAG" ]; then
    RECENT=$(git log "$PREV_TAG"..HEAD --oneline --no-merges -10)
  else
    RECENT=$(git log --oneline --no-merges -10)
  fi

  while IFS= read -r line; do
    [ -z "$line" ] && continue
    SUBJECT=$(echo "$line" | cut -d' ' -f2-)
    # Skip automated commits
    if [[ ! "$SUBJECT" =~ ^(chore:|Merge|Auto-generated) ]]; then
      CHANGES+=("$SUBJECT")
    fi
  done <<< "$RECENT"
fi

# Build the changes JSON array
CHANGES_JSON="["
FIRST=true
for change in "${CHANGES[@]}"; do
  # Escape quotes and special characters for JSON
  ESCAPED=$(echo "$change" | sed 's/"/\\"/g' | sed 's/\\/\\\\/g')
  if [ "$FIRST" = true ]; then
    CHANGES_JSON+="\"$ESCAPED\""
    FIRST=false
  else
    CHANGES_JSON+=",\"$ESCAPED\""
  fi
done
CHANGES_JSON+="]"

# If still no changes, add a default message
if [ "$CHANGES_JSON" = "[]" ]; then
  CHANGES_JSON='["Various improvements and bug fixes"]'
fi

echo "Changes found: ${#CHANGES[@]}"

# Create new release entry
NEW_RELEASE=$(cat <<EOF
{
  "version": "$VERSION",
  "date": "$DATE",
  "sha": "$SHA",
  "changes": $CHANGES_JSON
}
EOF
)

# Check if releases.json exists
if [ -f "$RELEASES_FILE" ]; then
  # Read existing releases and prepend new release
  # Using node since it's available in CI and handles JSON properly
  node -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('$RELEASES_FILE', 'utf8'));
    const newRelease = $NEW_RELEASE;

    // Check if this version already exists, update if so
    const existingIndex = data.releases.findIndex(r => r.version === newRelease.version);
    if (existingIndex >= 0) {
      data.releases[existingIndex] = newRelease;
    } else {
      data.releases.unshift(newRelease);
    }

    // Keep only last 20 releases
    data.releases = data.releases.slice(0, 20);
    data.lastUpdated = '$TIMESTAMP';

    fs.writeFileSync('$RELEASES_FILE', JSON.stringify(data, null, 2));
    console.log('Updated $RELEASES_FILE');
  "
else
  # Create new file
  node -e "
    const fs = require('fs');
    const data = {
      releases: [$NEW_RELEASE],
      lastUpdated: '$TIMESTAMP'
    };
    fs.writeFileSync('$RELEASES_FILE', JSON.stringify(data, null, 2));
    console.log('Created $RELEASES_FILE');
  "
fi

echo "Release notes generated successfully for v$VERSION"
