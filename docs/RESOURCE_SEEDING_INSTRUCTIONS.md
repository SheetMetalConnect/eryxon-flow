# Resource Linking System - Setup Instructions

## Overview
This PR implements comprehensive resource linking functionality with visual indicators throughout the UI.

## Changes Made

### 1. Database Migration - Seed Data
**File:** `supabase/migrations/20251122000000_seed_resources_data.sql`

This migration creates comprehensive test data including:
- **Welding Fixtures**: Heavy-duty and precision spot welding fixtures
- **Bending Molds**: V-dies and radius dies for sheet metal bending
- **Tooling**: Hydraulic punches, turret dies, laser lenses
- **Fasteners**: Aluminum rivets, hex bolts (as material resources)
- **Inspection Fixtures**: CMM inspection fixtures
- **Assembly Fixtures**: Cabinet frame assembly jigs
- **Raw Materials**: Cold rolled steel and aluminum sheets

The migration automatically:
- Creates 13 different resources with realistic metadata
- Links resources to existing operations based on operation names and cell assignments
- Matches welding resources to welding operations, bending tools to bending operations, etc.

### 2. UI Enhancements

#### Operations Admin Table (`src/pages/admin/Operations.tsx`)
- Added resource count badge with wrench icon next to operation names
- Tooltip shows all linked resource names on hover
- Visual indicator clearly shows which operations require resources

#### Part Detail Modal (`src/components/admin/PartDetailModal.tsx`)
- **Operation Creation Form**: New "Required Resources" section
  - Multi-select dropdown to add resources
  - For each selected resource:
    - Adjustable quantity
    - Optional special instructions
    - Visual display with type badges
    - Easy removal
- **Operations List**: Resource count badges on operations with linked resources

#### Operator Terminal (`src/components/operator/OperationDetailModal.tsx`)
- Already shows comprehensive resource information (no changes needed)
- Displays resource name, type, status, location, quantity, and metadata

## Running the Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/vatgianzotsurljznsry
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/migrations/20251122000000_seed_resources_data.sql`
4. Paste into the SQL editor and run

### Option 2: Supabase CLI
If you have the Supabase CLI installed:
```bash
supabase db push
```

### Option 3: Direct SQL Execution
If you have direct database access:
```bash
psql -h <your-db-host> -U postgres -d postgres -f supabase/migrations/20251122000000_seed_resources_data.sql
```

## Testing the Feature

After running the migration:

1. **View Resources**
   - Go to Admin → Resources
   - You should see 13 new resources of various types
   - Each has realistic metadata (molds with cavities/tonnage, tooling with lifecycle info, etc.)

2. **View Linked Operations**
   - Go to Admin → Operations
   - Operations with linked resources will show a badge with wrench icon and count
   - Hover over the badge to see resource names

3. **Create New Operation with Resources**
   - Go to Admin → Parts
   - Click on any part
   - Click "Add Operation"
   - Fill in operation details
   - In the "Required Resources" section:
     - Select resources from the dropdown
     - Set quantities and instructions
     - Save the operation
   - The new operation will show resource count badge

4. **Operator View**
   - Go to Operator Terminal
   - Start any operation that has linked resources
   - View the "Required Resources" section showing:
     - Resource details, status, location
     - Quantity needed
     - Special instructions
     - Resource metadata (calibration dates, part numbers, etc.)

## Visual Indicators Summary

| Location | Indicator | Purpose |
|----------|-----------|---------|
| Admin Operations Table | Wrench badge + count | Shows operation has resources |
| Admin Operations Table | Tooltip on hover | Lists all resource names |
| Part Detail Modal - Operations List | Wrench badge + count | Shows operation has resources |
| Part Detail Modal - Add Operation Form | Resource selector UI | Link resources when creating |
| Operator Terminal | Full resource section | Detailed resource information for operators |

## Resource Types & Icons

- **Tooling** (🔧 Wrench): Punches, dies, cutting tools
- **Fixture** (⚙️ Settings): Welding, assembly, inspection fixtures
- **Mold** (📦 Package): Bending dies, injection molds
- **Material** (📚 Layers): Raw materials, fasteners, consumables
- **Other** (❓ Other): Miscellaneous resources

## Metadata Examples

Resources include rich metadata for different types:

**Welding Fixtures:**
- Capacity, setup time, calibration dates, location, notes

**Molds:**
- Mold ID, cavities, tonnage, setup/cycle times, temperature, pressure

**Tooling:**
- Tool type, diameter, coating, life expectancy, current uses, maintenance due

**Materials:**
- Grade, dimensions, weight, finish, supplier, lot number, certifications

## Notes

- All resources are tenant-scoped (multi-tenant safe)
- The migration is idempotent - safe to run multiple times (uses ON CONFLICT DO NOTHING)
- Resource linking is optional - operations can exist without resources
- RLS policies ensure proper access control
- The seed data intelligently matches resources to operations based on operation names and cell types
