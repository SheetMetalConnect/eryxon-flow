# UX Standards

User experience philosophy and requirements for Eryxon Flow.

**Related Documentation:**
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — Visual design, CSS tokens, and component implementation
- [CODING_PATTERNS.md](CODING_PATTERNS.md) — Technical patterns and code examples
- [CLAUDE.md](../CLAUDE.md) — AI agent development guidelines

> **This document defines the "why" and "what" of user experience. For the "how" (CSS, components, code), see DESIGN_SYSTEM.md.**

---

## Appendix G: User Experience Requirements

### Core Philosophy
**The Simple MES You Love to Use. We make decisions so operators can focus on production.**

Like Apple and Linear, we believe in fewer options that work perfectly rather than many options that might work. We build for the machine operator timing operations on a tablet, the supervisor monitoring the shop floor, the production planner analyzing QRM metrics, AND the plant manager integrating with their ERP. Our open-source model forces us to create software people actually want to use on the shop floor—not just purchase because IT mandated it.

Manufacturing software has a reputation for being complex, clunky, and hostile to its daily users. Eryxon Flow exists to prove that production tracking can be as delightful as the best consumer apps while remaining powerful enough for enterprise manufacturing.

---

### Five Pillars of UX

#### 1. Shop Floor Trust
**Every interaction builds confidence through instant feedback and unambiguous status.**

Operators work in environments with noise, gloves, and time pressure. They can't afford to wonder "did that click register?" or "is the system still loading?" Every tap must produce visible feedback within 100ms. Operations that take longer than 500ms must show progress—even if it's just a spinner or "Saving..." indicator.

We show real context because operators verify before they act. "Starting timer for Op-030 Bending (Job #2024-0847)" is better than "Starting timer." When marking an operation complete, we show "Moving to Welding Cell (4/6 WIP)" so they know exactly what happens next. Status badges use consistent colors across the entire application: yellow for active timing, green for completed, red for blocked—never mixing meanings.

The work queue is the operator's home screen. It must load in under 2 seconds on a typical shop floor tablet over WiFi. If operations are filtered out, we explain why: "No operations shown. Try clearing filters or check 'My Activity' for completed work." Silence breeds distrust.

**Trust through Transparency:**
- Show elapsed time during active operations, updated every second
- Display "Last synced: 30s ago" for offline-capable features
- When QRM blocks completion, explain exactly why: "Next cell (Welding) at capacity: 6/6 WIP. Complete button will enable when capacity available."

#### 2. Opinionated Simplicity
**One way that works, not ten ways that might work.**

There is exactly one way to start timing an operation, one way to report an issue, one way to mark work complete. No alternative workflows, no hidden shortcuts, no "advanced mode" toggles. This isn't limiting—it's liberating. An operator shouldn't have to learn their colleague's different method for doing the same task. When someone transfers between cells, they already know how everything works.

The system auto-detects everything it can. When an operator logs in, they see their assigned operations—no need to select a workstation, shift, or department. When uploading a photo for an issue report, the camera opens directly without asking for file source preferences. Configuration is procrastination; defaults should be perfect for 95% of cases.

Safe defaults mean destructive operations require explicit confirmation. Completing an operation advances it to the next cell—that's intentional, permanent, and prompted. Deleting a job requires typing the job number. But pausing a timer? Instant, no confirmation. The friction matches the consequence.

**We enforce tested limits:**
- Maximum operations per batch display: 100 (performance tested)
- Maximum time tracking sessions: 1 per operator (no multi-tasking timers)
- File upload size: 25MB (optimized for shop floor network conditions)
- Session timeout: 8 hours (full shift coverage)

When limits are hit, messages are clear: "Cannot start timer—you have an active timer on Op-020 Cutting. Stop that timer first to switch operations."

#### 3. Glanceable Status
**The answer is visible before the question is asked.**

Manufacturing runs on status. "Is this operation started?" "Is my cell at capacity?" "When is this job due?" These questions should never require navigation or mental calculation. The terminal view answers the three critical questions at a glance:

1. **What am I working on?** → Current operation card, front and center
2. **What's next?** → Buffer showing next 5 operations, sorted by priority
3. **Am I blocked?** → QRM capacity indicator, color-coded and prominent

Dashboard metrics show real numbers with human context: "12 Active Workers" not just "12"; "3 Operations Due Today" with a red badge if overdue. Numbers without labels are useless. Labels without numbers are vague.

Color coding is semantic and consistent:
| Color  | Meaning | Examples |
|--------|---------|----------|
| Green  | Good/Complete/Available | Timer stopped, Capacity available, Job complete |
| Yellow/Amber | Active/Attention/Warning | Timer running, Approaching due date, 80%+ capacity |
| Red | Blocked/Overdue/Critical | At capacity, Past due date, Critical issue |
| Blue | Informational/Pending | Queued operations, In buffer, Assigned |
| Gray | Inactive/Neutral | Paused, Not started, Archived |

We never rely on color alone—icons and text labels accompany every status for accessibility.

#### 4. Progressive Power
**Click to start, grow to automate.**

