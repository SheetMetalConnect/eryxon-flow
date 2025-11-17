# Eryxon MES - UI/UX Redesign Plan
**Modern 2025 SaaS Navigation & Information Architecture**

---

## Executive Summary

This document outlines a comprehensive UI/UX redesign for Eryxon MES based on first principles thinking, modern SaaS patterns, and user-centered design for metalworking operations.

**Core Philosophy:**
- Operators need speed, clarity, and zero friction
- Admins need power, visibility, and control
- Both need intuitive navigation that matches their mental model

---

## 1. First Principles Analysis

### What Does This App Actually Do?

**Core Function:** Track manufacturing work (jobs → parts → operations) through production stages in real-time.

**Primary Users:**
1. **Operators (80% of daily active users)**
   - Execute work on the shop floor
   - Mobile/tablet-first usage
   - Need: Speed, simplicity, zero distractions
   - Mental model: "What should I work on next?"

2. **Admins (20% of users, power users)**
   - Oversee production, assign work, configure system
   - Desktop-first usage
   - Need: Overview, control, deep access
   - Mental model: "What's happening? Who's doing what? What needs my attention?"

### Critical User Flows

#### Operator Flow (Daily, 20-50x per day)
```
1. Login
2. → Work Queue (PRIMARY SCREEN - 90% of time)
3. → Select operation
4. → View details (drawings, 3D model, instructions)
5. → Start timer
6. → Complete work
7. → (Optional) Report issue
8. → Repeat
```

**Time on each screen:**
- Work Queue: 85%
- Operation Detail: 10%
- My Activity/Issues: 5%

#### Admin Flow (Daily, varied)
```
1. Login
2. → Dashboard (OVERVIEW - "what needs attention?")
3. → Branch to:
   - Assign new work to operators
   - Review/resolve issues
   - Create/manage jobs & parts
   - Monitor real-time progress
4. → (Weekly/Monthly) Configure system settings
5. → (Rarely) Export data, manage subscription
```

**Time on each screen:**
- Dashboard: 20%
- Jobs/Parts: 30%
- Assignments: 20%
- Issues: 15%
- Real-time monitoring: 10%
- Configuration: 5%

---

## 2. Information Architecture Problems (Current State)

### Admin Sidebar Issues

**Current:** 15 items split between main nav (7) and collapsible config (8)

❌ **Problems:**
1. **Cognitive overload** - Too many choices on every page
2. **Poor hierarchy** - Equal visual weight for daily vs monthly tasks
3. **Pricing in main nav** - Not a daily task, takes prime real estate
4. **Work Queue for admins** - Rarely used, takes top position
5. **API Docs buried in config** - It's reference material, not configuration
6. **No browsing pattern** - Jobs and Parts are separate, no unified "browse all data"
7. **Settings scattered** - User settings vs system config vs subscription in different places

### Operator Navigation Issues

✅ **Current state is mostly good** - Simple 3-tab navigation works well

⚠️ **Minor improvements needed:**
1. Currently Timing Widget could be more prominent
2. No quick access to recently completed work
3. Issue reporting flow could be smoother

---

## 3. Redesigned Information Architecture

### Universal Principles

1. **Top Bar = Global Actions** (search, create, notifications, profile)
2. **Left Sidebar = Core Navigation** (what you use daily)
3. **Settings = Tucked Away** (bottom of sidebar or user menu)
4. **Context = In-page** (filters, actions, details stay in page context)

---

## 4. Admin Navigation Redesign

### Top App Bar (Always Visible)

```
┌────────────────────────────────────────────────────────────────┐
│ [Logo] Eryxon    [Search: Jobs, Parts, Operators...]          │
│                                                                │
│                  [+ New] [🔔 3] [Theme] [Lang] [User Avatar ▼]│
└────────────────────────────────────────────────────────────────┘
```

**Components:**
- **Logo + App Name** (left)
- **Global Search** (center/left-center)
  - Search across: Jobs, Parts, Operations, Operators, Issues
  - Keyboard shortcut: Cmd/Ctrl + K
  - Fuzzy search with instant results
  - Shows entity type badges in results
