#!/bin/bash
# Consolidate all Supabase migrations into a single file for easy deployment
# This helps with migrating to a new Supabase project

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations/archive"
OUTPUT_FILE="$PROJECT_ROOT/supabase/consolidated-schema.sql"

echo "🔄 Consolidating Supabase Migrations"
echo "===================================="
echo ""

# Count migration files
MIGRATION_COUNT=$(find "$MIGRATIONS_DIR" -name "*.sql" | wc -l)
echo "Found $MIGRATION_COUNT migration files"
echo ""

# Create header
cat > "$OUTPUT_FILE" << 'EOF'
-- ============================================================================
-- Eryxon Flow - Consolidated Database Schema
-- ============================================================================
-- This file consolidates all migrations for easy deployment to new Supabase projects
-- Generated: $(date)
--
-- To apply this schema:
-- 1. Create a new Supabase project
-- 2. Go to SQL Editor in Supabase Dashboard
-- 3. Copy and paste this entire file
-- 4. Execute
--
-- Or use Supabase CLI:
-- psql -h db.xxx.supabase.co -U postgres -d postgres -f consolidated-schema.sql
-- ============================================================================

-- Ensure we're starting clean
BEGIN;

EOF

# Add each migration file in chronological order
echo "Consolidating migrations..."
find "$MIGRATIONS_DIR" -name "*.sql" | sort | while read -r migration_file; do
    filename=$(basename "$migration_file")
    echo "  + $filename"

    echo "" >> "$OUTPUT_FILE"
    echo "-- ============================================================================" >> "$OUTPUT_FILE"
    echo "-- Migration: $filename" >> "$OUTPUT_FILE"
    echo "-- ============================================================================" >> "$OUTPUT_FILE"
    cat "$migration_file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

# Add footer
cat >> "$OUTPUT_FILE" << 'EOF'

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMIT;

-- Verify critical tables exist
DO $$
DECLARE
    missing_tables TEXT[];
    critical_tables TEXT[] := ARRAY[
        'tenants', 'profiles', 'subscriptions',
        'jobs', 'parts', 'operations',
        'cells', 'resources', 'materials',
        'time_entries', 'issues', 'shipments'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY critical_tables LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
            missing_tables := array_append(missing_tables, tbl);
        END IF;
    END LOOP;

    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Migration incomplete! Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All critical tables created successfully!';
    END IF;
END $$;

EOF

echo ""
echo "✅ Consolidation complete!"
echo ""
echo "Output file: $OUTPUT_FILE"
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo ""
echo "📋 Next steps:"
echo "1. Create a new Supabase project"
echo "2. Copy the content of consolidated-schema.sql"
echo "3. Paste into Supabase SQL Editor"
echo "4. Execute the SQL"
echo ""
echo "Or use Supabase CLI:"
echo "  supabase db push"
echo ""
