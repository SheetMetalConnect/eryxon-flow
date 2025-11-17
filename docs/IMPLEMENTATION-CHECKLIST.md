# UI/UX Redesign - Implementation Checklist
**Actionable Tasks for Redesign Execution**

---

## Phase 1: Admin Navigation Restructure (Week 1-2)

### 1.1 Top Bar Enhancements

#### Global Search Component
- [ ] Create `src/components/GlobalSearch.tsx`
  - [ ] Search input with Cmd/Ctrl+K shortcut listener
  - [ ] Debounced search (300ms)
  - [ ] Multi-entity search (jobs, parts, operations, operators)
  - [ ] Grouped results display (by entity type)
  - [ ] Keyboard navigation (arrows, Enter, Esc)
  - [ ] Recent searches storage (localStorage)
  - [ ] Click-outside to close
  - [ ] Loading states
  - [ ] Empty states ("No results found")
- [ ] Add fuzzy search library (e.g., Fuse.js)
  ```bash
  npm install fuse.js
  ```
- [ ] Create search API endpoints (or use existing queries)
- [ ] Integrate into AdminLayout top bar
- [ ] Add keyboard shortcut registration
- [ ] Style search modal/dropdown
- [ ] Test search across all entity types

#### Quick Create Menu
- [ ] Create `src/components/QuickCreateMenu.tsx`
  - [ ] Dropdown menu component
  - [ ] Menu items: New Job, New Part, New Assignment, New Issue
  - [ ] Keyboard shortcuts display
  - [ ] Click handlers for each action
- [ ] Create quick creation modals:
  - [ ] `src/components/modals/QuickJobCreate.tsx`
  - [ ] `src/components/modals/QuickPartCreate.tsx`
  - [ ] `src/components/modals/QuickAssignmentCreate.tsx`
  - [ ] `src/components/modals/QuickIssueCreate.tsx`
- [ ] Integrate into AdminLayout top bar
- [ ] Add keyboard shortcut support (Cmd+N → open menu)
- [ ] Test modal workflows
- [ ] Add success/error toast notifications

#### Notifications Center
- [ ] Create `src/components/NotificationsCenter.tsx`
  - [ ] Dropdown panel component
  - [ ] Badge counter display
  - [ ] Notification list (grouped by priority/type)
  - [ ] Individual notification actions (view, dismiss)
  - [ ] Mark all read functionality
  - [ ] Settings link
- [ ] Create notification context/state management
  - [ ] `src/contexts/NotificationsContext.tsx`
  - [ ] Notification types (issue, assignment, job due, system)
  - [ ] Real-time subscription to notification events
- [ ] Create notifications API/database schema
  - [ ] `notifications` table (if not exists)
  - [ ] Columns: id, user_id, type, title, message, link, read, created_at
- [ ] Integrate into AdminLayout top bar
- [ ] Add real-time notification polling/WebSocket
- [ ] Create notification settings page/modal
- [ ] Test notification workflows

### 1.2 Sidebar Restructure

#### Update AdminLayout Sidebar
- [ ] Edit `src/components/admin/AdminLayout.tsx`
  - [ ] Remove items:
    - [ ] "Work Queue" (operators-only page)
    - [ ] "Pricing" (move to Docs & Help)
  - [ ] Add groupings with labels:
    - [ ] "OVERVIEW" section header
    - [ ] "OPERATIONS" section header
    - [ ] "DATA" section header
  - [ ] Reorder items by frequency:
    - [ ] Overview: Dashboard
    - [ ] Operations: Assignments, Issues (with badge), Activity Monitor (new)
    - [ ] Data: Jobs, Parts, Operations (new)
  - [ ] Add visual separator before bottom items
  - [ ] Bottom items: Settings, Docs & Help
  - [ ] Remove collapsible "Configuration" submenu
  - [ ] Add section header styling (uppercase, smaller font, grey)
  - [ ] Add icons to all nav items (consistent style)
  - [ ] Update active state highlighting
- [ ] Update routing to remove old config routes
- [ ] Test sidebar navigation
- [ ] Test responsive behavior (mobile drawer)

#### Add Badge Counts to Nav Items
- [ ] Create badge component `src/components/ui/NavBadge.tsx`
- [ ] Add badge to "Issues" nav item
  - [ ] Query count of pending issues
  - [ ] Real-time updates via subscription
  - [ ] Display badge only if count > 0
- [ ] (Optional) Add badges to other nav items (Assignments, Operations)
- [ ] Style badges (small circle, accent color, white text)

### 1.3 User Menu Updates

#### Enhance User Avatar Menu
- [ ] Edit user menu dropdown in `AdminLayout.tsx`
  - [ ] Add "My Profile" link
  - [ ] Add "Preferences" link (personal settings)
  - [ ] Add "Switch to Operator View" option (for testing)
  - [ ] Add separator
  - [ ] Add "Help & Docs" link
  - [ ] Add "Keyboard Shortcuts" link
  - [ ] Add separator
  - [ ] Keep "Sign Out"