- **Quick Actions Menu** (right side)
  - **[+ New]** dropdown:
    - New Job
    - New Part
    - New Assignment
    - New Issue (admin-created)
  - **[🔔 Notifications]** with badge count:
    - New issues reported
    - Assignments overdue
    - Jobs due this week
    - System alerts
  - **[Theme Toggle]** - Light/Dark mode
  - **[Language Switcher]** - EN/DE/NL
  - **[User Avatar + Menu]** - Profile, Settings, Sign Out

### Left Sidebar (Primary Navigation)

**Hierarchy: Grouped by function, frequent → infrequent top to bottom**

```
┌─────────────────────────┐
│ OVERVIEW                │
│ ━━━━━━━━━━━━━━━━━━━━━━ │
│ 📊 Dashboard            │ ← Home/default for admins
│                         │
│ OPERATIONS              │
│ ━━━━━━━━━━━━━━━━━━━━━━ │
│ 👷 Assignments          │ ← Daily: Assign work
│ ⚠️  Issues (3)          │ ← Daily: Resolve issues (badge count)
│ ⏱️  Activity Monitor    │ ← Daily: Real-time "who's working on what"
│                         │
│ DATA                    │
│ ━━━━━━━━━━━━━━━━━━━━━━ │
│ 📋 Jobs                 │ ← Core data: Browse/create jobs
│ 🔧 Parts                │ ← Core data: Browse parts
│ ✓  Operations           │ ← NEW: Browse all operations
│                         │
│ ─────────────────────── │ ← Visual separator
│                         │
│ ⚙️  Settings            │ ← Click to expand/collapse or navigate to settings page
│ 📖 Docs & Help          │ ← External links, API docs, support
│                         │
│ [Operator View]         │ ← Switch to operator mode (at bottom)
└─────────────────────────┘
```

**Navigation Items (8 main items):**

1. **📊 Dashboard** - Overview, KPIs, what needs attention
2. **👷 Assignments** - Assign parts/operations to operators (daily task)
3. **⚠️ Issues** - Global issue queue with badge count (daily task)
4. **⏱️ Activity Monitor** - Real-time: who's working on what, active timers (NEW - consolidates real-time visibility)
5. **📋 Jobs** - Browse/search/create jobs
6. **🔧 Parts** - Browse/search parts
7. **✓ Operations** - NEW: Browse all operations across all jobs/parts
8. **⚙️ Settings** - System configuration (expandable or dedicated page)
9. **📖 Docs & Help** - API docs, help center, pricing info

**Settings Page/Section (Consolidated):**

Instead of collapsible sidebar menu, create a dedicated **Settings** page with tabs:

