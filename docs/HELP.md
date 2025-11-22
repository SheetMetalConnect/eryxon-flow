# Eryxon Flow - Help & FAQ

**Version:** 1.1
**Last Updated:** November 22, 2025

---

## Quick Links

- **Interactive Help Page:** [/help](/help) (accessible when logged in)
- **API Documentation:** [api-documentation.md](./api-documentation.md)
- **How the App Works:** [HOW-THE-APP-WORKS.md](./HOW-THE-APP-WORKS.md)
- **3D Viewer Guide:** [3d-viewer.md](./3d-viewer.md)
- **Design System:** [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)

---

## Getting Started

### What is Eryxon Flow?

Eryxon Flow is a manufacturing execution system (MES) for sheet metal fabrication that helps you:
- Track jobs from creation to completion
- Monitor real-time production status
- Track accurate time vs. estimates
- Manage production issues
- View 3D CAD files
- Integrate with external systems via API

### How Does It Work?

**3-Level Hierarchy:**
1. **Jobs** - Customer orders (e.g., "Bracket Assembly for ABC Corp")
2. **Parts** - Components within jobs (can be assemblies or standalone)
3. **Operations** - Tasks on parts (cutting, bending, welding, etc.)

**User Roles:**
- **Operators:** Execute work, track time, report issues
- **Admins:** Create jobs, configure system, oversee production

---

## For Operators

### Daily Workflow

1. **Login** → Redirected to Work Queue
2. **Select Operation** → Click to open details
3. **Start Timing** → Begin tracking your work
4. **Work on Operation** → Pause if needed
5. **Report Issues** → If problems occur (with photos)
6. **Stop Timing** → When finished
7. **Mark Complete** → Move to next operation

### Key Pages

- **Work Queue** (`/work-queue`) - Your main page, see assigned operations
- **Operator Terminal** (`/operator/terminal`) - Real-time production terminal with QRM capacity management
- **My Activity** (`/my-activity`) - Your time tracking history (last 7 days)
- **My Issues** (`/my-issues`) - Issues you've reported

### Operator Terminal View

The **Operator Terminal** provides a clean, real-time interface for production work:

**Left Panel (Job List):**
- **In Process** (Green) - Currently active operations
- **In Buffer** (Blue) - Next 5 operations ready to start
- **Expected** (Amber) - Upcoming work in queue

**Right Panel (Detail View):**
- Job details (customer, quantity, due date)
- Current operation and controls (Start/Pause/Complete)
- **QRM Features:**
  - **Next Cell** - Shows which cell the part moves to after current operation
  - **Capacity Status** - Real-time WIP (Work-In-Progress) for next cell
    - 🟢 Green: Available capacity
    - 🟡 Yellow: Warning (80%+ full)
    - 🔴 Red: At capacity (blocked)
  - **Routing Visualization** - Visual flow showing all cells in the job routing
  - **Capacity Blocking** - Complete button disabled if next cell is at capacity (when enforced)
- 3D model viewer (if STEP file attached)
- PDF drawing viewer (if drawing attached)
- Operations list showing full routing sequence

**QRM Capacity Management:**
The terminal uses QRM (Quick Response Manufacturing) methodology to prevent bottlenecks:
- You can see if the next cell has capacity before completing your operation
- If the next cell is at capacity and has enforcement enabled, you'll be blocked from completing
- This prevents work-in-progress buildup and maintains flow
- Capacity is shown as: `Current WIP / Limit` (e.g., "3/5 jobs")

### Tips

