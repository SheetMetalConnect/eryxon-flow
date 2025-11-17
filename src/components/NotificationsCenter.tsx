import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Button,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  ReportProblem as ReportProblemIcon,
  Work as WorkIcon,
  AssignmentTurnedIn as AssignmentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  type: 'issue' | 'assignment' | 'job_due' | 'system';
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
}

interface NotificationsCenterProps {
  color?: 'inherit' | 'primary' | 'secondary' | 'default';
}

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({ color = 'inherit' }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();
  const theme = useTheme();
  const { profile } = useAuth();
  const open = Boolean(anchorEl);

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadNotifications();
      // Set up real-time subscription for new notifications
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'issues',
            filter: `tenant_id=eq.${profile.tenant_id}`,
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

  const loadNotifications = async () => {
    if (!profile) return;

    const mockNotifications: Notification[] = [];

    try {
      // Get pending issues as notifications
      const { data: issues } = await supabase
        .from('issues')
        .select('id, description, severity, status, created_at')
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      issues?.forEach((issue) => {
        mockNotifications.push({
          id: `issue-${issue.id}`,
          type: 'issue',
          severity: issue.severity as 'high' | 'medium' | 'low',
          title: 'New Issue Reported',
          message: issue.description || 'No description',
          link: '/admin/issues',
          read: false,
          created_at: issue.created_at,
        });
      });

      // Get jobs due within 7 days as notifications
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, job_number, customer, due_date')
        .eq('tenant_id', profile.tenant_id)
        .lte('due_date', sevenDaysFromNow.toISOString())
        .order('due_date', { ascending: true })
        .limit(5);

      jobs?.forEach((job) => {
        mockNotifications.push({
          id: `job-${job.id}`,
          type: 'job_due',
          severity: 'medium',
          title: 'Job Due Soon',
          message: `JOB-${job.job_number} - ${job.customer || 'No customer'}`,
          link: '/admin/jobs',
          read: false,
          created_at: job.due_date,
        });
      });

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    navigate(notification.link);
    handleClose();
  };

  const handleMarkAllRead = () => {
    setNotifications([]);
    handleClose();
  };

  const getIcon = (type: string, severity: string) => {
    const iconProps = {
      fontSize: 'small' as const,
      sx: {
        color:
          severity === 'high'
            ? '#EF4444'
            : severity === 'medium'
            ? '#F59E0B'
            : '#10B981',
      },
    };

    switch (type) {
      case 'issue':
        return <ReportProblemIcon {...iconProps} />;
      case 'job_due':
        return <ScheduleIcon {...iconProps} />;
      case 'assignment':
        return <AssignmentIcon {...iconProps} />;
      default:
        return <NotificationsIcon {...iconProps} />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <IconButton
        onClick={handleClick}
        color={color}
        aria-label={`${unreadCount} notifications`}
        aria-controls={open ? 'notifications-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        id="notifications-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1.5,
            minWidth: 360,
            maxWidth: 400,
            maxHeight: 500,
            borderRadius: 2,
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
          </Typography>
        </Box>

        {/* Notifications List */}
        <Box sx={{ maxHeight: 350, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                You're all caught up!
              </Typography>
              <Typography variant="caption" color="text.disabled">
                No new notifications
              </Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderLeft: 3,
                  borderColor: !notification.read
                    ? notification.severity === 'high'
                      ? '#EF4444'
                      : notification.severity === 'medium'
                      ? '#F59E0B'
                      : '#10B981'
                    : 'transparent',
                  backgroundColor: !notification.read
                    ? alpha(theme.palette.primary.main, 0.04)
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 'unset !important', mr: 1.5 }}>
                  {getIcon(notification.type, notification.severity)}
                </ListItemIcon>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>
                    {notification.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 280,
                    }}
                  >
                    {notification.message}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                    {formatTime(notification.created_at)}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1 }}>
              <Button
                size="small"
                fullWidth
                variant="outlined"
                onClick={handleMarkAllRead}
                sx={{ textTransform: 'none' }}
              >
                Mark All Read
              </Button>
              {/* TODO: Add settings button */}
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};