```
Settings Page Layout:
┌────────────────────────────────────────────────┐
│ Settings                                       │
│ ┌────────────────────────────────────────────┐│
│ │ [Team] [Workflow] [Resources] [Integration]││
│ │ [Subscription] [Security] [Data]           ││
│ └────────────────────────────────────────────┘│
│                                                │
│ Team Tab:                                      │
│ - Users (operators, admins, machines)          │
│ - Roles & permissions                          │
│                                                │
│ Workflow Tab:                                  │
│ - Stages (production workflow)                 │
│ - Materials catalog                            │
│ - Templates                                    │
│                                                │
│ Resources Tab:                                 │
│ - Tools, fixtures, molds                       │
│ - Equipment catalog                            │
│                                                │
│ Integration Tab:                               │
│ - API Keys                                     │
│ - Webhooks                                     │
│ - Connected systems                            │
│                                                │
│ Subscription Tab:                              │
│ - Current plan                                 │
│ - Usage stats                                  │
│ - Upgrade options                              │
│ - Billing (future)                             │
│                                                │
│ Security Tab:                                  │
│ - Access logs                                  │
│ - Session management                           │
│ - Two-factor auth (future)                     │
│                                                │
│ Data Tab:                                      │
│ - Export data (CSV/JSON)                       │
│ - Import tools                                 │
│ - Backup/restore                               │
└────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Reduces sidebar clutter from 15 → 9 items
- ✅ Groups related settings together
- ✅ Allows for richer settings UI (tabs, sections, search within settings)
- ✅ Matches modern SaaS patterns (Notion, Linear, Slack)

### User Menu (Avatar Dropdown)

```
┌─────────────────────────┐
│ John Smith              │
│ john@company.com        │
│ ━━━━━━━━━━━━━━━━━━━━━━ │
│ 👤 My Profile           │
│ ⚙️  Preferences          │ ← Personal settings (notifications, language, theme)
│ 📖 Help & Docs          │
│ ━━━━━━━━━━━━━━━━━━━━━━ │
│ 🚪 Sign Out             │
└─────────────────────────┘
```

---

## 5. Operator Navigation Redesign

### Mobile/Tablet (Primary)

**Top Bar (Sticky):**
```
┌─────────────────────────────────────┐
│ [≡] Eryxon      [🔔] [Theme] [👤▼] │
└─────────────────────────────────────┘
```

**Currently Timing Widget (Sticky, below top bar):**
```
┌─────────────────────────────────────┐
│ 🟢 TIMING: Part #1234-AB            │
│ Laser Cutting • 00:23:45            │
│ [Pause] [Stop] [Details]            │
└─────────────────────────────────────┘
```

**Main Content Area:**
- Work Queue (cards/list)
- Operation details
- Activity history
- Issues

**Bottom Navigation (Fixed):**
```
┌─────────────────────────────────────┐
│ [📋 Queue] [✓ Done] [⚠️ Issues]    │
│   Active      30        3           │
└─────────────────────────────────────┘
```

**Navigation Items:**
1. **📋 Work Queue** - Available operations (primary)
2. **✓ Completed** - Recently completed work (last 7 days)
3. **⚠️ Issues** - My reported issues

**Removed:** "My Activity" → Renamed to "Completed" (clearer intent)

### Desktop (Alternative Layout)

**Top Bar (same as mobile):**

**Horizontal Tabs (below top bar):**
```
┌─────────────────────────────────────┐
│ [Work Queue] [Completed] [Issues]   │
└─────────────────────────────────────┘
```

**Currently Timing Widget (Integrated into top bar or as a card)**

---

## 6. New & Modified Pages

### NEW: Activity Monitor (Admin)

**Purpose:** Real-time visibility into shop floor activity

**Replaces/Consolidates:**
- Current "Dashboard" real-time table
- Scattered "who's working on what" data

**Layout:**
```
Activity Monitor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Filters: [All Operators ▼] [All Stages ▼] [Active Only ✓]

┌─────────────────────────────────────────────────────────┐
│ Operator      │ Status    │ Current Operation │ Duration│
│───────────────│───────────│───────────────────│─────────│
│ 🟢 John Smith │ Working   │ Laser Cut #1234   │ 00:23:45│
│ 🟡 Jane Doe   │ Paused    │ Bend #5678        │ 01:12:30│
│ ⚪ Mike Jones │ Idle      │ -                 │ -       │
└─────────────────────────────────────────────────────────┘

Real-time updates via WebSocket
Last updated: 2 seconds ago
```

**Features:**
- Live status indicators (green = working, yellow = paused, white = idle)
- Click operator → see their full queue
- Click operation → see operation details
- Filterable by operator, stage, status
- Export current snapshot

### NEW: Operations Page (Admin)

**Purpose:** Browse all operations across all jobs/parts in one place

**Why:** Currently you must go Job → Part → Operations. This allows direct operation-level visibility.

**Layout:**
```
Operations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Filters: [All Stages ▼] [All Materials ▼] [Status ▼] [Assigned ▼]
Search: [Search by part number, operation, operator...]

┌─────────────────────────────────────────────────────────────┐
│ Operation │ Part      │ Job       │ Stage  │ Assigned │ Status│
│───────────│───────────│───────────│────────│──────────│───────│
│ Laser Cut │ #1234-AB  │ JOB-0001  │ Cut    │ John S.  │ Active│
│ Bend      │ #1234-AB  │ JOB-0001  │ Bend   │ Jane D.  │ Queue │
│ Weld      │ #5678-CD  │ JOB-0002  │ Weld   │ -        │ Open  │
└─────────────────────────────────────────────────────────────┘

Bulk Actions: [Assign Selected] [Export]
```

**Features:**
- Filter by stage, material, status, assigned operator
- Bulk assign operations to operators
- See operation → part → job hierarchy
- Quick actions: assign, view details, reschedule

### MODIFIED: Dashboard Page (Admin)

**Current:** KPI cards + real-time activity table

**New:** Focus on actionable insights, not just stats

```
Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEEDS ATTENTION (Action Items)
┌──────────────────────────────────────────────┐
│ ⚠️  3 Issues Pending Review                  │ → Go to Issues
│ 🔴 5 Jobs Due This Week                      │ → Filter Jobs
│ ⏰ 12 Operations Overdue                     │ → Go to Operations
│ 👷 2 Operators Idle > 1 hour                 │ → Activity Monitor
└──────────────────────────────────────────────┘