- Always start timing before you begin work
- Pause during breaks (pause time doesn't count)
- Report issues immediately with photos
- **Check next cell capacity** before completing - if blocked, coordinate with supervisors
- Use the routing visualization to understand where the part goes next
- Mark operations complete as soon as finished (unless blocked by capacity)

---

## For Admins

### Key Tasks

#### Creating Jobs

1. Navigate to **Jobs → Create New Job**
2. Enter job details (number, customer, due date)
3. Add parts (number, material, quantity)
4. Add operations to each part (name, cell, estimated time, sequence)
5. Submit

#### Assigning Work

1. Go to **Assignments** page
2. Select part from dropdown
3. Select operator
4. Click "Assign"
5. Operator sees operations in their Work Queue

#### Managing Issues

1. Go to **Issues** page
2. Review pending issues
3. **Approve** (valid issue), **Reject** (not an issue), or **Close** (resolved)
4. Add resolution notes

#### System Configuration

Go to **Settings** menu:
- **Stages/Cells** - Define workflow stages (Cutting, Bending, etc.)
  - **QRM Settings** - Configure WIP limits and capacity enforcement for each cell:
    - `WIP Limit` - Maximum jobs allowed in the cell
    - `WIP Warning Threshold` - Warning level (default: 80% of limit)
    - `Enforce Limit` - If enabled, blocks operations from completing when next cell is at capacity
    - `Show Warning` - Display warnings in operator terminal when approaching capacity
- **Materials** - Create material catalog
- **Resources** - Track tools, fixtures, molds
- **Users** - Manage operator and admin accounts
- **API Keys** - Generate keys for integrations
- **Webhooks** - Configure real-time event notifications

---

## Frequently Asked Questions

### General

**Q: What's the difference between Jobs, Parts, and Operations?**

A:
- **Job** = Customer order (e.g., "Bracket Assembly Order")
- **Part** = Individual component (e.g., "Left Bracket Plate")
- **Operation** = Specific task (e.g., "Laser Cut", "Bend 90°")
- **Hierarchy:** Job → Parts → Operations

**Q: Can I time multiple operations at once?**

A: No, only one operation at a time per operator. Starting a new timer stops the previous one.

**Q: What does "Next cell at capacity" mean?**

A: This is part of QRM (Quick Response Manufacturing) capacity management. Each cell has a WIP (Work-In-Progress) limit set by admins. When the next cell in your routing reaches its limit, you'll see a warning and may be blocked from completing your operation (if enforcement is enabled). This prevents bottlenecks and maintains production flow. Coordinate with supervisors if blocked.

**Q: Why can't I complete my operation even though I'm done?**

A: If you see "Cannot complete - next cell at capacity", the next cell in the routing is full. This is intentional to prevent work piling up. Options:
1. Wait for capacity to free up (check the WIP count)
2. Contact your supervisor to adjust the routing or WIP limits
3. Pause your timer while waiting so time isn't wasted

**Q: What happens to pause time?**

A: Pause time is tracked separately and excluded from the operation's actual time:
```
Effective Time = (Stop Time - Start Time) - Total Pause Time
```

**Q: How do assemblies work?**

A: Assemblies are parts that contain other parts:
```
Bracket Assembly (parent)
├── Left Plate (child)
├── Right Plate (child)
└── Mounting Bracket (child)
```
Each part (parent and children) has its own operations.

### Troubleshooting

**Q: I don't see any operations in my Work Queue**

A:
1. Check if work has been assigned to you (ask admin)
2. Clear all filters to see if operations appear
3. You might have completed all work - check "My Activity"

**Q: Timer doesn't start when I click "Start Timing"**

A: You likely have another operation already timing. Check the "Currently Timing" widget at the top. Stop that timer first, then start the new one.

**Q: 3D CAD viewer won't load my STEP file**

A:
1. Verify file is valid STEP format (.step or .stp)
2. Check file size (50MB max)
3. Try re-exporting from CAD software
4. Click "Fit View" if model loaded but appears off-screen

**Q: Can't create a new job (Admin)**

A: Check plan limits in "My Plan" page:
- **Free:** 10 jobs max
- **Pro:** 100 jobs max
- **Premium:** Unlimited

Solution: Complete or delete old jobs, or upgrade plan.

**Q: Data export is taking a long time**

A: Large datasets can take 30-60 seconds. This is normal.

Tips:
- Export fewer entities if you don't need everything
- CSV format is typically faster than JSON
- Don't close browser tab while processing

### API & Integration

**Q: How do I get API access?**

A:
1. Ensure you're on Pro or Premium plan
2. Go to **Settings → API Keys**
3. Click "Generate New API Key"
4. Copy key immediately (shown only once)
5. Use in Authorization header: `Authorization: Bearer ery_live_xxxxx`

**Q: How do webhooks work?**

A: Webhooks send real-time HTTP POST notifications when events occur:
- `operation.started` - When operator starts timing
- `operation.completed` - When operation finishes
- `issue.created` - When issue is reported
- `job.created` - When new job is created

Setup: Go to **Settings → Webhooks** → Add endpoint URL → Select events

Security: Each webhook includes HMAC-SHA256 signature for verification

---

## Features Guide

### Time Tracking

**Starting:**
- Operator clicks "Start Timing"
- Creates `time_entry` record
- Operation status → `in_progress`

**Pausing:**
- Click "Pause" to stop timer temporarily
- Creates `time_entry_pauses` record
- Pause time excluded from actual time

**Stopping:**
- Click "Stop Timing"
- Calculates: Total - Pause Time = Effective Time
- Adds to operation's `actual_time`

### Issue Management

**Reporting (Operator):**
1. Click "Report Issue" in operation detail
2. Select severity (low, medium, high, critical)
3. Add description
4. Upload photos (optional)
5. Submit

**Review (Admin):**
1. See pending issues in **Issues** page
2. Approve, Reject, or Close
3. Add resolution notes

### 3D CAD Viewer

**Supported Formats:** STEP (.step), STP (.stp)

**Controls:**
- **Orbit:** Left-click and drag
- **Zoom:** Scroll wheel
- **Pan:** Right-click and drag
- **Fit View:** Button to center model

**Modes:**
- Wireframe toggle
- Exploded view with adjustable factor
- Grid display toggle

**Upload:**
1. Open Part Detail Modal
2. Scroll to "3D CAD Files"
3. Upload .step or .stp files
4. Click "View 3D" to open viewer

### Data Export

**Access:** `/admin/data-export` (Admin only)

**Options:**
- Select entities or "Select All"
- Choose format (JSON or CSV)
- Click "Export Data"
- Download ZIP archive

**Included:**
- All database records
- Export metadata
- Tenant information

**Not Included:**
- File attachments (only paths)
- API key secrets (only prefixes)

---

## Subscription Plans

### Plan Comparison

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| **Jobs** | 10 max | 100 max | Unlimited |
| **Parts/Month** | 100 | 1,000 | Unlimited |
| **Storage** | 1GB | 10GB | 100GB |
| **API Access** | ❌ | ✅ | ✅ |
| **Webhooks** | ❌ | ✅ | ✅ |
| **Support** | Email | Priority Email | 24/7 Phone |

### Usage Tracking

View in **My Plan** page:
- Current jobs (active + in_progress)
- Parts created this month
- Storage used

Limits enforced:
- Warning at 80% of limit
- Hard limit prevents creation when exceeded

---

## Keyboard Shortcuts (Admin)

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Global search |
| `Cmd/Ctrl + N` | Quick create menu |
| `Esc` | Close modal/dialog |

---

## Support

### Contact

**Email:** support@eryxonflow.com
**Response Time:**
- Free/Pro: Within 24 hours
- Premium: Within 4 hours

### Additional Resources

- **Documentation:** [/docs](https://github.com/SheetMetalConnect/eryxon-flow/tree/main/docs)
- **API Reference:** [/api-docs](/api-docs)
- **Pricing:** [/pricing](/pricing)

---

## Best Practices

### For Operators

✅ Always start timing before you begin work
✅ Pause timer during breaks or interruptions
✅ Report issues immediately when they occur
✅ Take photos of issues for documentation
✅ Mark operations complete as soon as finished

### For Admins

✅ Set up workflow cells first before creating jobs
✅ Create materials catalog before adding jobs
✅ Review dashboard daily to catch issues early
✅ Respond to issues quickly
✅ Use due date overrides when customer dates change
✅ Export data regularly for backups (monthly recommended)

---

## Technical Details

### Architecture

- **Frontend:** React 18 + TypeScript + Material UI v7
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Authentication:** JWT-based with auto-refresh
- **Multi-Tenancy:** Row-Level Security (RLS)
- **Real-Time:** Supabase Realtime subscriptions

### Security

- Tenant isolation at database level (RLS policies)
- API key hashing with bcrypt
- HMAC-SHA256 signatures for webhooks
- Signed URLs for file access (1-hour expiration)
- Role-based access control (admin vs operator)

### Performance

- React Query caching (5-minute stale time)
- Edge Function caching (5s with 10s stale-while-revalidate)
- Pagination (100 records per page, max 1000)
- Database indexing on tenant_id and foreign keys

---

**Last Updated:** November 22, 2025
**Version:** 1.1
**Status:** Active
**Changelog:** Added Operator Terminal documentation and QRM capacity management features
