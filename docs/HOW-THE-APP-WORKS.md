# How Eryxon Flow Works: Complete Functional Guide

**Version:** 1.2
**Last Updated:** November 22, 2025
**Status:** Active

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [User Roles & Access](#user-roles--access)
4. [Core Workflows](#core-workflows)
5. [Manufacturing Job Lifecycle](#manufacturing-job-lifecycle)
6. [Parts Management](#parts-management)
7. [Operations & Time Tracking](#operations--time-tracking)
8. [Issue Management](#issue-management)
9. [Assembly Management](#assembly-management)
10. [Resource Management](#resource-management)
11. [QRM Capacity Management](#qrm-capacity-management) **NEW**
12. [Production Quantity & Scrap Tracking](#production-quantity--scrap-tracking) **NEW**
13. [Substeps & Templates](#substeps--templates) **NEW**
14. [Operator Terminal](#operator-terminal) **NEW**
15. [System Configuration](#system-configuration)
16. [API Integration](#api-integration)
17. [Data Export](#data-export)
18. [3D CAD Viewer](#3d-cad-viewer)
19. [Real-Time Features](#real-time-features)
20. [Subscription Plans](#subscription-plans)
21. [Technical Architecture](#technical-architecture)

---

## Introduction

**Eryxon Flow** is a comprehensive manufacturing execution system (MES) designed specifically for sheet metal fabrication operations. It provides end-to-end tracking from job creation through production completion, with real-time visibility, time tracking, issue management, and integration capabilities.

### What Does Eryxon Flow Do?

The system tracks manufacturing work through three hierarchical levels:

1. **Jobs** - Customer orders or manufacturing projects
2. **Parts** - Individual components within jobs (can be assemblies or components)
3. **Operations** - Specific tasks performed on parts (cutting, bending, welding, etc.)

### Key Value Propositions

- **Real-time visibility** - Know what's happening on the shop floor right now
- **Accurate time tracking** - Capture actual vs. estimated times for costing and planning
- **Quality management** - Report and resolve production issues quickly
- **Data-driven decisions** - Export data for analysis and continuous improvement
- **API integration** - Connect with ERP, accounting, and other systems
- **Mobile-optimized** - Operators work from tablets on the shop floor

---

## System Overview

### Technology Stack

- **Frontend:** React 18 + TypeScript + Material UI v7
- **Backend:** Supabase (PostgreSQL database, Edge Functions)
- **Authentication:** Supabase Auth with JWT tokens
- **3D Viewer:** Three.js + occt-import-js for STEP files
- **API:** RESTful Edge Functions with API key authentication
- **Real-time:** Supabase Realtime for live updates

### Architecture Pattern

- **Multi-tenant:** Complete tenant isolation at database and application level
- **Role-based access:** Admin and Operator roles with different permissions
- **Progressive Web App:** Mobile-responsive, can be installed as PWA
- **Offline-capable:** Core features work without internet (future enhancement)

### Data Model Hierarchy

```
Tenant
├── Jobs
│   ├── Parts
│   │   ├── Operations
│   │   │   ├── Time Entries
│   │   │   ├── Substeps
│   │   │   ├── Issues
│   │   │   └── Resources
│   │   └── (Child Parts - assemblies)
│   └── Assignments
├── Cells (Workflow Stages)
├── Materials
├── Resources
├── Users (Profiles)
├── API Keys
└── Webhooks
```

---

## User Roles & Access

### 1. Admin Role

**Full System Access** - Can do everything operators can do, plus:

**Capabilities:**
- Create and manage jobs, parts, operations
- Configure workflow cells (stages)
- Manage materials catalog
- Manage resources (tools, fixtures, molds)
- Manage users and permissions
- View all operations across all operators
- Assign work to operators
- Review and resolve issues
- Generate API keys
- Configure webhooks
- Export data
- View subscription and usage

**Primary Interface:** Desktop/laptop browser
**Main Dashboard:** `/dashboard` - overview with KPIs and active work

### 2. Operator Role

**Production Floor Access** - Focused on executing work:

**Capabilities:**
- View assigned operations
- Start/stop/pause time tracking
- View part details and CAD files
- Report production issues
- View their activity history
- Complete operations

**Primary Interface:** Tablet on the shop floor
**Main Dashboard:** `/work-queue` - operations waiting to be done

**Restrictions:**
- Cannot create jobs or parts
- Cannot configure system settings
- Cannot manage users
- Cannot access admin configuration

### 3. Machine Accounts (Special)

**API-only Access** - For integrations:

**Capabilities:**
- API access only (no UI login)
- Same permissions as admin via API
- Used for ERP integrations, automation scripts

**Configuration:** Set `is_machine: true` on profile

---

## Core Workflows

### Operator Daily Workflow

```
1. Login → Work Queue
2. View operations assigned to me
3. Click operation → Open detail modal
4. Click "Start Timing" → Begin time entry
5. Work on the operation...
6. (Optional) Report issue if problems arise
7. Click "Stop Timing" → Close time entry
8. Mark operation complete
9. Move to next operation
10. End of day: Review "My Activity"
```

**Key Pages:**
- `/work-queue` - Main page, 90% of time spent here
- `/my-activity` - Time tracking history
- `/my-issues` - Issues I've reported

### Admin Daily Workflow

```
1. Login → Dashboard
2. Review KPIs and active work
3. Check pending issues → Approve/resolve
4. Assign new work to operators
5. (Weekly) Create new jobs for upcoming work
6. (As needed) Configure system settings
7. (Monthly) Review usage and plan limits
```

**Key Pages:**
- `/dashboard` - Overview and metrics
- `/admin/jobs` - Job management
- `/admin/issues` - Issue queue
- `/admin/assignments` - Work assignments
- `/admin/config/*` - System configuration

---

## Manufacturing Job Lifecycle

### Phase 1: Job Creation

**Process:** `/admin/jobs/new` (Admin only)

**Steps:**

1. **Job Details**
   - Job number (unique identifier)
   - Customer name
   - Due date
   - Notes
   - Custom metadata (JSON)

2. **Add Parts**
   - Part number (unique within job)
   - Material (from catalog)
   - Quantity
   - Parent part (if component of assembly)
   - Upload images/drawings

3. **Add Operations to Each Part**
   - Operation name (e.g., "Laser Cut", "Bend 90°")
   - Cell/stage (from configured cells)
   - Estimated time (minutes)
   - Sequence order
   - Notes

4. **Submit**
   - Creates job, parts, operations atomically
   - All start with status: `not_started`
   - Triggers `job.created` webhook (if configured)

**Database Impact:**
```sql
INSERT INTO jobs (job_number, customer, due_date, ...)
INSERT INTO parts (part_number, material, job_id, ...)
INSERT INTO operations (operation_name, part_id, cell_id, estimated_time, ...)
```

### Phase 2: Work Assignment

**Process:** `/admin/assignments` (Admin only)

**Admin assigns parts to operators:**

1. Select part from dropdown
2. Select operator
3. Click "Assign"
4. Operator now sees this part's operations in their Work Queue

**Database Impact:**
```sql
INSERT INTO assignments (part_id, operator_id, assigned_by, status)
```

**Effect:**
- Operator's `/work-queue` now includes operations for assigned part
- Operations filtered to show only assigned work

### Phase 3: Production Execution

**Process:** `/work-queue` (Operator)

**Operator workflow:**

1. **View Operation**
   - Operation card shows: name, job/part, estimated time, status
   - Color-coded by cell
   - Shows if currently timing

2. **Start Work**
   - Click operation → Detail modal opens
   - Shows: part details, operation notes, CAD files (if available)
   - Click "Start Timing"
   - Timer begins, operation status → `in_progress`

3. **During Work**
   - Timer runs, shows elapsed time
   - Can pause/resume if needed (breaks, interruptions)
   - Can report issues if problems occur
   - Can view 3D CAD model
   - Can see substeps if configured

4. **Complete Work**
   - Click "Stop Timing"
   - Duration calculated (total time - pause time)
   - Operation `actual_time` updated
   - Can mark operation as complete
   - Triggers `operation.completed` webhook

**Database Impact:**
```sql
-- Start timing:
INSERT INTO time_entries (operation_id, operator_id, start_time)
UPDATE operations SET status = 'in_progress'
UPDATE parts SET status = 'in_progress', current_cell_id = <cell>
UPDATE jobs SET status = 'in_progress'

-- Stop timing:
UPDATE time_entries SET end_time = NOW(), duration = <calculated>
UPDATE operations SET actual_time = actual_time + <duration>

-- Complete:
UPDATE operations SET status = 'completed', completed_at = NOW()
-- If all ops complete:
UPDATE parts SET status = 'completed'
-- If all parts complete:
UPDATE jobs SET status = 'completed'
```

### Phase 4: Job Completion

**Automatic Cascade:**

When the last operation on a part completes:
- Part status → `completed`
- Part `current_cell_id` → NULL

When all parts in a job complete:
- Job status → `completed`

**No manual "complete job" button needed** - it's automatic based on operation completion.

### Job Statuses

| Status | Meaning | Transition |
|--------|---------|------------|
| `not_started` | Just created, no work begun | → `in_progress` when first op starts |
| `in_progress` | Active work happening | → `on_hold` if paused |
| `on_hold` | Customer pause, waiting for materials | → `in_progress` when resumed |
| `completed` | All parts and ops done | Terminal state |

---

## Parts Management

### Part Types

1. **Standalone Parts**
   - Single component
   - No parent or children
   - Most common type

2. **Assembly Parts (Parent)**
   - Contains child parts
   - `parent_part_id` is NULL
   - Has `child_parts` relationship
   - Example: "Bracket Assembly"

3. **Component Parts (Child)**
   - Part of an assembly
   - `parent_part_id` references parent
   - Example: "Left Bracket Plate" (part of Bracket Assembly)

### Assembly Validation

**Circular Reference Prevention:**
The system prevents:
- Part A → child of Part B → child of Part A (circular)
- Part self-referencing as parent
- Cross-job assemblies

**Dependency Checking:**
Before deleting a part, system checks:
- Does it have child parts? (Cannot delete if yes)
- Does it have active operations? (Warns before delete)

### Part Detail Modal

**Accessed from:** `/admin/parts` → Click part number

**Displays:**
- Part number, material, quantity
- Current status and current cell
- Assembly information (parent/children)
- Operations list with status and time tracking
- Issue badges (count and highest severity)
- Images and file attachments
- Metadata (custom fields)

**Actions:**
- View 3D CAD (if STEP file uploaded)
- View/download images and documents
- Navigate to job
- Navigate to parent/child parts

### Part Statuses

Automatically calculated based on operations:

- `not_started` - No operations started
- `in_progress` - At least one operation in progress
- `completed` - All operations completed
- `on_hold` - Job is on hold

### Current Cell Tracking

The `current_cell_id` field shows where a part currently is in the workflow:

- Updated when operator starts an operation (sets to that cell)
- Cleared when all operations complete
- Helps answer: "Where is this part right now?"

**Calculation:**
```sql
SELECT cell_id FROM operations
WHERE part_id = ? AND status = 'in_progress'
LIMIT 1
```

---

## Operations & Time Tracking

### Operation Lifecycle

```
not_started → in_progress → completed
                ↓
            (can pause)
```

### Time Tracking System

**Components:**

1. **time_entries** - Main time tracking records
   - `start_time` - When timing began
   - `end_time` - When timing stopped
   - `duration` - Calculated time (seconds)
   - `operator_id` - Who did the work
   - `operation_id` - What operation

2. **time_entry_pauses** - Pause tracking
   - `paused_at` - When paused
   - `resumed_at` - When resumed
   - `duration` - Pause duration
   - Linked to `time_entry_id`

### Starting Time Tracking

**Process:** Operator clicks "Start Timing" in Operation Detail Modal

**System Actions:**

1. Check for existing active time entry for this operator
   - If exists, stop it first (one active entry per operator)
2. Create new `time_entry` record with `start_time = NOW()`
3. Update operation status to `in_progress`
4. Update part status to `in_progress`
5. Update job status to `in_progress`
6. Set part's `current_cell_id` to operation's cell
7. Trigger `operation.started` webhook

**Code:** `lib/database.ts → startTimeTracking()`

### Pausing Time Tracking

**Process:** Operator clicks "Pause" in Currently Timing Widget

**System Actions:**

1. Create `time_entry_pauses` record with `paused_at = NOW()`
2. Update `time_entry.is_paused = true`
3. Timer UI shows "Paused" state

**Resume:** Operator clicks "Resume"
- Update pause record with `resumed_at = NOW()`
- Calculate pause duration
- Update `time_entry.is_paused = false`
- Timer UI resumes counting

### Stopping Time Tracking

**Process:** Operator clicks "Stop Timing"

**System Actions:**

1. Update `time_entry` with `end_time = NOW()`
2. Calculate total duration:
   ```
   total_duration = end_time - start_time
   pause_duration = SUM(all pauses for this entry)
   effective_duration = total_duration - pause_duration
   ```
3. Update `time_entry.duration = effective_duration`
4. Add effective duration to operation's `actual_time`
5. Update operation's `completion_percentage` if provided
6. Trigger `operation.completed` webhook (if operation marked complete)

**Code:** `lib/database.ts → stopTimeTracking()`

### Completing an Operation

**Process:** Operator clicks "Complete" or Admin marks complete

**System Actions:**

1. Set operation status to `completed`
2. Set `completed_at = NOW()`
3. Check if all operations on part are complete
   - If yes: Set part status to `completed`, clear `current_cell_id`
4. Check if all parts in job are complete
   - If yes: Set job status to `completed`

**Code:** `lib/database.ts → completeOperation()`

### Operation Detail View

**Accessed from:** Work Queue → Click operation card

**Displays:**
- Operation name, notes, sequence
- Part and job information
- Estimated vs. actual time
- Assigned operator
- Current status
- Substeps (if configured)
- Resources assigned
- Issues reported
- CAD files (with 3D viewer)

**Actions:**
- Start/stop/pause/resume timing
- Report issue
- View 3D model
- Mark complete
- View time tracking history

---

## Issue Management

### Issue Reporting (Operator)

**Process:** `/work-queue` → Operation detail → "Report Issue"

**Issue Form Fields:**
- **Severity:** low, medium, high, critical
- **Description:** Text description of the problem
- **Images:** Upload photos of the issue (optional)
- **Camera Capture:** Take photo directly (mobile)

**System Actions:**
1. Create `issues` record
2. Link to operation, part, job
3. Set `created_by` to operator
4. Set status to `pending`
5. Trigger `issue.created` webhook
6. Show issue count badge on operation card

### Issue Review (Admin)

**Process:** `/admin/issues` (Issue Queue)

**Admin sees:**
- List of all pending issues
- Sorted by severity (critical first)
- Grouped by job/part
- Issue images displayed inline

**Admin Actions:**

1. **Approve Issue**
   - Sets status to `approved`
   - Adds resolution notes
   - Sets `reviewed_at` timestamp
   - Sets `reviewed_by` to admin user

2. **Reject Issue**
   - Sets status to `rejected`
   - Adds rejection reason in notes
   - Operator can see rejection reason

3. **Close Issue**
   - Sets status to `closed`
   - Used after issue is fixed

### Issue Statuses

| Status | Meaning | Who Sets It |
|--------|---------|-------------|
| `pending` | Just reported, awaiting review | System (on create) |
| `approved` | Admin confirmed it's a valid issue | Admin |
| `rejected` | Admin determined it's not an issue | Admin |
| `closed` | Issue has been resolved | Admin |

### Issue Severity Levels

| Severity | Meaning | Example |
|----------|---------|---------|
| `low` | Minor, informational | "Small scratch on non-visible surface" |
| `medium` | Affects quality but fixable | "Dimension out of tolerance" |
| `high` | Significant problem | "Wrong material used" |
| `critical` | Stops production | "Machine broken", "Missing critical component" |

### Issue Display

**On Operation Cards:**
- Badge shows count of issues
- Color-coded by highest severity
- Click to view all issues for operation

**On Part Detail:**
- Issue badges show count
- Click to filter operations with issues

---

## Assembly Management

### Assembly Hierarchy

**Purpose:** Track complex parts made of multiple components

**Example:**
```
Bracket Assembly (parent)
├── Left Bracket Plate (child)
├── Right Bracket Plate (child)
└── Mounting Bracket (child)
```

### Creating Assemblies

**Process:** When creating parts in Job Create wizard or Parts page

**Steps:**
1. Create parent part with `parent_part_id = NULL`
2. Create child parts with `parent_part_id = <parent_id>`

**Validation:**
- Parent and child must be in same job
- Cannot create circular references
- Cannot set part as its own parent

### Assembly Tree View

**Accessed from:** Part Detail Modal → Assembly section

**Shows:**
- Parent part (if this is a component)
- Child parts (if this is an assembly)
- Nested relationships (multi-level assemblies)

**Indentation indicates depth:**
```
Assembly Level 1
  ├─ Component Level 2
  │   └─ Sub-component Level 3
  └─ Component Level 2
```

### Assembly Operations

**Each part has its own operations** - including assemblies and components.

**Example:**
- Parent "Bracket Assembly" might have operation: "Final Assembly"
- Child "Left Bracket Plate" might have operations: "Laser Cut", "Bend", "Deburr"

### Deleting Parts in Assemblies

**Rules:**
- Cannot delete a parent part if it has child parts
- Must first delete or reassign children
- System shows warning with child part count

---

## Resource Management

### Resource Types

**Configured in:** `/admin/resources`

**Types:**
- **Tooling** - Cutting tools, drill bits, punches
- **Fixture** - Jigs, clamps, holding fixtures
- **Mold** - Dies, molds, forming tools
- **Material** - Raw materials, stock
- **Other** - Miscellaneous resources

### Resource Fields

- **Name** - Resource identifier
- **Type** - Category from above
- **Status** - available, in_use, maintenance, retired
- **Description** - Details about the resource
- **Identifier** - Serial number or asset tag
- **Location** - Where it's stored
- **Metadata** - Custom fields (JSON)

### Assigning Resources to Operations

**Process:**
1. Create or edit operation
2. Select required resources from dropdown
3. Link via `operation_resources` table

**Purpose:**
- Track what tools are needed for operation
- Ensure resources are available before starting
- Resource utilization reporting

### Resource Tracking

**Features:**
- Track resource location
- Monitor maintenance status
- See which operations use which resources
- Resource utilization reports (future)

---

## QRM Capacity Management

**Quick Response Manufacturing (QRM)** capacity management helps prevent bottlenecks and maintain production flow by limiting work-in-progress (WIP) at each cell/stage.

### Purpose

Traditional manufacturing often suffers from:
- **Bottlenecks** - Work piles up at certain stages
- **Long lead times** - Parts wait in queues
- **Hidden capacity issues** - Problems aren't visible until too late

QRM capacity management solves this by:
- Setting WIP limits per cell
- Providing real-time capacity visibility
- Preventing overcapacity (optionally enforced)

### Configuration

**Location:** `/admin/config/stages`

Each cell/stage has QRM settings:

**WIP Limit**
- Maximum number of jobs allowed in the cell
- Example: Laser cell can handle 5 jobs at once
- Setting: `wip_limit` field

**WIP Warning Threshold**
- Percentage of limit at which to show warnings
- Default: 80% (4 out of 5 jobs)
- Setting: `wip_warning_threshold` field

**Enforce Limit**
- Whether to block operations when next cell is at capacity
- If enabled: Operators cannot complete operation if next cell is full
- If disabled: Shows warning but allows completion
- Setting: `enforce_limit` boolean

**Show Warning**
- Whether to display capacity warnings to operators
- Setting: `show_warning` boolean

### How It Works

**1. WIP Calculation**
```
Current WIP = Count of operations in cell with status 'in_progress' or 'pending'
Capacity % = (Current WIP / WIP Limit) × 100
```

**2. Visual Indicators**

Operators see capacity status:
- 🟢 **Green** - Available capacity (< warning threshold)
- 🟡 **Yellow** - Warning (>= warning threshold, < limit)
- 🔴 **Red** - At capacity (>= limit)

**3. Completion Blocking**

When operator tries to complete an operation:
1. System checks next cell in routing
2. If next cell has `enforce_limit` enabled:
   - Calculate next cell's current WIP
   - If next cell is at capacity (WIP >= limit):
     - Block completion
     - Show message: "Cannot complete - next cell at capacity"
   - If next cell has space:
     - Allow completion
3. Part moves to next cell

### Operator Terminal Integration

The **Operator Terminal** (`/operator/terminal`) shows:

**Next Cell Info**
- Name of next cell in routing
- Current WIP / Limit (e.g., "3/5 jobs")
- Color-coded capacity indicator
- Warning/blocking messages

**Routing Visualization**
- Visual flow showing all cells
- Each cell shows current capacity
- Next cell is highlighted
- Color-coded capacity status

**Capacity Blocking**
- Complete button disabled if blocked
- Clear message explaining why
- Updates in real-time as capacity changes

### Benefits

✅ **Prevent Bottlenecks** - Can't push work to overloaded cells
✅ **Maintain Flow** - Work moves smoothly through production
✅ **Visibility** - Everyone sees capacity status in real-time
✅ **Coordination** - Operators know when to hold vs. push
✅ **Data-Driven** - Adjust WIP limits based on actual capacity

### Example Scenario

**Setup:**
- Laser cell: WIP limit = 5, enforce = true
- Bend cell: WIP limit = 8, enforce = true
- Weld cell: WIP limit = 3, enforce = true

**Situation:**
- Operator finishes laser cutting operation
- Next cell (Bend) currently has 8 jobs (at capacity)
- Enforcement is enabled

**Result:**
- System blocks completion
- Shows: "Cannot complete - Bend cell at capacity (8/8 jobs)"
- Operator waits or coordinates with supervisor
- When Bend cell WIP drops to 7, completion is allowed

---

## Production Quantity & Scrap Tracking

Track actual production quantities vs. planned, including scrap/defect tracking with categorized reasons.

### Purpose

- Know exactly how many parts were produced (good vs. scrap)
- Track scrap reasons for quality improvement
- Calculate true production costs
- Identify recurring quality issues
- Audit trail for production quantities

### Scrap Reasons Configuration

**Location:** `/admin/config/scrap-reasons`

**Categories:**
1. **Material** (`material`) - Material defects, wrong material, contamination
2. **Process** (`process`) - Incorrect process parameters, sequence errors
3. **Equipment** (`equipment`) - Machine malfunction, tooling failure
4. **Operator** (`operator`) - Operator error, incorrect setup
5. **Design** (`design`) - Design flaws, impossible tolerances
6. **Other** (`other`) - Miscellaneous reasons

**Scrap Reason Fields:**
- **Code** - Short identifier (e.g., "MAT-001", "PROC-05")
- **Description** - Full explanation
- **Category** - One of the categories above
- **Active** - Whether currently in use

**Seeding Default Reasons:**
- Click "Seed Default Reasons" button
- Creates common scrap reasons for all categories
- Examples: "Material damaged", "Wrong program run", "Tool breakage", etc.

### Production Quantity Tracking Flow

**When Operator Completes Operation:**

1. Operator clicks "Complete Operation"
2. **Production Quantity Modal** appears
3. Operator enters:
   - **Good Quantity**: Parts that passed quality check
   - **Scrap Quantity**: Parts that failed
   - **Scrap Reason** (if scrap > 0): Select from dropdown
4. System validates:
   - Good + Scrap should match planned quantity (warning if mismatch)
5. System records to database:
   - `operations.good_quantity`
   - `operations.scrap_quantity`
   - `operations.scrap_reason_id` (foreign key)
6. Operation marked as complete

### Database Schema

**operations table additions:**
```sql
good_quantity: integer (default: 0)
scrap_quantity: integer (default: 0)
scrap_reason_id: uuid (foreign key to scrap_reasons)
```

**scrap_reasons table:**
```sql
id: uuid (primary key)
tenant_id: uuid (foreign key)
code: text (unique within tenant)
description: text
category: text (material, process, equipment, operator, design, other)
active: boolean (default: true)
created_at: timestamp
```

### Reporting & Analysis

**Available Data:**
- Total good quantity by job/part/operation
- Total scrap quantity by job/part/operation
- Scrap rate percentage
- Scrap reasons breakdown by category
- Scrap trends over time
- Cost impact (scrap quantity × material cost)

**Future Enhancements:**
- Scrap reason reports dashboard
- Pareto charts of scrap reasons
- Trend analysis
- Quality improvement initiatives tracking

### Example Scenario

**Operation:** Laser cut 50 brackets

**Actual Results:**
- Good quantity: 47
- Scrap quantity: 3
- Scrap reason: "MAT-001 - Material damaged"

**Recording:**
1. Operator completes operation
2. Modal appears
3. Enters: Good = 47, Scrap = 3
4. Warning shows: "Total (50) matches planned quantity ✓"
5. Selects scrap reason: "MAT-001 - Material damaged"
6. Submits
7. Database records quantities and reason
8. Operation completes

**Analysis Later:**
- Admin sees 3 parts scrapped due to material damage
- Can investigate material supplier or handling
- Track if this reason is recurring
- Calculate cost impact

---

## Substeps & Templates

Break operations into smaller, checkable tasks using substeps. Create reusable templates for standardized procedures.

### Purpose

**Substeps:**
- Guide operators through complex procedures
- Ensure all steps are completed
- Training aid for new operators
- Quality assurance
- Audit trail of what was done

**Templates:**
- Standardize procedures across similar operations
- Reduce setup time for new jobs
- Ensure consistency
- Easy updates (change template, affects all uses)

### Substep Templates System

**Location:** `/admin/config/steps-templates`

**Creating a Template:**
1. Navigate to Steps Templates page
2. Click "Create New Template"
3. Enter template name (e.g., "Laser Cutting Checklist")
4. Add steps:
   - Step description (e.g., "Verify material thickness")
   - Order/sequence
5. Save template

**Template Fields:**
- **Name**: Template identifier
- **Steps**: Array of step descriptions
- **Created/Updated timestamps**
- **Tenant ID**: Multi-tenant isolation

**Managing Templates:**
- Edit existing templates (updates all future uses)
- Delete unused templates
- View all templates in list
- Search/filter templates

### Applying Templates to Operations

**During Job Creation:**
1. Admin creates job and adds parts
2. For each operation, can select:
   - "Apply Template" dropdown
   - Choose from available templates
3. Template substeps are copied to operation
4. Can customize substeps for this specific operation

**Manual Substep Creation:**
- Add substeps individually without template
- Mix template substeps with custom ones
- Edit substep descriptions

### Operator Substep Workflow

**Location:** Operation Detail Modal (Work Queue or Terminal)

**Substeps Checklist:**
1. Operator opens operation
2. Sees list of substeps with checkboxes
3. Completes each substep in order
4. Checks off substep when done
5. System records:
   - Which substep completed
   - Who completed it
   - When completed
6. All substeps must be checked before operation can be completed

**Substep States:**
- ☐ **Pending** - Not yet completed
- ✅ **Completed** - Checked off by operator

**Completion Requirement:**
- If operation has substeps, ALL must be completed
- "Complete Operation" button disabled until all substeps checked
- Clear message: "Complete all substeps first"

### Database Schema

**substep_templates table:**
```sql
id: uuid
tenant_id: uuid
name: text
steps: text[] (array of step descriptions)
created_at: timestamp
updated_at: timestamp
```

**substeps table:**
```sql
id: uuid
operation_id: uuid (foreign key)
description: text
sequence: integer (order)
completed: boolean
completed_at: timestamp
completed_by: uuid (user who completed)
tenant_id: uuid
```

### Example Templates

**"Laser Cutting Checklist"**
1. Verify material type matches drawing
2. Check material thickness with caliper
3. Load correct program (verify program number)
4. Set focal length for material thickness
5. Check gas pressure (oxygen/nitrogen)
6. Verify nest orientation
7. Start cutting cycle
8. Inspect first part before continuing
9. Monitor cutting quality throughout run
10. Deburr edges after cutting

**"Quality Inspection"**
1. Visual inspection for defects
2. Measure critical dimensions with calipers
3. Check hole locations with template
4. Verify bend angles with protractor
5. Inspect surface finish
6. Check quantity matches traveler
7. Sign off on traveler
8. Move to next operation

**"Welding Procedure"**
1. Clean joint surfaces
2. Verify weld symbols on drawing
3. Select correct filler material
4. Set machine parameters per WPS
5. Tack weld in sequence
6. Complete weld passes
7. Visual inspection of weld
8. Grind/finish weld if required
9. Mark part as welded

### Benefits

✅ **Consistency** - Every operator follows same procedure
✅ **Quality** - Nothing skipped or forgotten
✅ **Training** - New operators have clear guidance
✅ **Compliance** - Audit trail of completed steps
✅ **Efficiency** - Templates save setup time
✅ **Improvement** - Refine templates based on experience

---

## Operator Terminal

Streamlined, real-time production interface optimized for shop floor use with QRM capacity integration.

### Purpose

**Goals:**
- Simpler interface than Work Queue
- Real-time production status at a glance
- QRM capacity visibility before completing operations
- Visual routing to understand workflow
- Quick access to CAD files and drawings
- Mobile-optimized for tablets

**Use Case:**
- Operator works at terminal/tablet mounted near work area
- Selects their current job
- Sees all relevant info on one screen
- Monitors next cell capacity
- Completes operation when ready (if capacity allows)

### Location & Access

**Route:** `/operator/terminal`

**Access:** Operator role

**Layout:** Two-panel interface

### Left Panel: Job List

Shows all operations assigned to operator, sorted by status:

**🟢 In Process (Green)**
- Currently active operations
- Operator has started timing
- Highest priority

**🔵 In Buffer (Blue)**
- Next 5 operations ready to start
- Pending status
- Sorted by priority/due date

**🟡 Expected (Amber)**
- Upcoming work in queue
- Further out operations
- For planning ahead

**Job Card Info:**
- Job number
- Part number
- Operation name
- Customer name (if available)
- Due date
- Priority indicator

**Cell Filter:**
- Dropdown to filter by cell/stage
- Shows only operations for selected cell
- "All Cells" to see everything
- Selection persists in localStorage

### Right Panel: Detail View

Selected job details with tabs/sections:

**Job Information**
- Job number and name
- Customer name
- Part number and description
- Quantity ordered
- Due date
- Current status

**Operation Controls**
- Start/Pause/Stop timing buttons
- Complete operation button
- Current timer display
- Pause time display

**Next Cell Info** (QRM Integration)
- Name of next cell in routing
- Current WIP count / Limit
- Color-coded capacity indicator:
  - 🟢 Green: Capacity available
  - 🟡 Yellow: Warning (approaching limit)
  - 🔴 Red: At capacity
- Warning message if capacity issue
- Blocking message if enforcement prevents completion

**Routing Visualization**
- Visual flowchart of all cells in job routing
- Current cell highlighted
- Next cell emphasized
- Each cell shows capacity status
- Arrows show flow direction
- Sequence numbers on cells

**3D Model Viewer** (if STEP file attached)
- Three.js viewer
- Orbit, zoom, pan controls
- Wireframe toggle
- Exploded view
- Fit to view button
- Full screen option

**PDF Drawing Viewer** (if drawing attached)
- Inline PDF viewer
- Zoom controls
- Page navigation
- Download link

**Operations List**
- All operations for this part
- Sequence order
- Status of each operation
- Current operation highlighted
- Shows which are complete/pending

**Substeps Checklist** (if substeps exist)
- List of all substeps
- Checkboxes to mark complete
- Sequence order
- Completion requirement indicator

### Real-Time Updates

**Supabase Realtime subscriptions:**
- Operations table changes
- Time entries updates
- Cell capacity changes
- Job status updates

**Auto-refresh:**
- Job list refreshes when data changes
- Capacity indicators update live
- No manual refresh needed

**Visual feedback:**
- Loading states while fetching data
- Success/error toasts for actions
- Optimistic UI updates

### QRM Capacity Integration

**Before Completing Operation:**

1. System checks next cell in routing
2. Fetches current WIP for next cell
3. Calculates capacity status
4. Shows capacity info with color coding
5. If `enforce_limit` enabled and at capacity:
   - Disable "Complete" button
   - Show blocking message
   - Update in real-time as capacity changes
6. When capacity available:
   - Enable "Complete" button
   - Show green indicator

**During Operation:**
- Capacity info always visible
- Real-time updates
- Operator can see capacity before finishing
- Plan accordingly (slow down if next cell full)

### Mobile Optimization

**Responsive Design:**
- Works on tablets (iPad, Android tablets)
- Touch-friendly buttons and controls
- Swipe gestures (future)
- Larger hit areas for shop floor use

**Tablet Mounting:**
- Can be mounted near work station
- Glanceable status info
- Quick operation completion
- No need to walk to office computer

### Comparison: Terminal vs. Work Queue

**Operator Terminal** (`/operator/terminal`):
- Simpler, cleaner interface
- Focus on one job at a time
- QRM capacity prominent
- Visual routing
- Optimized for tablets
- Real-time status view

**Work Queue** (`/operator/work-queue`):
- Full list of all operations
- More filtering options
- Table view with sorting
- Better for planning day's work
- More detail per operation
- Desktop-optimized

**When to Use Each:**
- **Terminal**: Active production, one job focus, capacity-sensitive operations
- **Work Queue**: Planning, reviewing all work, detailed filtering

---

## System Configuration

### Cells/Stages Configuration

**Accessed from:** `/admin/config/stages`

**Purpose:** Define the workflow stages/cells in your shop

**Examples:**
- Laser Cutting
- Bending
- Welding
- Assembly
- Finishing
- Quality Inspection

**Fields:**
- **Name** - Cell identifier
- **Color** - Visual identification (hex color)
- **Sequence** - Order in workflow
- **Description** - Optional details
- **Active** - Enable/disable cell

**Usage:**
- Operations are assigned to cells
- Parts show "current cell" during production
- Work Queue can be filtered by cell
- Colors used in UI for visual coding

### Materials Configuration

**Accessed from:** `/admin/config/materials`

**Purpose:** Define material catalog

**Examples:**
- "Steel 1018"
- "Aluminum 6061-T6"
- "Stainless 304"
- "Copper C110"

**Fields:**
- **Name** - Material identifier
- **Description** - Material specs
- **Color** - Visual coding
- **Active** - Enable/disable

**Usage:**
- Parts are assigned materials
- Filter parts by material
- Material-based reporting

### Users Configuration

**Accessed from:** `/admin/config/users`

**Purpose:** Manage operator and admin accounts

**User Types:**
1. **Admin** - Full access
2. **Operator** - Work queue access only
3. **Machine** - API-only access (is_machine flag)

**Fields:**
- **Email** - Login email (must be unique)
- **Full Name** - Display name
- **Username** - Generated from email
- **Role** - admin or operator
- **Active** - Enable/disable account
- **Machine Account** - API-only flag

**Actions:**
- Create new users
- Edit user roles
- Deactivate users
- Reset passwords (via Supabase)

### API Keys Configuration

**Accessed from:** `/admin/config/api-keys`

**Purpose:** Generate API keys for external integrations

**Process:**
1. Click "Generate New API Key"
2. Enter name (e.g., "ERP Integration")
3. API key shown **only once** (copy and save securely)
4. Key format: `ery_live_xxxxxxxxxxxxx`

**Security:**
- Keys are hashed with bcrypt
- Only prefix shown after creation
- Cannot retrieve full key later
- Can revoke/delete keys

**Usage:**
- Pass in `Authorization: Bearer ery_live_xxx` header
- Access all API endpoints
- Same permissions as admin

**Tracking:**
- Last used timestamp
- Active/inactive status

### Webhooks Configuration

**Accessed from:** `/admin/config/webhooks`

**Purpose:** Configure webhooks for real-time notifications

**Fields:**
- **URL** - Webhook endpoint URL
- **Events** - Select events to subscribe to
- **Secret** - For HMAC signature verification
- **Active** - Enable/disable webhook

**Supported Events:**
- `operation.started` - When operator starts timing
- `operation.completed` - When operation completes
- `issue.created` - When issue is reported
- `job.created` - When new job is created

**Webhook Delivery:**
- HTTP POST to configured URL
- HMAC-SHA256 signature in header
- Payload includes event data
- Delivery logged in `webhook_logs`

**Monitoring:**
- View delivery logs
- See success/failure status
- Inspect payloads and responses
- Retry failed deliveries (manual)

---

## API Integration

### Authentication

**Method:** Bearer token with API key

**Header:**
```
Authorization: Bearer ery_live_xxxxxxxxxxxxx
```

**Key Generation:** `/admin/config/api-keys` → Generate

### Base URL

```
https://vatgianzotsurljznsry.supabase.co/functions/v1/
```

### Available Endpoints

**Jobs API** (`/api-jobs`)
- GET - List jobs with filtering
- POST - Create job with parts and operations
- PATCH - Update job

**Parts API** (`/api-parts`)
- GET - List parts
- POST - Create part
- PATCH - Update part

**Operations API** (`/api-operations`)
- GET - List operations (extensive filtering)
- POST - Create operation
- PATCH - Update operation

**Cells API** (`/api-cells`)
- GET - List cells
- POST - Create cell
- PATCH - Update cell

**Materials API** (`/api-materials`)
- GET - List materials

**Assignments API** (`/api-assignments`)
- GET - List assignments
- POST - Create assignment
- DELETE - Delete assignment

**Issues API** (`/api-issues`)
- GET - List issues
- POST - Create issue
- PATCH - Update issue

**Time Entries API** (`/api-time-entries`)
- GET - List time entries
- POST - Create time entry

**Webhooks API** (`/api-webhooks`)
- GET - List webhooks
- POST - Create webhook
- PATCH - Update webhook
- DELETE - Delete webhook

**Export API** (`/api-export`)
- GET - Export tenant data (JSON or CSV)

### Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### Pagination

All list endpoints support:
- `limit` - Records per page (default: 100, max: 1000)
- `offset` - Starting position (default: 0)

### Filtering Examples

**List operations for a specific part:**
```
GET /api-operations?part_id=<uuid>
```

**List jobs by customer:**
```
GET /api-jobs?customer=Acme
```

**List pending issues:**
```
GET /api-issues?status=pending
```

### Rate Limiting

- Based on subscription plan
- In-memory rate limiting
- 429 response if exceeded

---

## Data Export

**Accessed from:** `/admin/data-export`

### Purpose

Export all tenant data for:
- Offboarding (taking data with you)
- Backup
- Migration to another system
- Data analysis
- Compliance (GDPR, CCPA)

### Export Options

**1. Selectable Entities:**

Check which data to export:
- Jobs, Parts, Operations
- Cells, Time Entries, Time Entry Pauses
- Assignments, Issues, Substeps
- Resources, Operation Resources, Materials
- Profiles (users), API Keys, Webhooks, Webhook Logs

Or "Select All" for complete export

**2. Format Selection:**

- **JSON** - Single file with nested structure
  - Best for: Developers, API imports, archives
  - Size: Larger (includes all metadata)

- **CSV** - Multiple files (one per entity) in ZIP
  - Best for: Excel, Google Sheets, database imports
  - Size: Smaller (tabular format)

### Export Process

1. Select entities or "Select All"
2. Choose format (JSON or CSV)
3. Click "Export Data"
4. Wait for processing (few seconds to 1 minute)
5. Download starts automatically
6. Extract ZIP (if CSV format)

### What's Included

✅ **Included:**
- All database records for selected entities
- Export metadata (timestamp, counts)
- Tenant information

❌ **Not Included:**
- File attachments (STEP files, PDFs, images)
  - File paths are included in export
  - Files must be downloaded separately from storage
- API key secrets (only prefixes)

### Security

- Admin-only access
- RLS policies apply (only your tenant's data)
- API key hashes excluded
- No export audit trail (privacy)

---

## 3D CAD Viewer

**Accessed from:** Part Detail Modal → "View 3D" button

### Supported File Formats

- STEP (.step)
- STP (.stp)

### Features

**Interactive Controls:**
- **Orbit:** Left-click and drag
- **Zoom:** Scroll wheel
- **Pan:** Right-click and drag
- **Fit View:** Button to center and frame model

**Visualization Modes:**
- **Wireframe Mode:** Toggle to see edges only
- **Exploded View:** Separate parts with adjustable explosion factor
- **Grid Display:** Toggle floor grid
- **Edge Highlighting:** Show model edges

### File Upload

**Process:**
1. Open Part Detail Modal
2. Scroll to "3D CAD Files" section
3. Click "Choose STEP files" or drag-and-drop
4. Select .step or .stp files
5. Click "Upload"
6. Files uploaded to Supabase Storage
7. Paths saved to part's `file_paths` array

### Storage

**Location:** Supabase Storage bucket `parts-cad`

**Structure:**
```
parts-cad/
  └── {tenant_id}/
      └── parts/
          └── {part_id}/
              ├── model_v1.step
              ├── assembly.stp
              └── ...
```

**Security:**
- Tenant-isolated (RLS policies)
- Signed URLs with 1-hour expiration
- Private bucket (not publicly accessible)

### Viewing Process

1. Click "View 3D" on file
2. System generates signed URL
3. File fetched as blob
4. Blob URL created (avoids CORS)
5. STEP parser loads (occt-import-js from CDN)
6. Three.js scene initialized
7. Model parsed and rendered
8. Interactive controls active

### Troubleshooting

**Model doesn't load:**
- Check file is valid STEP format
- Try re-exporting from CAD software
- Check file size (50MB max)

**Model appears off-center:**
- Click "Fit View" button

**Performance issues:**
- Large assemblies (>10MB) may be slow
- Consider splitting into sub-assemblies
- Use wireframe mode for large models

---

## Real-Time Features

### Supabase Realtime Subscriptions

**Active on these pages:**

1. **Dashboard** (`/dashboard`)
   - Active work table updates in real-time
   - KPI counters update as work happens
   - Subscription to: `time_entries`, `operations`, `issues`

2. **Work Queue** (`/work-queue`)
   - Operation list updates when assigned
   - Status changes reflect immediately
   - Subscription to: `operations`, `assignments`

3. **My Activity** (`/my-activity`)
   - Time entries appear as they're created
   - Subscription to: `time_entries`

4. **My Issues** (`/my-issues`)
   - Issue status updates from admin reviews
   - Subscription to: `issues`

5. **Issue Queue** (`/admin/issues`)
   - New issues appear immediately when reported
   - Subscription to: `issues`

### Currently Timing Widget

**Displays on:** All operator pages (sticky header)

**Shows:**
- Currently timing operation name
- Elapsed time (updates every second)
- Part and job information
- Pause/resume/stop buttons

**Real-time Updates:**
- Timer counts up continuously
- Pause state syncs across tabs
- Stop updates all views immediately

### Webhooks (External Real-Time)

**For external systems:**

1. Register webhook URL in system
2. Select events to receive
3. Receive HTTP POST when events occur
4. Verify HMAC signature
5. Process event data

**Use Cases:**
- Update ERP when job completes
- Send notifications to Slack/Teams
- Trigger automated workflows
- Update external dashboards

---

## Subscription Plans

**Accessed from:** `/my-plan` (Admin only)

### Plan Tiers

**1. Free Plan**
- Max 10 jobs
- Max 100 parts per month
- Max 1GB storage
- Email support

**2. Pro Plan**
- Max 100 jobs
- Max 1,000 parts per month
- Max 10GB storage
- Priority email support
- API access
- Webhooks

**3. Premium Plan**
- Unlimited jobs
- Unlimited parts
- Max 100GB storage
- 24/7 phone support
- API access
- Webhooks
- Dedicated account manager

### Usage Tracking

**Monitored Metrics:**
- Current jobs (active + in_progress)
- Parts created this month (resets monthly)
- Storage used (file uploads)

**Display:**
- Progress bars showing usage vs. limits
- Percentage used
- Warning when approaching limits

### Limit Enforcement

**Soft Limits:**
- Warning shown when 80% of limit reached
- "Upgrade" button appears

**Hard Limits:**
- Cannot create job if at max jobs
- Cannot create part if at monthly max
- Cannot upload file if at storage max

### Upgrade Process

1. Click "Upgrade Plan" on My Plan page
2. (Future) Billing integration
3. Plan updated immediately
4. Limits increased
5. New features unlocked

---

## Technical Architecture

### Frontend Architecture

**Framework:** React 18 with TypeScript

**State Management:**
- React Context (`AuthContext`) - Global auth state
- React Query (TanStack Query) - Server state caching
- React Hook Form - Form state
- Local state (useState) - Component UI state

**Routing:** React Router v6
- Protected routes with auth check
- Role-based route access
- Automatic redirects

**UI Libraries:**
- Material UI v7 - Complex components (DataGrid, date pickers)
- shadcn/ui - Base UI primitives (Button, Card, Dialog)
- Tailwind CSS - Utility styling

**3D Rendering:**
- Three.js - WebGL 3D graphics
- occt-import-js - STEP file parser

### Backend Architecture

**Platform:** Supabase

**Database:** PostgreSQL with Row-Level Security (RLS)
- Multi-tenant isolation via RLS policies
- Automatic filtering by tenant_id
- Role-based permissions

**Edge Functions:** Deno-based serverless functions
- RESTful API endpoints
- API key authentication
- Request validation
- Response formatting
- Webhook dispatch

**Authentication:** Supabase Auth
- JWT-based sessions
- Email/password auth
- Auto-refresh tokens
- Session persistence

**Storage:** Supabase Storage
- File uploads (STEP, images, PDFs)
- Signed URLs with expiration
- RLS policies for tenant isolation

**Real-time:** Supabase Realtime
- PostgreSQL change data capture (CDC)
- WebSocket-based subscriptions
- Live updates across clients

### Multi-Tenancy Implementation

**Database Level:**
- Every table has `tenant_id` column
- RLS policies enforce: `WHERE tenant_id = get_user_tenant_id()`
- Helper function reads from user's profile

**Application Level:**
- Auth context provides `user.tenant_id`
- All queries automatically filtered
- Cross-tenant queries impossible

**API Level:**
- API keys linked to tenant
- Requests scoped to key's tenant
- No cross-tenant API access

### Data Flow Example: Start Time Tracking

```
1. Operator clicks "Start Timing" (UI)
   ↓
2. React component calls startTimeTracking() (lib/database.ts)
   ↓
3. Function executes multiple Supabase queries:
   - INSERT time_entry
   - UPDATE operation status
   - UPDATE part status and current_cell
   - UPDATE job status
   ↓
4. RLS policies enforce tenant_id filter on all queries
   ↓
5. Database triggers fire (if configured)
   ↓
6. Webhook dispatch function called (lib/webhooks.ts)
   ↓
7. Edge function api-webhook-dispatch receives event
   ↓
8. HTTP POST sent to registered webhook URLs
   ↓
9. Realtime subscription fires (postgres_changes)
   ↓
10. Dashboard updates in real-time (other admins see activity)
```

### Security Layers

**1. Authentication:**
- JWT tokens with short expiration
- Auto-refresh mechanism
- Secure httpOnly cookies (future)

**2. Authorization:**
- Role-based access control (RBAC)
- Admin vs. Operator permissions
- UI route protection
- API endpoint validation

**3. Data Isolation:**
- Row-Level Security (RLS)
- Tenant-scoped queries
- API key tenant binding

**4. API Security:**
- API key hashing (bcrypt)
- HMAC signature for webhooks
- Rate limiting
- Input validation

**5. Storage Security:**
- Private buckets
- Signed URLs with expiration
- Tenant-scoped paths
- File type validation

### Performance Optimizations

**1. React Query Caching:**
- 5-minute stale time for most queries
- Background refetching
- Automatic invalidation

**2. Edge Function Caching:**
- 5-second cache with stale-while-revalidate (10s)
- Used on high-traffic endpoints (operations list)

**3. Pagination:**
- Default 100 records per page
- Max 1000 per request
- Offset-based pagination

**4. Database Indexing:**
- Indexes on: tenant_id, foreign keys, status fields
- Composite indexes for common filters

**5. Real-time Optimization:**
- Subscription filters (reduce noise)
- Debounced updates
- Batch operations where possible

---

## Conclusion

Eryxon Flow is a comprehensive manufacturing execution system that provides:

✅ **Complete job lifecycle management** - From creation to completion
✅ **Real-time production visibility** - Know what's happening right now
✅ **Accurate time tracking** - Actual vs. estimated with pause support
✅ **Quality management** - Issue reporting and resolution workflow
✅ **Assembly tracking** - Multi-level part hierarchies
✅ **3D CAD viewing** - View STEP files directly in browser
✅ **API integration** - Connect with ERP and other systems
✅ **Data export** - Full data portability and backup
✅ **Multi-tenant architecture** - Secure isolation and scalability
✅ **Role-based access** - Admin and operator permissions

**For Operators:** Simple, focused interface for executing work efficiently
**For Admins:** Powerful tools for managing production, configuring systems, and analyzing data
**For Integrators:** Comprehensive API for connecting external systems

---

**Need Help?** See [HELP.md](./HELP.md) for FAQs and troubleshooting guides.

**API Reference:** See [api-documentation.md](./api-documentation.md) for complete API docs.

**Design System:** See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for UI components and styling.