TODAY'S SNAPSHOT
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 🟢 Working  │ ✓ Completed │ 📋 Queued   │ ⚠️ Issues   │
│ 8 operators │ 24 ops      │ 47 ops      │ 3 open      │
└─────────────┴─────────────┴─────────────┴─────────────┘

RECENT ACTIVITY (Last 2 Hours)
┌──────────────────────────────────────────────┐
│ 10:45 - John Smith completed Laser Cut #1234 │
│ 10:30 - Jane Doe started Bend #5678          │
│ 10:15 - Issue reported on Weld #9012         │
└──────────────────────────────────────────────┘

STAGE BOTTLENECKS (QRM Indicators)
┌──────────────────────────────────────────────┐
│ Stage      │ WIP │ Avg Time │ Status        │
│────────────│─────│──────────│───────────────│
│ Laser Cut  │ 12  │ 2.3h     │ 🟢 Normal     │
│ Bending    │ 23  │ 4.1h     │ 🟡 High WIP   │
│ Welding    │ 8   │ 1.8h     │ 🟢 Normal     │
│ Assembly   │ 31  │ 6.2h     │ 🔴 Bottleneck │
└──────────────────────────────────────────────┘
```

**Focus:**
1. **Action items first** - What needs my attention NOW?
2. **At-a-glance status** - Quick metrics
3. **Recent activity** - What just happened?
4. **Bottleneck detection** - QRM principles (WIP limits, flow visualization)

### MODIFIED: Settings Page (NEW Consolidated View)

**Current:** Scattered across 8 separate pages in collapsible sidebar

**New:** Single settings hub with tabbed navigation (as described in Section 4)

---

## 7. Global Features (Added Across App)

### Global Search (Cmd/Ctrl + K)

**Accessible:** Top bar, always visible

**Searches:**
- Jobs (by number, customer, description)
- Parts (by number, job, material)
- Operations (by part, stage, assigned operator)
- Operators (by name, email)
- Issues (by description, part)

**Results UI:**
```
Search: "1234"

