# Supabase Migrations List

This document lists all Supabase migration files in the repository as of 2025-11-17.

## Migration Files (Chronological Order)

### 1. Initial Schema Setup
**File:** `supabase/migrations/20251109191500_c0fc1063-1207-4d07-aefb-f25754cca416.sql`
**Date:** 2025-11-09 19:15:00

**Description:**
Initial database schema setup including:
- UUID extension
- Enums: `app_role`, `task_status`, `job_status`, `issue_severity`, `issue_status`, `assignment_status`
- Core tables:
  - `profiles` (extends auth.users)
  - `stages` (later renamed to cells)
  - `jobs`
  - `parts`
  - `tasks` (later renamed to operations)
  - `time_entries`
  - `issues`
  - `assignments`
- Security functions: `get_user_tenant_id()`, `get_user_role()`
- Row Level Security (RLS) policies for all tables
- Trigger: `handle_new_user()` for new user registration
- Realtime publications for: tasks, time_entries, issues, parts, jobs
- Comprehensive indexes

---

### 2. Seed Data Cleanup
**File:** `supabase/migrations/20251109192458_ce40a93c-12e0-4e8c-b9f9-6218aba01d42.sql`
**Date:** 2025-11-09 19:24:58

**Description:**
Removes placeholder profiles with demo tenant ID. Includes instructions for connecting new users to seed data.

---

### 3. Username Constraint Fix
**File:** `supabase/migrations/20251109192725_c2747409-aa27-4c9b-939d-5c6aaedfc71c.sql`
**Date:** 2025-11-09 19:27:25

**Description:**
Updates username uniqueness constraint:
- Drops global unique constraint on username
- Adds composite unique constraint on `(tenant_id, username)`
- Allows multiple tenants to use same usernames

---

### 4. API Keys and Webhooks
**File:** `supabase/migrations/20251110123752_2ca081b0-6e82-42c1-9114-8b0777450b41.sql`
**Date:** 2025-11-10 12:37:52

**Description:**
Adds API integration features:
- `api_keys` table with key hash and prefix storage
- `webhooks` table for webhook configurations
- `webhook_logs` table for tracking webhook deliveries
- RLS policies restricting access to admins only
- Performance indexes

---

### 5. Terminology Update and Substeps
**File:** `supabase/migrations/20251112203610_003b74a8-bd56-47a0-b2c4-9aa08919e5b3.sql`
**Date:** 2025-11-12 20:36:10

**Description:**
Major schema refactoring:
- Renames `stages` → `cells`
- Renames `tasks` → `operations`
- Updates all foreign key references:
  - `current_stage_id` → `current_cell_id`
  - `stage_id` → `cell_id`
  - `task_id` → `operation_id`
  - `task_name` → `operation_name`
- Creates `substeps` table for operation breakdown
- Adds RLS policies for substeps
- Creates new indexes for renamed tables

---

### 6. Data Reset
**File:** `supabase/migrations/20251112211221_54c59dcf-3740-4ee3-a622-9ed4ab166e06.sql`
**Date:** 2025-11-12 21:12:21

**Description:**
Clears all data from tables while preserving schema:
- Deletes data from: webhook_logs, time_entries, substeps, issues, assignments, operations, parts, jobs, webhooks, api_keys, cells
- Preserves profiles table to keep tenant information

---

### 7. Realtime Publications Update
**File:** `supabase/migrations/20251112230000_update_realtime_publications.sql`
**Date:** 2025-11-12 23:00:00

**Description:**
Updates realtime publications for renamed tables:
- Removes `tasks` from realtime
- Adds `operations` to realtime
- Re-adds `cells` to realtime

---

### 8. CAD File Storage
**File:** `supabase/migrations/20251113061547_99ea6f9d-365a-4aa6-b608-a2aa94fc3e15.sql`
**Date:** 2025-11-13 06:15:47

**Description:**
Creates storage infrastructure for CAD/STEP files:
- Creates `parts-cad` storage bucket (private)
- RLS policies for tenant-isolated file operations:
  - Upload files to tenant folder
  - View files from tenant folder
  - Delete files from tenant folder

---

### 9. Time Entry Pause Functionality
**File:** `supabase/migrations/20251117000000_add_pause_functionality.sql`
**Date:** 2025-11-17 00:00:00

**Description:**
Adds pause/resume capability for time tracking:
- Creates `time_entry_pauses` table with:
  - `paused_at`, `resumed_at` timestamps
  - `duration` calculation
- Adds `is_paused` boolean flag to `time_entries` table
- RLS policies for operators to manage their own pauses
- Performance indexes for pause lookups

---

### 10. Materials Management
**File:** `supabase/migrations/20251117153200_add_materials_table.sql`
**Date:** 2025-11-17 15:32:00

**Description:**
Creates materials management system:
- `materials` table with fields:
  - `name`, `description`, `color`
  - `active` flag
  - Unique constraint on `(tenant_id, name)`
- RLS policies for viewing (all users) and managing (admins only)
- Migrates existing materials from `parts` table
- Auto-update trigger for `updated_at`
- Note: Uses incorrect foreign key reference (should be `profiles.tenant_id` not `auth.users.id`)

---

### 11. Resources System
**File:** `supabase/migrations/20251117153634_add_resources_system.sql`
**Date:** 2025-11-17 15:36:34

**Description:**
Creates reusable resources management system:
- `resources` table for tooling, fixtures, molds, etc.:
  - `type`, `identifier`, `location`, `status`
  - JSONB `metadata` for custom fields
  - Unique constraint on `(tenant_id, name)`
- `operation_resources` junction table linking operations to resources:
  - `quantity` and `notes` fields
  - Unique constraint on `(operation_id, resource_id)`
- RLS policies for tenant isolation
- Comprehensive indexes for lookups
- Auto-update trigger for `updated_at`
- Note: Uses incorrect foreign key reference (should be `profiles.tenant_id` not `auth.users.id`)

---

## Summary Statistics

- **Total Migrations:** 11
- **Date Range:** 2025-11-09 to 2025-11-17
- **Core Tables:** profiles, cells, jobs, parts, operations, time_entries, issues, assignments, substeps, api_keys, webhooks, webhook_logs, materials, resources, operation_resources, time_entry_pauses
- **Storage Buckets:** parts-cad

## Known Issues

1. **Migrations 10 & 11:** Incorrect foreign key references
   - `materials.tenant_id` and `resources.tenant_id` reference `auth.users(id)`
   - Should reference `profiles.tenant_id` or use UUID type without foreign key

## Migration Order Dependencies

These migrations must be run in chronological order due to dependencies:
- Migration 5 depends on 1 (renames tables)
- Migration 6 depends on 5 (deletes from renamed tables)
- Migration 7 depends on 5 (updates realtime for renamed tables)
- Migration 9 depends on 1 (adds to time_entries)
- Migration 11 depends on 5 (references operations table)

## File Paths

All migration files are located in: `/home/user/eryxon-flow/supabase/migrations/`
