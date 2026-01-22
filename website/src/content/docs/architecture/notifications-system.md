---
title: "Interactive Notification System"
description: "Documentation for Interactive Notification System"
---



## Overview

The Eryxon Flow application features a comprehensive interactive notification system that keeps users informed about important events such as new issues, job due dates, new parts, new users, assignments, and more. The system includes both persistent notifications (accessible via the alarm icon in the header) and real-time toast notifications.

## Features

### 1. Persistent Notifications
- **Database-backed**: All notifications are stored in the database with full audit trail
- **Real-time updates**: Notifications update in real-time using Supabase Realtime
- **Interactive actions**:
  - **Mark as read/unread**: Single click to mark notifications as read
  - **Pin/Unpin**: Pin important notifications to keep them at the top
  - **Dismiss**: Remove notifications that are no longer relevant
  - **Mark all as read**: Quickly clear all unread notifications

### 2. Toast Notifications
- **Real-time alerts**: Pop-up notifications appear when new events occur
- **Interactive actions**: Toast notifications can include custom action buttons
- **Pin from toast**: Quickly pin important notifications directly from the toast
- **Auto-dismiss**: Toasts automatically disappear after a configurable duration

### 3. Notification Types

The system supports various notification types:

| Type | Description | Severity | Triggered By |
|------|-------------|----------|--------------|
| `issue` | New issue reported | Based on issue severity | New issue creation |
| `job_due` | Job due date approaching | High/Medium/Low based on days remaining | Daily check or manual trigger |
| `new_part` | New part added to system | Low | New part creation |
| `new_user` | New user joined | Low | New user signup |
| `assignment` | New work assignment | Medium | Operator assignment |
| `part_completed` | Part marked as completed | Low | Part status update |
| `operation_completed` | Operation completed | Low | Operation status update |
| `system` | System-level notifications | Varies | Manual creation |

## Architecture

### Database Schema

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,  -- NULL for tenant-wide notifications

  -- Notification details
  type TEXT NOT NULL,
  severity TEXT NOT NULL,  -- high, medium, low
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,  -- Navigation link when clicked

  -- Reference to source entity
  reference_type TEXT,  -- issue, job, part, user, etc.
  reference_id UUID,

  -- Interactive states
  read BOOLEAN DEFAULT false,
  pinned BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  pinned_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  -- Metadata (JSON)
  metadata JSONB DEFAULT '{}'
);
```

### Automatic Notification Triggers

The system automatically creates notifications via database triggers for:

1. **New Issues** (`notify_new_issue`)
   - Notifies all admins when an issue is reported
   - Severity matches issue severity
   - Links to issues page

2. **New Parts** (`notify_new_part`)
   - Notifies all admins when a part is added
   - Includes job and part information
   - Links to jobs page

3. **New Users** (`notify_new_user`)
   - Notifies admins when a new user joins (except other admins)
   - Includes user name and role
   - Links to users configuration page

4. **New Assignments** (`notify_new_assignment`)
   - Notifies the assigned operator
   - Includes job and part details
   - Links to operator dashboard

5. **Part Completion** (`notify_part_completed`)
   - Notifies admins when a part is completed
   - Includes job context
   - Links to jobs page

6. **Jobs Due Soon** (`check_jobs_due_soon`)
   - Checks for jobs due within 7 days
   - Severity based on days remaining (1 day = high, 3 days = medium, 7 days = low)
   - Prevents duplicate notifications (24-hour window)
   - Can be triggered manually or via cron job

## Usage

### For Developers

#### Using the `useNotifications` Hook

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const {
    notifications,        // All notifications
    loading,             // Loading state
    unreadCount,         // Number of unread notifications
    pinnedNotifications, // Pinned notifications only
    unpinnedNotifications, // Unpinned notifications
    markAsRead,          // Mark single notification as read
    togglePin,           // Pin/unpin notification
    dismiss,             // Dismiss notification
    markAllAsRead,       // Mark all as read
    refetch,             // Manually refetch notifications
  } = useNotifications();

  // Use the hook values in your component
}
```

#### Filtering Notifications

```typescript
const { notifications } = useNotifications({
  type: 'issue',      // Filter by type
  read: false,        // Only unread
  pinned: true,       // Only pinned
  dismissed: false,   // Not dismissed (default)
});
```

#### Creating Custom Notifications

```typescript
import { supabase } from '@/integrations/supabase/client';

// Using the RPC function
const { data: notificationId } = await supabase.rpc('create_notification', {
  p_tenant_id: 'tenant-uuid',
  p_user_id: 'user-uuid', // or null for tenant-wide
  p_type: 'system',
  p_severity: 'medium',
  p_title: 'System Maintenance',
  p_message: 'Scheduled maintenance tonight at 10 PM',
  p_link: '/admin/settings',
  p_reference_type: null,
  p_reference_id: null,
  p_metadata: { scheduled_time: '2025-01-17T22:00:00Z' }
});
```

#### Using Toast Notifications with Actions

```typescript
import { useToast } from '@/components/mui/ToastNotification';

function MyComponent() {
  const { showToast, showSuccess, showNotificationToast } = useToast();

  // Simple toast
  showSuccess('Operation completed!');

  // Toast with custom actions
  showToast('File deleted', 'warning', 5000, {
    actions: [
      {
        label: 'Undo',
        onClick: () => restoreFile(),
        icon: <UndoIcon />
      }
    ]
  });

  // Notification toast with pin action
  showNotificationToast(
    'New critical issue reported',
    'error',
    () => pinNotification(notificationId)
  );
}
```

### For Users