Day one, an operator clicks "Start Timing" and sees their time accumulate. By week one, they've learned the keyboard shortcut. By month one, they understand the operation sequence and batch patterns. By year one, their supervisor is using the API to pull QRM metrics into their planning system.

The UI is the starting point, not the ceiling. Everything visible in the interface has an underlying data model accessible through the API. Operators never need to know this, but integrators can build custom dashboards, connect ERP systems, or automate data flows without hitting artificial walls.

**Progressive disclosure in practice:**
- Default view: Current operation + simple controls
- Expand panel: Full job details, routing visualization, 3D viewer
- Admin view: All metrics, configuration, bulk operations
- API access: Everything programmatic, documented, versioned

Power users aren't punished for expertise. Keyboard navigation works throughout. Data tables support sorting, filtering, and export. The same operator who struggled to find the start button on day one can become the local expert who trains their colleagues—because the system revealed its depth naturally.

#### 5. Error Excellence
**Every error builds trust through clarity and recovery.**

Errors come in two layers because different users need different information:

**For operators:**
> "Cannot complete operation—Next cell at capacity. The Welding cell currently has 6 jobs in progress (maximum 6). Your part will advance automatically when capacity is available, or contact your supervisor to expedite."

**For administrators (expandable detail):**
> "CELL_CAPACITY_EXCEEDED: welding_cell_01, current_wip=6, max_capacity=6, blocking_operation_id=op_7a82f9, job_id=job_2024-0847, timestamp=2024-01-15T14:32:00Z"

Every error includes actionable next steps. Never just "Timer failed"—always "Timer failed to start. Check your network connection and try again, or tap 'Work Offline' to track time locally." We include context like last successful sync time because operators need situational awareness.

We never blame the operator. "Invalid input" becomes "Job number not found—check the number matches the job ticket (e.g., 2024-0847)." If the UI allowed an action, that action should work. When it doesn't, we explain what happened and how to recover without making anyone feel incompetent.

**All operations are recoverable:**
- Accidentally stopped timer? "Undo" available for 30 seconds
- Marked wrong operation complete? Admin can revert (with audit trail)
- Uploaded wrong photo? Delete and re-upload
- Filtered out all operations? "Clear all filters" button prominently visible

Mistakes happen—especially at 6 AM during shift change or when production pressure peaks. Recovery paths should be obvious and always available.

---

### The Design Hierarchy

When principles conflict, we prioritize in this order:

1. **Safety** — Production never stops because of our software. Offline capability, graceful degradation, and defensive design.

2. **Clarity** — Obvious beats clever. An operator with 2 minutes of training should understand the core workflow. No hidden menus, no buried settings.

3. **Speed** — Every interaction completes in under 200ms. Screens load in under 2 seconds. Real-time updates without page refreshes.

4. **Simplicity** — Minimum cognitive load. One button for one action. Consistent patterns across every screen.

5. **Power** — Advanced capability when needed. API access, export functionality, configuration options—but never at the expense of simplicity for daily users.

6. **Flexibility** — Only after all others are satisfied. Customization that doesn't compromise the core experience.

---

### Manufacturing-Specific Requirements

#### Touch-First for Shop Floor

Operators wear gloves, have dirty hands, and work in environments with poor lighting. Every interactive element must meet a 44x44px minimum touch target. Buttons are full-width on mobile. Tap targets have 8px minimum spacing to prevent mis-taps.

Swipe gestures are avoided—they don't work with gloves. Instead, we use explicit buttons. Pull-to-refresh is the single exception, implemented with generous trigger zones.

Text is minimum 16px for body content, 14px for secondary information. Headers use 20-24px to create visual hierarchy visible from arm's length.

#### Offline Resilience

Shop floor WiFi is unreliable. Network drops during shift changes, dead zones exist near certain machines, and infrastructure maintenance happens during second shift.

Core timing functionality works offline:
- Start/stop/pause timers cache locally
- Sync when connection returns with conflict resolution
- Visual indicator shows sync status: "✓ Synced" vs "Pending sync (2 actions)"
- Operations queued offline process in order, with error handling for each

The work queue shows cached data with "Last updated X minutes ago" warning after 5 minutes without sync. Critical actions (like completing operations) queue for sync but show optimistic UI immediately.

#### QRM Flow Awareness

Quick Response Manufacturing principles are built into the core experience:

- **Capacity visibility**: Every cell shows current WIP vs. maximum capacity
- **Pull system support**: Operations only advance when downstream capacity exists
- **Lead time focus**: Due dates prominent, delays highlighted immediately
- **Batch awareness**: Related operations grouped, batch completion tracked

The system supports but doesn't mandate QRM. Capacity blocking can be advisory (warning) or enforced (blocking). Both modes use the same visual language so operators develop consistent mental models.

#### Multi-Shift Handoff

Work continues 24/7. Shift handoff must be seamless:
- Session state persists—an operator can pick up where they left off
- Active timers transfer clearly: "Timer started by J. Smith at 22:47"
- Notes and issues visible to incoming shift
- No forced logout at shift change—operators choose when to end their session

---

### Operator Terminal Patterns