Jobs (2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 JOB-1234 - Customer ABC - Due 2025-11-20
📋 JOB-2345 - Customer XYZ - Due 2025-11-25

Parts (5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 Part #1234-AB - Steel - Cutting Stage
🔧 Part #1234-CD - Aluminum - Welding Stage
...

Operations (12)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Laser Cut - Part #1234-AB - Completed
⏱️ Bend - Part #1234-AB - In Progress
...
```

**Keyboard Navigation:**
- Up/Down arrows to navigate
- Enter to open selected item
- Esc to close

### Quick Create Menu ([+ New])

**Available Actions:**
- New Job (opens job creation modal/page)
- New Part (opens part creation modal with job selection)
- New Assignment (quick assign dialog)
- New Issue (admin-created issue, separate from operator reports)

**Opens:** Modal dialogs for quick creation without navigation

### Notifications Center ([🔔])

**Notification Types:**
1. **Issues** - New issue reported, issue escalated
2. **Assignments** - New work assigned to operators (if admin wants to track)
3. **Jobs** - Job due soon, job overdue
4. **System** - Integration errors, webhook failures, quota warnings

**UI:**
```
Notifications (3 unread)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 New Issue Reported                  2m ago
    Part #1234 - Laser cutting defect
    [View Issue]

🟡 Job Due Tomorrow                   1h ago
    JOB-0045 - Customer ABC
    [View Job]

🟢 Assignment Completed               3h ago
    John Smith completed Bend #5678
    [View Details]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Mark All Read] [Settings]
```

**Settings:**
- Choose which notifications to receive
- Email notifications (future)
- Desktop notifications (future)

---

## 8. Visual Design System Updates

### Color System (Status Indicators)

**Job/Operation Status:**
- 🔵 **Blue** - Not Started / Queued
- 🟡 **Yellow** - In Progress / Active
- 🟢 **Green** - Completed
- 🔴 **Red** - Overdue / Blocked / High Priority Issue
- ⚫ **Gray** - Cancelled / Inactive / Archived

**User Status (Real-time):**
- 🟢 **Green** - Working (active timer)
- 🟡 **Yellow** - Paused (timer paused)
- ⚪ **White/Gray** - Idle (no active timer)
- 🔴 **Red** - Issue reported / Needs attention

**Issue Severity:**
- 🔴 **High** - Critical, stops production
- 🟡 **Medium** - Important, affects quality
- 🟢 **Low** - Minor, informational

### Typography Hierarchy

**Page Titles:** 32px, Bold
**Section Headers:** 24px, Semibold
**Card Titles:** 18px, Medium
**Body Text:** 16px, Regular
**Helper Text:** 14px, Regular
**Small Labels:** 12px, Medium (uppercase)

### Spacing System

**Page margins:** 24px (mobile), 48px (tablet), 64px (desktop)
**Card padding:** 16px (mobile), 24px (desktop)
**Section spacing:** 32px between major sections
**Element spacing:** 8px (tight), 16px (normal), 24px (loose)

### Component Updates

**Cards:**
- Subtle shadows (elevation)
- Rounded corners (8px)
- Hover states (lift effect)
- Click states (slight scale down)

**Tables:**
- Zebra striping (subtle, every other row)
- Hover rows (highlight background)
- Sticky headers
- Responsive (stack on mobile)

**Buttons:**
- Primary: Brand color, white text, shadow
- Secondary: Outline, brand color text
- Tertiary: Ghost, no border, brand color text
- Danger: Red, white text (destructive actions)

---

## 9. Responsive Breakpoints

**Mobile:** < 768px
- Bottom navigation for operators
- Hamburger menu for admins
- Single column layouts
- Collapsible filters
- Full-width modals

**Tablet:** 768px - 1024px
- Sidebar navigation (collapsible)
- Two-column layouts
- Side-by-side modals (where appropriate)

**Desktop:** > 1024px
- Full sidebar navigation (always visible)
- Multi-column layouts
- Larger modals with more details
- Hover interactions

---

## 10. Keyboard Shortcuts (Admin Power Users)

**Global:**
- `Cmd/Ctrl + K` - Global search
- `Cmd/Ctrl + N` - Quick create menu
- `Cmd/Ctrl + B` - Toggle sidebar (desktop)
- `Esc` - Close modal/dialog

**Navigation:**
- `G then D` - Go to Dashboard
- `G then J` - Go to Jobs
- `G then P` - Go to Parts
- `G then O` - Go to Operations
- `G then A` - Go to Assignments
- `G then I` - Go to Issues
- `G then M` - Go to Activity Monitor

**Actions:**
- `C` - Create new (context-dependent)
- `E` - Edit selected item
- `Del` - Delete selected item (with confirmation)
- `?` - Show keyboard shortcuts help

---

## 11. Accessibility Improvements

**WCAG 2.1 AA Compliance:**

1. **Color Contrast:**
   - All text: minimum 4.5:1 ratio
   - Large text: minimum 3:1 ratio
   - Interactive elements: visible focus indicators

2. **Keyboard Navigation:**
   - All interactive elements focusable via Tab
   - Logical tab order
   - Skip links for main content
   - Focus trapping in modals

3. **Screen Readers:**
   - Semantic HTML (nav, main, aside, article)
   - ARIA labels for icon buttons
   - ARIA live regions for real-time updates
   - Alt text for all images

4. **Forms:**
   - Clear labels for all inputs
   - Error messages associated with fields
   - Fieldsets for grouped inputs
   - Required field indicators

5. **Touch Targets:**
   - Minimum 44px × 44px for mobile
   - Adequate spacing between clickable elements

---

## 12. Implementation Roadmap

### Phase 1: Admin Navigation Restructure (Week 1-2)

**Changes:**
1. Reduce sidebar items from 15 → 9
2. Create new consolidated Settings page
3. Add global search to top bar
4. Add quick create menu ([+ New])
5. Add notifications center
6. Move "Pricing" out of main nav → Docs & Help
7. Remove "Work Queue" from admin sidebar (accessible via search if needed)

**Files to modify:**
- `src/components/admin/AdminLayout.tsx` - Sidebar items
- `src/pages/admin/Settings.tsx` - NEW consolidated settings page
- `src/components/GlobalSearch.tsx` - NEW search component
- `src/components/QuickCreateMenu.tsx` - NEW quick create
- `src/components/NotificationsCenter.tsx` - NEW notifications

### Phase 2: New Pages (Week 2-3)

**Add:**
1. Activity Monitor page (`src/pages/admin/ActivityMonitor.tsx`)
2. Operations page (`src/pages/admin/Operations.tsx`)
3. Consolidated Settings page with tabs

**Modify:**
1. Dashboard page - focus on action items vs pure stats

### Phase 3: Operator UX Polish (Week 3-4)

**Changes:**
1. Rename "My Activity" → "Completed" (clearer intent)
2. Enhance Currently Timing Widget (larger, more prominent)
3. Improve issue reporting flow (smoother modal)
4. Add quick filters to Work Queue (by material, by stage)

**Files to modify:**
- `src/components/operator/OperatorLayout.tsx`
- `src/components/operator/CurrentlyTimingWidget.tsx`
- `src/pages/operator/WorkQueue.tsx`

### Phase 4: Global Features (Week 4-5)

**Add:**
1. Global search (Cmd/Ctrl + K)
2. Keyboard shortcuts
3. Real-time notifications
4. Enhanced accessibility features

### Phase 5: Visual Design Updates (Week 5-6)

**Apply:**
1. Updated color system
2. Refined typography
3. New component styles (cards, tables, buttons)
4. Consistent spacing system
5. Smooth transitions/animations

### Phase 6: Testing & Refinement (Week 6-7)

**Activities:**
1. User testing with real operators
2. Admin feedback sessions
3. Accessibility audit
4. Performance testing
5. Mobile/tablet testing
6. Cross-browser testing

---

## 13. Success Metrics

### Operator Metrics (Mobile/Tablet)

**Current Baseline:**
- Time to find next operation: ?
- Time to start timer: ?
- Time to report issue: ?
- Daily active sessions: ?

**Target Improvements:**
- 30% faster to find next operation
- 50% faster to start timer (one-tap from card)
- 40% faster to report issue (streamlined modal)
- Increased daily active sessions

### Admin Metrics (Desktop)

**Current Baseline:**
- Time to assign work: ?
- Time to find specific job/part: ?
- Time to resolve issue: ?
- Configuration task completion rate: ?

**Target Improvements:**
- 40% faster to assign work (bulk actions)
- 60% faster to find specific job/part (global search)
- 30% faster to resolve issue (streamlined queue)
- Increased settings task completion (clearer navigation)

### Overall App Metrics

**Current:**
- Navigation depth (clicks to reach any page): ?
- Settings task completion rate: ?
- User satisfaction (NPS): ?

**Targets:**
- Maximum 2 clicks to any page (via search or nav)
- 25% higher settings task completion
- +20 NPS improvement

---

## 14. Migration Strategy

### For Existing Users

**Onboarding Tour for New Navigation:**
```
Step 1: "Welcome to the new Eryxon!"
Step 2: "Find anything fast with Cmd+K"
Step 3: "Create jobs, parts, and more with the + menu"
Step 4: "Stay updated with notifications"
Step 5: "All settings now in one place"
```

**Announcement Banner:**
- Show for 7 days after update
- Highlight key changes
- Link to "What's New" page
- Option to take tour or dismiss

**Help Documentation:**
- Update all screenshots
- Create "What's New" changelog
- Video walkthrough (2-3 minutes)
- FAQ for common questions

---

## 15. Open Questions & Decisions Needed

### Questions for Stakeholders

1. **Global Search Scope:**
   - Should search include archived/completed items?
   - Should search results be limited (e.g., top 20)?
   - Should search be tenant-scoped only or cross-tenant for super-admins?

2. **Notifications:**
   - Which events should trigger notifications by default?
   - Should there be email notifications (future)?
   - Should notifications be role-specific?

3. **Activity Monitor:**
   - Should it show historical data or only real-time?
   - Should it include filtering by date range?
   - Should it have export capability?

4. **Operations Page:**
   - Should operations be editable directly from this view?
   - Should there be bulk edit capabilities?
   - Should it show operation history/logs?

5. **Settings Consolidation:**
   - Should settings be a separate page or modal?
   - Should each settings tab be a separate route or client-side tabs?
   - Should there be role-based settings (operator preferences vs admin config)?

6. **Quick Create:**
   - Should quick create open modals or navigate to full pages?
   - Should there be templates for common job/part types?
   - Should there be keyboard shortcuts for each create action?

---

## 16. Technical Considerations

### Performance

**Global Search:**
- Use debounced search (300ms delay)
- Implement fuzzy matching (Fuse.js or similar)
- Cache recent searches
- Lazy load results (virtual scrolling for large result sets)

**Real-time Updates:**
- Supabase Realtime subscriptions for Activity Monitor
- WebSocket connections for live status updates
- Optimistic UI updates for better perceived performance

**Navigation:**
- Route-based code splitting
- Lazy load settings tabs
- Prefetch common routes

### State Management

**Global State:**
- Auth context (existing)
- Theme context (existing)
- NEW: Notifications context
- NEW: Search context

**Data Caching:**
- React Query for server state (existing)
- Persistent cache for frequently accessed data (jobs, parts, operators)

### Mobile Considerations

**Touch Interactions:**
- Swipe gestures for navigation (optional)
- Pull-to-refresh on lists
- Long-press for context menus
- Large touch targets (44px minimum)

**Offline Support (Future):**
- Service worker for offline capability
- Local storage for queued time entries
- Sync when connection restored

---

## 17. Design Mockup Priorities

**High Priority (Week 1):**
1. Admin sidebar (new structure)
2. Top bar with search, create, notifications
3. Consolidated Settings page layout
4. Activity Monitor page

**Medium Priority (Week 2-3):**
1. Operations page
2. Updated Dashboard
3. Global search UI
4. Notifications center UI

**Lower Priority (Week 3-4):**
1. Operator bottom nav (minor tweaks)
2. Enhanced timing widget
3. Issue reporting modal
4. Keyboard shortcuts overlay

---

## Appendix A: Navigation Comparison

### Admin Navigation: Before vs After

**BEFORE (15 items):**
```
Main Nav (7):
- Dashboard
- Work Queue        ← Rarely used by admins
- Jobs
- Parts
- Issues
- Assignments
- Pricing           ← Not a daily task

Config Submenu (8):
- Users
- Stages
- Materials
- Resources
- API Keys
- Webhooks
- Data Export
- API Docs
```

**AFTER (9 items):**
```
Main Nav (9):
- Dashboard
- Assignments       ← Promoted (daily task)
- Issues            ← With badge count
- Activity Monitor  ← NEW (real-time visibility)
- Jobs
- Parts
- Operations        ← NEW (browse all operations)
- Settings          ← Consolidated (all config in tabs)
- Docs & Help       ← API docs, pricing, support
```

**Key Changes:**
- ✅ Removed "Work Queue" from admin (accessible via search if needed)
- ✅ Removed "Pricing" from main nav (moved to Docs & Help)
- ✅ Consolidated 8 config items → 1 Settings page with tabs
- ✅ Added "Activity Monitor" for real-time visibility
- ✅ Added "Operations" for operation-level browsing
- ✅ Promoted "Assignments" and "Issues" (daily admin tasks)

### Operator Navigation: Before vs After

**BEFORE (3 tabs):**
```
- Work Queue
- My Activity       ← Ambiguous name
- My Issues
```

**AFTER (3 tabs):**
```
- Work Queue        ← Primary (unchanged)
- Completed         ← Renamed from "My Activity" (clearer)
- Issues            ← Shortened from "My Issues"
```

**Key Changes:**
- ✅ Renamed "My Activity" → "Completed" (clearer intent: see recently finished work)
- ✅ Shortened "My Issues" → "Issues" (cleaner, still clear in context)
- ✅ Enhanced "Currently Timing" widget (larger, more prominent)

---

## Appendix B: Route Structure (Updated)

### Public Routes
- `/` - Root redirect
- `/auth` - Login/signup
- `/onboarding` - First-time setup wizard

### Operator Routes
- `/work-queue` - Available operations (PRIMARY)
- `/completed` - Recently completed work (renamed from `/my-activity`)
- `/issues` - My reported issues (renamed from `/my-issues`)

### Admin Routes

**Core:**
- `/dashboard` - Overview & action items
- `/assignments` - Assign work to operators
- `/issues` - Global issue queue
- `/activity` - Real-time activity monitor (NEW)

**Data:**
- `/jobs` - Browse jobs
- `/jobs/new` - Create job
- `/jobs/:id` - Job detail
- `/parts` - Browse parts
- `/parts/:id` - Part detail
- `/operations` - Browse all operations (NEW)

**Settings (Consolidated):**
- `/settings` - Settings hub (NEW)
- `/settings/team` - Users & roles
- `/settings/workflow` - Stages, materials, templates
- `/settings/resources` - Tools, fixtures, equipment
- `/settings/integration` - API keys, webhooks
- `/settings/subscription` - Current plan, usage, billing
- `/settings/security` - Access logs, sessions
- `/settings/data` - Export, import, backup

**Help:**
- `/docs` - API documentation
- `/help` - Help center
- `/pricing` - Pricing info (view only for admins)

### Shared Routes (Both Roles)
- `/docs` - API docs
- `/help` - Help center

---

## Appendix C: Component Inventory (New/Modified)

### NEW Components (17)

**Admin:**
1. `GlobalSearch.tsx` - Search overlay (Cmd+K)
2. `QuickCreateMenu.tsx` - [+ New] dropdown
3. `NotificationsCenter.tsx` - [🔔] notifications panel
4. `ActivityMonitor.tsx` - Real-time activity page
5. `OperationsPage.tsx` - Browse all operations
6. `SettingsHub.tsx` - Consolidated settings page
7. `SettingsTeamTab.tsx` - Team settings
8. `SettingsWorkflowTab.tsx` - Workflow settings
9. `SettingsResourcesTab.tsx` - Resources settings
10. `SettingsIntegrationTab.tsx` - Integration settings
11. `SettingsSubscriptionTab.tsx` - Subscription settings
12. `SettingsSecurityTab.tsx` - Security settings
13. `SettingsDataTab.tsx` - Data management settings

**Operator:**
14. `CompletedWork.tsx` - Renamed/enhanced activity page

**Shared:**
15. `KeyboardShortcutsOverlay.tsx` - Shortcut help (?)
16. `SearchResultItem.tsx` - Search result component
17. `NotificationItem.tsx` - Individual notification

### MODIFIED Components (8)

1. `AdminLayout.tsx` - New sidebar structure, top bar additions
2. `OperatorLayout.tsx` - Minor nav tweaks, enhanced timing widget
3. `Dashboard.tsx` - Action-focused layout
4. `CurrentlyTimingWidget.tsx` - Larger, more prominent
5. `WorkQueue.tsx` (operator) - Quick filters
6. `IssueForm.tsx` - Streamlined modal
7. `JobDetailModal.tsx` - Enhanced with quick actions
8. `PartDetailModal.tsx` - Enhanced with quick actions

### REMOVED Components (8 separate config pages)

Consolidated into single Settings hub:
- `ConfigUsers.tsx` → `SettingsTeamTab.tsx`
- `ConfigStages.tsx` → `SettingsWorkflowTab.tsx`
- `ConfigMaterials.tsx` → `SettingsWorkflowTab.tsx`
- `ConfigResources.tsx` → `SettingsResourcesTab.tsx`
- `ConfigApiKeys.tsx` → `SettingsIntegrationTab.tsx`
- `ConfigWebhooks.tsx` → `SettingsIntegrationTab.tsx`
- `DataExport.tsx` → `SettingsDataTab.tsx`
- `MyPlan.tsx` → `SettingsSubscriptionTab.tsx`

---

## Summary

This redesign focuses on:

1. **Clarity** - Clear hierarchy, grouped by task frequency
2. **Efficiency** - Faster access to daily tasks (search, quick create, shortcuts)
3. **Simplicity** - Reduced cognitive load (9 vs 15 nav items for admins)
4. **Context** - Right information at the right time (notifications, real-time monitor)
5. **Consistency** - Modern SaaS patterns (settings hub, global search, quick actions)

**Next Steps:**
1. Review this plan with stakeholders
2. Answer open questions (Appendix A)
3. Create visual mockups (Figma/similar)
4. Begin Phase 1 implementation

**Timeline:** 6-7 weeks for full implementation

**Expected Impact:**
- 30-60% improvement in task completion speed
- Reduced training time for new users
- Higher user satisfaction and engagement
- Better alignment with modern SaaS UX expectations

---

**Document Version:** 1.0
**Last Updated:** 2025-11-17
**Author:** UI/UX Design Team
**Status:** Draft for Review