#### Viewing Notifications

1. Click the **bell icon** in the top navigation bar
2. The badge shows the number of unread notifications
3. Notifications panel opens with two tabs:
   - **All**: Shows all active notifications (pinned + unpinned)
   - **Pinned**: Shows only pinned notifications

#### Managing Notifications

- **Mark as read**: Click the small dot icon on unread notifications
- **Pin notification**: Click the pin icon to pin/unpin
- **Dismiss notification**: Click the X icon to permanently dismiss
- **Mark all as read**: Click the checkmark icon in the header
- **Navigate**: Click anywhere on the notification to navigate to the related page

#### Toast Notifications

- Toast notifications appear in the bottom-right corner
- Automatically dismiss after a few seconds
- Click the pin icon on a toast to save it to your notification center
- Custom action buttons appear for specific notification types

## Database Functions

### Available RPC Functions

1. **`create_notification`**: Create a new notification
2. **`mark_notification_read`**: Mark single notification as read
3. **`toggle_notification_pin`**: Toggle pin state
4. **`dismiss_notification`**: Dismiss a notification
5. **`mark_all_notifications_read`**: Mark all user's notifications as read
6. **`check_jobs_due_soon`**: Check for upcoming job deadlines

### Running Manual Checks

```sql
-- Check for jobs due soon
SELECT check_jobs_due_soon();

-- Returns the number of notifications created
```

## Real-time Features

### Notification Center

- Automatically updates when new notifications arrive
- Updates when notifications are read/pinned/dismissed from another device/tab
- Shows loading state during fetch operations

### Toast Provider

- Listens for new notifications in real-time
- Shows toast notification when new notifications are created
- Only shows toasts for notifications relevant to the current user
- Includes pin action for quick access

## Security

### Row Level Security (RLS)

All notifications are protected with RLS policies:

- **SELECT**: Users can only see notifications for their tenant and (if user-specific) for themselves
- **INSERT**: Users can create notifications for their tenant
- **UPDATE**: Users can update their own notifications (read/pin/dismiss states)
- **DELETE**: Only admins can delete notifications

### Multi-tenancy

- All notifications are scoped to a tenant
- Notifications can be tenant-wide (user_id = null) or user-specific
- Real-time subscriptions are filtered by tenant_id

## Performance Considerations

### Indexes

The following indexes ensure optimal query performance:

- `idx_notifications_tenant_id`: Fast tenant filtering
- `idx_notifications_user_id`: Fast user filtering
- `idx_notifications_type`: Filter by notification type
- `idx_notifications_read`: Filter by read status
- `idx_notifications_pinned`: Filter by pinned status
- `idx_notifications_dismissed`: Filter by dismissed status
- `idx_notifications_created_at`: Sort by creation date
- `idx_notifications_reference`: Fast reference lookups

### Best Practices

1. **Dismiss old notifications**: Use the dismiss feature to keep the notification center clean
2. **Pin important items**: Use pinning for notifications that need follow-up
3. **Mark as read**: Keep your notification count manageable
4. **Prevent duplicates**: The `check_jobs_due_soon` function includes 24-hour deduplication

## Customization

### Adding New Notification Types

1. **Update the database constraint**:
```sql
ALTER TABLE notifications
DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('issue', 'job_due', 'new_part', 'new_user', 'assignment', 'part_completed', 'operation_completed', 'system', 'your_new_type'));
```

2. **Create a trigger function**:
```sql
CREATE OR REPLACE FUNCTION notify_your_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    NEW.tenant_id,
    target_user_id,
    'your_new_type',
    'medium',
    'Event Title',
    'Event description',
    '/link/to/page',
    'reference_type',
    NEW.id,
    '{}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_your_event
  AFTER INSERT ON your_table
  FOR EACH ROW
  EXECUTE FUNCTION notify_your_event();
```

3. **Update the UI** to display the new notification type icon and styling in `NotificationsCenter.tsx`

### Customizing Notification Appearance

Edit the `getIcon()` function in `src/components/NotificationsCenter.tsx` to customize icons and colors for each notification type.

## Troubleshooting

### Notifications Not Appearing

1. Check that RLS policies allow the user to see notifications
2. Verify the notification's `tenant_id` matches the user's tenant
3. Check that `dismissed` is false
4. Verify real-time subscriptions are active

### Duplicate Notifications

- The `check_jobs_due_soon` function includes deduplication logic
- Ensure triggers are not firing multiple times
- Check for multiple real-time subscriptions

### Toast Notifications Not Showing

1. Verify `NotificationToastProvider` is in the component tree
2. Check browser console for errors
3. Ensure Supabase Realtime is enabled for the notifications table

## Future Enhancements

Potential improvements to consider:

- [ ] Email/SMS notifications for high-priority items
- [ ] Notification preferences per user
- [ ] Batch notifications (e.g., daily digest)
- [ ] Rich media notifications (images, videos)
- [ ] Notification history/archive page
- [ ] Search and filter in notification center
- [ ] Desktop push notifications
- [ ] Notification sound effects
- [ ] Snooze functionality

## Related Files

- Database: `/supabase/migrations/20251117200000_create_notifications_system.sql`
- Triggers: `/supabase/migrations/20251117200100_create_notification_triggers.sql`
- Types: `/src/integrations/supabase/types.ts`
- Hook: `/src/hooks/useNotifications.ts`
- UI Component: `/src/components/NotificationsCenter.tsx`
- Toast Provider: `/src/components/mui/ToastNotification.tsx`
- Real-time Toast: `/src/components/NotificationToastProvider.tsx`