The terminal is where operators spend 90% of their time. It follows strict patterns:

**Left Panel (Work Queue):**
- Three sections: In Process (green), In Buffer (blue), Expected (amber)
- Maximum 5 items visible per section without scrolling
- Tap to select, selection highlighted with left border accent
- Overflow shows "+ X more" with option to expand

**Right Panel (Operation Detail):**
- Current operation always visible without scrolling
- Timer controls: Start (primary CTA), Pause, Stop in logical order
- Complete button separate, styled differently to prevent accidental taps
- Expandable sections for: Job details, Attachments, Operation list, QRM status

**Header:**
- Current cell name (for filtering context)
- Operator name with avatar
- Clock (real-time, relevant for shift workers)
- Sync status indicator

**State Management:**
- Timer running: Prominent elapsed time, pause/stop visible
- Timer paused: "Paused" badge, resume button primary
- No active timer: "Start Timing" is only prominent action
- Operation complete: Celebration micro-animation, auto-advance to next

---

### Admin Interface Patterns

Administrators manage configuration and analyze data. Their needs differ from operators:

**Density over simplicity**: Admins work on desktop, want to see more data per screen. Tables use compact rows, dashboards pack more cards.

**Batch operations**: Multi-select for bulk status changes, exports, assignments. Power tools for power users.

**Configuration depth**: Settings organized in logical groups, not hidden. Advanced options visible but clearly labeled.

**Analytics focus**: Charts, trends, comparisons. Date range selectors, export to CSV, drill-down capability.

Admin pages follow a consistent layout:
```
+--------------------------------------------------+
| Page Title [Gradient]           [Primary Action] |
| Description text (muted)                         |
+--------------------------------------------------+
| Stats Row: 3-4 key metrics with icons            |
+--------------------------------------------------+
| Glass Card Container                             |
| +----------------------------------------------+ |
| | Filters/Search                               | |
| | Data Table with sticky header                | |
| |                                              | |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

Row click opens detail modal. Actions menu (three-dot) for secondary actions. Context menu for keyboard-savvy users. Consistency across every admin page.

---

### Localization Requirements

Eryxon Flow supports English, Dutch, and German—the languages of our initial manufacturing markets. Every user-facing string must be localized:

- UI labels and buttons
- Error messages (including dynamic content with interpolation)
- Placeholder text
- Tooltips
- Notifications
- Email templates

Date and time formats respect locale preferences:
- US: MM/DD/YYYY, 12-hour clock
- EU: DD-MM-YYYY, 24-hour clock
- Relative times ("2 hours ago") in user's language

Number formatting matches locale (1,234.56 vs 1.234,56). Unit systems (metric/imperial) may vary by tenant configuration.

When adding features, translations are added to all three languages before merge. Missing translations fall back to English with console warning in development.

---

### Accessibility Requirements

Manufacturing workforces are diverse. Accessibility isn't optional:

**Visual:**
- WCAG AA contrast ratios (4.5:1 for text, 3:1 for large text)
- Color never the only indicator—icons, labels, patterns accompany
- Dark and light modes for different lighting conditions
- Minimum 16px body text, scalable with browser zoom

**Motor:**
- Full keyboard navigation
- Focus indicators visible in both themes
- No hover-only functionality
- Touch targets 44x44px minimum with 8px spacing

**Cognitive:**
- Consistent navigation patterns
- Clear labels, no jargon in user-facing text
- Progressive disclosure—complexity revealed on demand
- Error recovery always possible

**Assistive Technology:**
- Semantic HTML throughout
- ARIA labels for interactive elements
- Screen reader announcements for status changes
- Form labels properly associated

---

### Performance Standards

Shop floor networks and tablets aren't cutting edge. Performance budgets are strict:

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse, 4G throttle |
| Time to Interactive | < 3s | Lighthouse, 4G throttle |
| Interaction latency | < 100ms | Measured on production |
| Timer update | < 16ms | 60fps smooth updates |
| List scroll | 60fps | No jank on 100+ items |

Bundle size budgets:
- Initial JS: < 200KB gzipped
- CSS: < 50KB gzipped
- Lazy-load routes beyond core workflow

Real-time updates via WebSocket, batched to prevent UI thrashing. Optimistic updates for all mutations—show success immediately, reconcile in background.

---

### Summary

Eryxon Flow is opinionated software that respects both the operator who needs reliability and the administrator who needs control. We make the hard decisions so our users can focus on production.

The five pillars guide every design decision:

1. **Shop Floor Trust** — Instant feedback, transparent status, reliable sync
2. **Opinionated Simplicity** — One way that works, defaults that fit
3. **Glanceable Status** — Answers visible before questions asked
4. **Progressive Power** — Click to start, grow to automate
5. **Error Excellence** — Clarity, recovery, and respect

When in doubt, ask: "Would this make sense to an operator starting their shift at 5 AM?" If the answer is yes, ship it. If not, simplify until it does.

---

*This document defines the user experience requirements for Eryxon Flow. For implementation details, see [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) and [CODING_PATTERNS.md](CODING_PATTERNS.md).*