- [ ] Create preferences page/modal
  - [ ] `src/components/modals/UserPreferences.tsx`
  - [ ] Settings: Notifications, Language, Theme, Auto-refresh intervals
- [ ] Create keyboard shortcuts help modal
  - [ ] `src/components/modals/KeyboardShortcuts.tsx`
  - [ ] List all shortcuts with descriptions
  - [ ] Grouped by category (Global, Navigation, Actions)
  - [ ] Triggered by `?` key
- [ ] Implement "Switch to Operator View" functionality
  - [ ] Temporary role switch (session-based, doesn't change DB)
  - [ ] Redirect to `/work-queue` with operator layout
  - [ ] Add banner "Viewing as Operator" with switch back option

---

## Phase 2: New Pages (Week 2-3)

### 2.1 Activity Monitor Page

- [ ] Create `src/pages/admin/ActivityMonitor.tsx`
  - [ ] Page layout with filters
  - [ ] Real-time operator status table
  - [ ] Status indicators (🟢 working, 🟡 paused, ⚪ idle)
  - [ ] Stage overview section (WIP, bottlenecks)
  - [ ] Auto-refresh toggle (5s, 10s, 30s, manual)
  - [ ] Export snapshot button
- [ ] Create real-time query/subscription
  - [ ] Query active time entries (currently timing)
  - [ ] Subscribe to time entry changes (Supabase Realtime)
  - [ ] Calculate durations in real-time
- [ ] Add filters:
  - [ ] Filter by operator (multi-select)
  - [ ] Filter by stage (multi-select)
  - [ ] Filter by status (active, paused, idle)
  - [ ] "Active Only" toggle
- [ ] Add stage bottleneck detection
  - [ ] Calculate WIP per stage
  - [ ] Define WIP limits (configurable)
  - [ ] Color code stages (green/yellow/red)
  - [ ] Show average time per stage
- [ ] Add click interactions:
  - [ ] Click operator → see their full queue
  - [ ] Click operation → operation detail modal
  - [ ] Click stage → filter operations by stage
- [ ] Add export functionality
  - [ ] Export current snapshot as CSV
  - [ ] Include timestamp in filename
- [ ] Add to sidebar navigation
- [ ] Add route to `App.tsx`
- [ ] Test real-time updates
- [ ] Test performance with many active operators

### 2.2 Operations Page

- [ ] Create `src/pages/admin/Operations.tsx`
  - [ ] Page layout with filters and search
  - [ ] Operations table (sortable, filterable)
  - [ ] Multiple view modes (list, grid, kanban)
  - [ ] Bulk selection with checkboxes
  - [ ] Bulk action toolbar
- [ ] Create operations query
  - [ ] Query all operations across all jobs/parts
  - [ ] Join with parts, jobs, operators data
  - [ ] Pagination (virtual scrolling or infinite scroll)
  - [ ] Sorting by any column
- [ ] Add filters:
  - [ ] Stage filter (multi-select)
  - [ ] Material filter (multi-select)
  - [ ] Status filter (not started, in progress, completed, overdue)
  - [ ] Assigned operator filter (including unassigned)
  - [ ] Search by part number, operation name, operator
- [ ] Add view mode toggles:
  - [ ] List view (table, default)
  - [ ] Grid view (cards)
  - [ ] Kanban view (by stage)
- [ ] Add bulk actions:
  - [ ] Bulk assign to operator
  - [ ] Bulk change stage
  - [ ] Bulk export (CSV)
  - [ ] Bulk delete (with confirmation)
- [ ] Add row actions:
  - [ ] View operation details (modal)
  - [ ] Assign to operator (quick assign)
  - [ ] Navigate to part detail
  - [ ] Navigate to job detail
- [ ] Add to sidebar navigation
- [ ] Add route to `App.tsx`
- [ ] Test filtering and searching
- [ ] Test bulk operations
- [ ] Test performance with many operations (1000+)

### 2.3 Settings Hub (Consolidated)

- [ ] Create `src/pages/admin/Settings.tsx`
  - [ ] Page layout with tab navigation
  - [ ] 7 tabs: Team, Workflow, Resources, Integration, Subscription, Security, Data
  - [ ] Tab routing (URL-based: `/settings?tab=team`)
  - [ ] Active tab highlighting
  - [ ] Responsive tabs (dropdown on mobile)
- [ ] Create tab components:
  - [ ] `src/components/admin/settings/TeamTab.tsx`
  - [ ] `src/components/admin/settings/WorkflowTab.tsx`
  - [ ] `src/components/admin/settings/ResourcesTab.tsx`
  - [ ] `src/components/admin/settings/IntegrationTab.tsx`
  - [ ] `src/components/admin/settings/SubscriptionTab.tsx`
  - [ ] `src/components/admin/settings/SecurityTab.tsx`
  - [ ] `src/components/admin/settings/DataTab.tsx`

#### Team Tab (Settings)
- [ ] Migrate `ConfigUsers.tsx` content to `TeamTab.tsx`
  - [ ] Users table (existing functionality)
  - [ ] Add user form (existing functionality)
  - [ ] User roles & permissions display
  - [ ] Role descriptions
- [ ] Add roles & permissions section
  - [ ] Role definitions (admin, operator, machine)
  - [ ] Permission matrix display
  - [ ] (Future) Custom role creation

#### Workflow Tab (Settings)
- [ ] Migrate `ConfigStages.tsx` content to `WorkflowTab.tsx`
  - [ ] Stages table with sequence ordering
  - [ ] Add/edit stage forms
  - [ ] Color coding
  - [ ] Active/inactive toggle
- [ ] Migrate `ConfigMaterials.tsx` content to `WorkflowTab.tsx`
  - [ ] Materials table
  - [ ] Add/edit material forms
  - [ ] Color coding
- [ ] Add sub-tabs or sections:
  - [ ] "Stages" section
  - [ ] "Materials" section
  - [ ] (Future) "Templates" section

#### Resources Tab (Settings)
- [ ] Migrate `ConfigResources.tsx` content to `ResourcesTab.tsx`
  - [ ] Resources table (tools, fixtures, molds)
  - [ ] Add/edit resource forms
  - [ ] Cost tracking
  - [ ] Availability status
- [ ] Add resource assignment view
  - [ ] Show which operations use which resources
  - [ ] (Future) Resource scheduling/availability calendar

#### Integration Tab (Settings)
- [ ] Migrate `ConfigApiKeys.tsx` content to `IntegrationTab.tsx`
  - [ ] API keys table
  - [ ] Generate new key
  - [ ] Revoke key
  - [ ] Copy to clipboard
  - [ ] Usage tracking/logs
- [ ] Migrate `ConfigWebhooks.tsx` content to `IntegrationTab.tsx`
  - [ ] Webhooks table
  - [ ] Add/edit webhook forms
  - [ ] Event selection
  - [ ] Test webhook button
  - [ ] Webhook logs/history
- [ ] Add sub-sections or tabs:
  - [ ] "API Keys" section
  - [ ] "Webhooks" section
  - [ ] (Future) "Connected Systems" section

#### Subscription Tab (Settings)
- [ ] Migrate `MyPlan.tsx` content to `SubscriptionTab.tsx`
  - [ ] Current plan display
  - [ ] Plan features list
  - [ ] Usage statistics (jobs, parts, storage)
  - [ ] Upgrade buttons
- [ ] Add usage visualization
  - [ ] Progress bars for limits (jobs, parts, storage)
  - [ ] Historical usage chart (optional)
  - [ ] Quota warnings
- [ ] Add billing section (future)
  - [ ] Payment method
  - [ ] Billing history
  - [ ] Invoices download

#### Security Tab (Settings)
- [ ] Create new `SecurityTab.tsx`
  - [ ] Access logs table
    - [ ] User login/logout events
    - [ ] IP address tracking
    - [ ] Device/browser info
    - [ ] Date/time
  - [ ] Active sessions table
    - [ ] Current sessions for user
    - [ ] Revoke session button
  - [ ] (Future) Two-factor authentication setup
  - [ ] (Future) SSO configuration (Premium tier)

#### Data Tab (Settings)
- [ ] Migrate `DataExport.tsx` content to `DataTab.tsx`
  - [ ] Export format selection (CSV, JSON)
  - [ ] Entity selection (jobs, parts, operations, etc.)
  - [ ] Date range filter (optional)
  - [ ] Export button
  - [ ] Download as ZIP
- [ ] Add import section (future)
  - [ ] Import jobs/parts from CSV
  - [ ] Validation preview before import
  - [ ] Import history
- [ ] Add backup/restore section (Premium tier, future)

#### Settings Page Finalization
- [ ] Update all old config page routes to redirect to settings
  - [ ] `/admin/users` → `/settings?tab=team`
  - [ ] `/admin/stages` → `/settings?tab=workflow`
  - [ ] `/admin/materials` → `/settings?tab=workflow`
  - [ ] `/admin/resources` → `/settings?tab=resources`
  - [ ] `/admin/config/api-keys` → `/settings?tab=integration`
  - [ ] `/admin/config/webhooks` → `/settings?tab=integration`
  - [ ] `/admin/data-export` → `/settings?tab=data`
  - [ ] `/my-plan` → `/settings?tab=subscription`
- [ ] Remove old config page files (after migration confirmed)
- [ ] Update all internal links to new settings routes
- [ ] Add settings route to `App.tsx`
- [ ] Add settings to sidebar navigation
- [ ] Test all tabs and functionality
- [ ] Test tab routing and deep linking

### 2.4 Dashboard Redesign

- [ ] Edit `src/pages/admin/Dashboard.tsx`
  - [ ] Redesign layout with action-first focus
  - [ ] Add "NEEDS ATTENTION" section (top)
    - [ ] Pending issues count (clickable → Issues page)
    - [ ] Jobs due this week (clickable → Jobs filtered)
    - [ ] Operations overdue (clickable → Operations filtered)
    - [ ] Idle operators > 1 hour (clickable → Activity Monitor)
  - [ ] Add "TODAY'S SNAPSHOT" cards
    - [ ] Active operators count
    - [ ] Completed operations today
    - [ ] Queued operations
    - [ ] Open issues
  - [ ] Add "RECENT ACTIVITY" feed
    - [ ] Last 2 hours of activity
    - [ ] Operation completions
    - [ ] New issues
    - [ ] New jobs/parts
    - [ ] Real-time updates
  - [ ] Add "STAGE BOTTLENECKS" section
    - [ ] WIP per stage
    - [ ] Average time per stage
    - [ ] Status indicators (green/yellow/red)
    - [ ] Link to Activity Monitor
- [ ] Create action item queries
  - [ ] Pending issues count
  - [ ] Jobs due within 7 days
  - [ ] Overdue operations
  - [ ] Idle operators (no active time entry > 1 hour)
- [ ] Add click handlers for action items
  - [ ] Navigate to filtered pages
  - [ ] Pass filter params via URL
- [ ] Style with hierarchy (action items most prominent)
- [ ] Test real-time updates
- [ ] Test all click-through navigation

---

## Phase 3: Operator UX Polish (Week 3-4)

### 3.1 Navigation Improvements

- [ ] Edit `src/components/operator/OperatorLayout.tsx`
  - [ ] Rename "My Activity" → "Completed" or "✓ Done"
  - [ ] Update tab labels (bottom nav and desktop tabs)
  - [ ] Add badge counts to tabs:
    - [ ] Work Queue: count of available operations
    - [ ] Completed: count of operations completed today
    - [ ] Issues: count of open issues
  - [ ] Add notifications icon to top bar
    - [ ] Badge count for new assignments
    - [ ] Simple dropdown (fewer features than admin)
- [ ] Rename route and page file
  - [ ] `/my-activity` → `/completed`
  - [ ] `src/pages/operator/MyActivity.tsx` → `Completed.tsx`
  - [ ] Update all internal links
  - [ ] Add redirect for old URL (backward compatibility)

### 3.2 Currently Timing Widget Enhancement

- [ ] Edit `src/components/operator/CurrentlyTimingWidget.tsx`
  - [ ] Increase size (larger card, more prominent)
  - [ ] Add part number display (larger font)
  - [ ] Add operation type display
  - [ ] Add stage indicator (color-coded)
  - [ ] Make timer more prominent (larger font, bold)
  - [ ] Add "Details" button (quick access to operation detail)
  - [ ] Improve mobile layout (stack elements vertically)
  - [ ] Add subtle animation (pulsing border when active)
- [ ] Test on mobile devices (actual phones/tablets)
- [ ] Test accessibility (screen reader, keyboard nav)

### 3.3 Work Queue Enhancements

- [ ] Edit `src/pages/operator/WorkQueue.tsx`
  - [ ] Add quick filter chips (top of page)
    - [ ] Filter by material (Steel, Aluminum, etc.)
    - [ ] Filter by stage (Cutting, Bending, Welding, etc.)
    - [ ] Filter by due date (Today, This Week, Overdue)
    - [ ] "Clear Filters" button
  - [ ] Improve operation card design
    - [ ] Larger touch targets (min 44px height)
    - [ ] More prominent part number
    - [ ] Visual stage indicator (color bar or badge)
    - [ ] Due date with color coding (red if overdue)
    - [ ] Material badge/icon
  - [ ] Add search box (filter by part number)
  - [ ] Add sort options (by due date, by part number, by stage)
  - [ ] Improve loading states (skeleton cards)
  - [ ] Improve empty states ("No operations available")
- [ ] Test filter performance (with 100+ operations)
- [ ] Test on mobile devices

### 3.4 Issue Reporting Improvement

- [ ] Edit `src/components/operator/IssueForm.tsx`
  - [ ] Simplify form fields (only essential)
  - [ ] Improve photo upload UX
    - [ ] Larger drop zone
    - [ ] Camera access on mobile (capture directly)
    - [ ] Image preview before upload
    - [ ] Multiple image support
  - [ ] Add severity quick-select (visual icons, not dropdown)
  - [ ] Add issue templates/presets (common issues)
  - [ ] Improve success feedback (toast + auto-close modal)
- [ ] Test photo upload on mobile devices
- [ ] Test accessibility

---

## Phase 4: Global Features (Week 4-5)

### 4.1 Keyboard Shortcuts System

- [ ] Create keyboard shortcut manager
  - [ ] `src/lib/keyboardShortcuts.ts`
  - [ ] Key binding registration system
  - [ ] Conflict detection
  - [ ] Context-aware shortcuts (page-specific)
- [ ] Implement global shortcuts:
  - [ ] `Cmd/Ctrl + K` → Open search
  - [ ] `Cmd/Ctrl + N` → Open quick create
  - [ ] `Cmd/Ctrl + B` → Toggle sidebar
  - [ ] `Esc` → Close modal/dialog
  - [ ] `?` → Show shortcuts help
- [ ] Implement navigation shortcuts:
  - [ ] `G then D` → Dashboard
  - [ ] `G then J` → Jobs
  - [ ] `G then P` → Parts
  - [ ] `G then O` → Operations
  - [ ] `G then A` → Assignments
  - [ ] `G then I` → Issues
  - [ ] `G then M` → Activity Monitor
- [ ] Implement action shortcuts:
  - [ ] `C` → Create new (context-dependent)
  - [ ] `E` → Edit selected
  - [ ] `Del` → Delete selected (with confirmation)
- [ ] Create shortcuts help modal (if not done in Phase 1)
- [ ] Add visual indicators (show shortcut hints in UI)
- [ ] Test all shortcuts
- [ ] Test conflict resolution
- [ ] Add shortcuts to user preferences (enable/disable)

### 4.2 Real-time Notifications System

- [ ] Design notification database schema
  - [ ] Table: `notifications`
  - [ ] Columns: id, tenant_id, user_id, type, severity, title, message, link, read, created_at
  - [ ] Indexes on user_id, read, created_at
- [ ] Create notification generation functions
  - [ ] Database triggers or Edge Functions
  - [ ] Event: new issue → notify admins
  - [ ] Event: new assignment → notify operator
  - [ ] Event: job due soon → notify admins
  - [ ] Event: operation overdue → notify assigned operator + admins
  - [ ] Event: webhook failure → notify admins
- [ ] Create notification subscription (Supabase Realtime)
  - [ ] Subscribe to user's notifications
  - [ ] Auto-update badge count
  - [ ] Show toast on new notification (optional)
- [ ] Create notification preferences
  - [ ] User can enable/disable notification types
  - [ ] Store in user profile or separate preferences table
  - [ ] UI in UserPreferences modal
- [ ] Test notification generation
- [ ] Test real-time delivery
- [ ] Test notification settings

### 4.3 Performance Optimizations

- [ ] Implement route-based code splitting
  - [ ] Use React.lazy() for page components
  - [ ] Add Suspense boundaries with loading spinners
  - [ ] Measure bundle size reduction
- [ ] Implement lazy loading for settings tabs
  - [ ] Load tab components only when activated
  - [ ] Prefetch commonly used tabs
- [ ] Optimize search performance
  - [ ] Implement search result caching
  - [ ] Debounce search input (300ms)
  - [ ] Limit search results per entity type (e.g., top 10)
  - [ ] Add pagination for "See all results"
- [ ] Optimize real-time subscriptions
  - [ ] Subscribe only to necessary data
  - [ ] Unsubscribe when components unmount
  - [ ] Batch real-time updates (throttle)
- [ ] Optimize images
  - [ ] Compress uploaded images
  - [ ] Use appropriate formats (WebP where supported)
  - [ ] Lazy load images in lists/grids
- [ ] Add performance monitoring
  - [ ] Measure page load times
  - [ ] Measure time to interactive
  - [ ] Monitor slow queries
- [ ] Test performance with large datasets
  - [ ] 1000+ jobs
  - [ ] 10,000+ parts
  - [ ] 100+ concurrent users (stress test)

---

## Phase 5: Visual Design Updates (Week 5-6)

### 5.1 Color System Implementation

- [ ] Update theme configuration
  - [ ] Edit `src/theme/ThemeProvider.tsx` or design tokens file
  - [ ] Define status colors:
    - [ ] Blue (#3B82F6) - Not Started / Queued
    - [ ] Yellow (#F59E0B) - In Progress / Active
    - [ ] Green (#10B981) - Completed
    - [ ] Red (#EF4444) - Overdue / Blocked / High Priority
    - [ ] Gray (#6B7280) - Cancelled / Inactive
  - [ ] Define user status colors:
    - [ ] Green (#10B981) - Working
    - [ ] Yellow (#F59E0B) - Paused
    - [ ] Gray (#9CA3AF) - Idle
    - [ ] Red (#EF4444) - Issue
  - [ ] Define severity colors:
    - [ ] Red (#EF4444) - High
    - [ ] Yellow (#F59E0B) - Medium
    - [ ] Green (#10B981) - Low
- [ ] Create status badge component
  - [ ] `src/components/ui/StatusBadge.tsx` (update if exists)
  - [ ] Props: status, type (job|operation|user|issue)
  - [ ] Color mapping based on status + type
  - [ ] Consistent styling (rounded, padding, font size)
- [ ] Apply status colors throughout app
  - [ ] Job cards/tables
  - [ ] Operation cards/tables
  - [ ] User status indicators
  - [ ] Issue severity badges
- [ ] Test color contrast (WCAG AA compliance)
  - [ ] Use contrast checker tool
  - [ ] Adjust colors if needed for accessibility
- [ ] Test in dark mode
  - [ ] Ensure colors work in both light and dark themes
  - [ ] Adjust dark mode palette if needed

### 5.2 Typography System

- [ ] Define typography scale
  - [ ] Page titles: 32px (2rem), Bold, mb-6
  - [ ] Section headers: 24px (1.5rem), Semibold, mb-4
  - [ ] Card titles: 18px (1.125rem), Medium, mb-2
  - [ ] Body text: 16px (1rem), Regular, leading-relaxed
  - [ ] Helper text: 14px (0.875rem), Regular, text-gray-500
  - [ ] Small labels: 12px (0.75rem), Medium, uppercase, tracking-wide
- [ ] Create typography utility classes or components
  - [ ] Update Tailwind config or create styled components
  - [ ] Consistent heading components: H1, H2, H3, H4
  - [ ] Consistent text components: Body, Caption, Label
- [ ] Apply typography throughout app
  - [ ] Update page titles
  - [ ] Update section headers
  - [ ] Update card titles
  - [ ] Update form labels
  - [ ] Update helper text
- [ ] Test readability
  - [ ] Ensure sufficient line height (1.5-1.6 for body text)
  - [ ] Ensure sufficient letter spacing
  - [ ] Test on different screen sizes

### 5.3 Spacing System

- [ ] Define spacing scale (if not already in Tailwind)
  - [ ] Page margins: 24px (mobile), 48px (tablet), 64px (desktop)
  - [ ] Card padding: 16px (mobile), 24px (desktop)
  - [ ] Section spacing: 32px vertical gap
  - [ ] Element spacing: 8px (tight), 16px (normal), 24px (loose)
- [ ] Apply consistent spacing
  - [ ] Page containers
  - [ ] Cards and panels
  - [ ] Form fields
  - [ ] Buttons
  - [ ] Lists and tables
- [ ] Test on different screen sizes
  - [ ] Mobile (< 768px)
  - [ ] Tablet (768px - 1024px)
  - [ ] Desktop (> 1024px)

### 5.4 Component Styling Updates

#### Cards
- [ ] Update card component styling
  - [ ] Subtle shadows (elevation levels)
  - [ ] Rounded corners (8px border-radius)
  - [ ] Hover states (slight lift, shadow increase)
  - [ ] Click states (slight scale down, shadow decrease)
  - [ ] Consistent padding (16px mobile, 24px desktop)
- [ ] Apply to all card usages:
  - [ ] Dashboard cards
  - [ ] Operation cards
  - [ ] Job/part cards
  - [ ] Settings cards

#### Tables
- [ ] Update table component styling
  - [ ] Zebra striping (subtle, every other row: bg-gray-50 dark:bg-gray-800)
  - [ ] Hover rows (highlight background: bg-gray-100 dark:bg-gray-700)
  - [ ] Sticky headers (position: sticky, top: 0)
  - [ ] Responsive (stack on mobile or horizontal scroll)
  - [ ] Sortable headers (visual indicators)
  - [ ] Empty states (centered message, icon)
- [ ] Apply to all table usages:
  - [ ] Jobs table
  - [ ] Parts table
  - [ ] Operations table
  - [ ] Users table
  - [ ] Activity Monitor table

#### Buttons
- [ ] Update button component variants
  - [ ] Primary: Brand color bg, white text, shadow-md, hover:shadow-lg
  - [ ] Secondary: Outline, brand color text, hover:bg-gray-50
  - [ ] Tertiary: Ghost, no border, brand color text, hover:bg-gray-100
  - [ ] Danger: Red bg, white text, shadow-md (for destructive actions)
  - [ ] Disabled: Opacity 50%, cursor-not-allowed
- [ ] Update button sizes
  - [ ] Small: py-1 px-3, text-sm
  - [ ] Medium: py-2 px-4, text-base (default)
  - [ ] Large: py-3 px-6, text-lg
- [ ] Add loading states
  - [ ] Spinner icon
  - [ ] Disabled during loading
- [ ] Apply to all button usages throughout app

#### Forms
- [ ] Update form input styling
  - [ ] Consistent border (1px, gray-300)
  - [ ] Focus states (ring, brand color)
  - [ ] Error states (border red, error message below)
  - [ ] Disabled states (bg-gray-100, cursor-not-allowed)
  - [ ] Helper text styling (text-sm, text-gray-500)
- [ ] Update form layout
  - [ ] Consistent label placement (above input, mb-2)
  - [ ] Consistent spacing between fields (mb-4)
  - [ ] Required field indicators (* or "Required" label)
- [ ] Apply to all forms:
  - [ ] Login/signup forms
  - [ ] Job/part creation forms
  - [ ] Settings forms
  - [ ] Issue reporting form

### 5.5 Animations and Transitions

- [ ] Add subtle transitions
  - [ ] Page transitions (fade in, 200ms)
  - [ ] Modal open/close (scale + fade, 150ms)
  - [ ] Dropdown open/close (slide + fade, 100ms)
  - [ ] Hover effects (transform scale, color, 150ms)
  - [ ] Loading states (spinner rotation, skeleton shimmer)
- [ ] Add micro-interactions
  - [ ] Button clicks (scale down, 100ms)
  - [ ] Checkbox/toggle switch (slide, 150ms)
  - [ ] Drag and drop (lift effect, drop shadow)
  - [ ] Notification toast (slide in from top, 200ms)
- [ ] Ensure accessibility
  - [ ] Respect `prefers-reduced-motion` setting
  - [ ] Disable animations for users who prefer reduced motion
- [ ] Test animation performance
  - [ ] Use `transform` and `opacity` (GPU accelerated)
  - [ ] Avoid animating `width`, `height`, `top`, `left`
  - [ ] Test on low-end devices

---

## Phase 6: Testing & Refinement (Week 6-7)

### 6.1 User Testing

- [ ] Recruit test users
  - [ ] 3-5 operators
  - [ ] 2-3 admins
  - [ ] Mix of tech-savvy and non-tech-savvy
- [ ] Prepare test scenarios
  - [ ] Operator tasks:
    - [ ] Find next operation to work on
    - [ ] Start timer on an operation
    - [ ] View STEP file and PDF drawings
    - [ ] Complete an operation
    - [ ] Report an issue with photo
  - [ ] Admin tasks:
    - [ ] Find a specific job using search
    - [ ] Create a new job and parts
    - [ ] Assign operations to operators
    - [ ] Review and resolve an issue
    - [ ] Configure new stage or material
    - [ ] Export data
- [ ] Conduct moderated testing sessions
  - [ ] Observe users completing tasks
  - [ ] Ask users to think aloud
  - [ ] Note pain points and confusion
  - [ ] Record session (with permission)
- [ ] Collect feedback
  - [ ] Post-task questionnaire (SUS or similar)
  - [ ] Open-ended feedback
  - [ ] Feature requests
- [ ] Analyze results
  - [ ] Identify common issues
  - [ ] Prioritize fixes
  - [ ] Create tickets for improvements

### 6.2 Accessibility Audit

- [ ] Automated testing
  - [ ] Run axe DevTools or Lighthouse
  - [ ] Fix all critical and serious issues
  - [ ] Document and plan for moderate issues
- [ ] Manual testing
  - [ ] Keyboard navigation (tab through entire app)
    - [ ] All interactive elements focusable
    - [ ] Logical tab order
    - [ ] Visible focus indicators
    - [ ] No keyboard traps
  - [ ] Screen reader testing (NVDA, JAWS, VoiceOver)
    - [ ] All content readable
    - [ ] ARIA labels present and accurate
    - [ ] Form labels associated correctly
    - [ ] Live region announcements working
  - [ ] Color contrast (use contrast checker)
    - [ ] All text meets WCAG AA (4.5:1 for normal, 3:1 for large)
    - [ ] Icons and UI elements meet 3:1
  - [ ] Touch targets (mobile)
    - [ ] All buttons/links minimum 44x44px
    - [ ] Adequate spacing between targets
  - [ ] Zoom testing (up to 200%)
    - [ ] No horizontal scrolling
    - [ ] No content truncation
    - [ ] Layout remains functional
- [ ] Document accessibility features
  - [ ] Create accessibility statement
  - [ ] List keyboard shortcuts
  - [ ] Explain ARIA usage
- [ ] Fix identified issues
- [ ] Re-test after fixes

### 6.3 Cross-browser Testing

- [ ] Test on major browsers
  - [ ] Chrome/Edge (latest 2 versions)
  - [ ] Firefox (latest 2 versions)
  - [ ] Safari (latest 2 versions)
  - [ ] Mobile browsers:
    - [ ] Safari on iOS (latest)
    - [ ] Chrome on Android (latest)
- [ ] Test functionality
  - [ ] All features work correctly
  - [ ] No console errors
  - [ ] Forms submit properly
  - [ ] File uploads work
  - [ ] Real-time updates working
- [ ] Test visual consistency
  - [ ] Layout matches design
  - [ ] Fonts render correctly
  - [ ] Colors consistent
  - [ ] Animations smooth
- [ ] Fix browser-specific issues
  - [ ] Add polyfills if needed
  - [ ] Add vendor prefixes
  - [ ] Adjust CSS for browser quirks
- [ ] Document browser support
  - [ ] List officially supported browsers
  - [ ] Note any known issues

### 6.4 Mobile/Tablet Testing

- [ ] Test on real devices (not just emulators)
  - [ ] iOS (iPhone, iPad)
  - [ ] Android (phone, tablet)
  - [ ] Different screen sizes (small phone, large tablet)
- [ ] Test operator interface
  - [ ] Bottom navigation usable
  - [ ] Touch targets large enough
  - [ ] Timing widget visible and prominent
  - [ ] Operation cards easy to tap
  - [ ] Issue reporting with camera works
  - [ ] STEP viewer performs well
- [ ] Test admin interface (on tablet)
  - [ ] Sidebar drawer works
  - [ ] Tables readable and scrollable
  - [ ] Forms usable
  - [ ] Modals fit screen
- [ ] Test landscape vs portrait
  - [ ] Layout adapts correctly
  - [ ] No content cut off
  - [ ] Navigation remains accessible
- [ ] Test offline behavior
  - [ ] Graceful error messages when offline
  - [ ] (If implemented) Offline functionality works
- [ ] Fix mobile-specific issues

### 6.5 Performance Testing

- [ ] Measure page load times
  - [ ] Use Lighthouse or WebPageTest
  - [ ] Target: < 3s First Contentful Paint
  - [ ] Target: < 5s Time to Interactive
- [ ] Measure runtime performance
  - [ ] Monitor FPS during interactions
  - [ ] Target: 60 FPS for animations
  - [ ] Check for memory leaks (long sessions)
- [ ] Test with large datasets
  - [ ] 1000+ jobs
  - [ ] 10,000+ parts
  - [ ] 100,000+ operations
  - [ ] Ensure pagination/virtualization working
- [ ] Test real-time features
  - [ ] Multiple concurrent subscriptions
  - [ ] High-frequency updates
  - [ ] Ensure no slowdown over time
- [ ] Optimize identified bottlenecks
  - [ ] Lazy load components
  - [ ] Implement virtual scrolling for long lists
  - [ ] Optimize database queries (add indexes)
  - [ ] Use CDN for static assets
- [ ] Re-test after optimizations

---

## Phase 7: Documentation & Migration (Week 7)

### 7.1 Update Documentation

- [ ] Update README.md
  - [ ] New navigation structure
  - [ ] New features (search, quick create, notifications)
  - [ ] Updated screenshots
- [ ] Create "What's New" changelog
  - [ ] List all major changes
  - [ ] Highlight key benefits
  - [ ] Include before/after comparisons
- [ ] Update user documentation
  - [ ] Operator guide
  - [ ] Admin guide
  - [ ] Keyboard shortcuts reference
  - [ ] Settings guide
- [ ] Create video walkthrough (optional)
  - [ ] 2-3 minute overview
  - [ ] Highlight new features
  - [ ] Show common workflows
- [ ] Update API documentation (if affected)

### 7.2 Migration & Rollout

- [ ] Create migration plan
  - [ ] Database migrations (if needed)
    - [ ] New notifications table
    - [ ] New preferences fields
    - [ ] Data transformations
  - [ ] Feature flags (for gradual rollout)
    - [ ] Enable new navigation for admins first
    - [ ] Enable for operators after validation
  - [ ] Rollback plan (in case of issues)
- [ ] Create onboarding for existing users
  - [ ] "Welcome to New Eryxon" tour
    - [ ] Highlight global search (Cmd+K)
    - [ ] Show quick create menu
    - [ ] Explain notifications
    - [ ] Point out consolidated settings
    - [ ] Note keyboard shortcuts help (?)
  - [ ] Dismissible announcement banner
    - [ ] Show for 7 days
    - [ ] Link to changelog
    - [ ] Option to take tour
- [ ] Monitor rollout
  - [ ] Error tracking (Sentry or similar)
  - [ ] User feedback collection
  - [ ] Usage analytics (feature adoption)
- [ ] Provide support
  - [ ] Monitor support channels (email, etc.)
  - [ ] Create FAQ for common questions
  - [ ] Quick response to critical issues

---

## Success Metrics

### Track These Metrics Before & After

#### Operator Metrics
- [ ] Time to start first operation (from login to timer start)
- [ ] Number of operations completed per session
- [ ] Issue reporting completion rate
- [ ] App session duration
- [ ] Daily active users

#### Admin Metrics
- [ ] Time to assign work (from login to assignment complete)
- [ ] Time to find specific job/part (using search)
- [ ] Time to resolve issue
- [ ] Settings task completion rate (how many admins complete config tasks)
- [ ] Feature discovery rate (% of users who find new features)

#### Overall App Metrics
- [ ] Navigation depth (average clicks to reach any page)
- [ ] User satisfaction (NPS or CSAT survey)
- [ ] Task success rate (% of tasks completed successfully)
- [ ] Error rate (how often users encounter errors)
- [ ] Feature adoption (% of users using search, quick create, etc.)

### Target Improvements
- [ ] 30-40% reduction in time to start operation (operators)
- [ ] 60%+ improvement in search time (admins)
- [ ] 40% reduction in navigation clicks
- [ ] 25% increase in settings task completion
- [ ] +20 NPS improvement
- [ ] 80%+ adoption of global search within 1 month
- [ ] 60%+ adoption of quick create within 1 month

---

## Risk Management

### Potential Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users resist change | High | Provide clear onboarding tour, highlight benefits |
| Performance degradation | High | Thorough performance testing, optimization in Phase 4 |
| Accessibility regressions | Medium | Comprehensive accessibility audit in Phase 6 |
| Browser compatibility issues | Medium | Cross-browser testing in Phase 6, polyfills |
| Mobile usability problems | High | Real device testing in Phase 6, operator focus |
| Real-time features unstable | High | Load testing, graceful degradation for offline |
| Search performance issues | Medium | Debouncing, result limits, caching |
| Data migration errors | Low | Test migrations on staging, have rollback plan |

---

## Next Steps

1. **Review this checklist** with development team
2. **Estimate effort** for each phase (hours/story points)
3. **Create sprint plan** (if using Agile)
4. **Set up project tracking** (Jira, Linear, GitHub Projects)
5. **Begin Phase 1** - Admin Navigation Restructure

---

**Document Version:** 1.0
**Companion to:** UI-UX-REDESIGN-PLAN.md, NAVIGATION-VISUAL-SUMMARY.md
**Last Updated:** 2025-11-17
**Total Estimated Effort:** 6-7 weeks (1 developer full-time)
