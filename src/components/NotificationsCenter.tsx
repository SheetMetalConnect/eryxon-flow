import React, { useState } from 'react';
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
  Tooltip,
  Chip,
  Stack,
  CircularProgress,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  ReportProblem as ReportProblemIcon,
  Work as WorkIcon,
  AssignmentTurnedIn as AssignmentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Inventory as InventoryIcon,
  PersonAdd as PersonAddIcon,
  PushPin as PushPinIcon,
  PushPinOutlined as PushPinOutlinedIcon,
  Close as CloseIcon,
  Circle as CircleIcon,
  Info as InfoIcon,
  DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { Database } from '@/integrations/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];

interface NotificationsCenterProps {
  color?: 'inherit' | 'primary' | 'secondary' | 'default';
}

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({ color = 'inherit' }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentTab, setCurrentTab] = useState<'all' | 'pinned'>('all');
  const navigate = useNavigate();
  const theme = useTheme();
  const open = Boolean(anchorEl);

  const {
    notifications,
    loading,
    unreadCount,
    pinnedNotifications,
    unpinnedNotifications,
    markAsRead,
    togglePin,
    dismiss,
    markAllAsRead,
  } = useNotifications();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate if link exists
    if (notification.link) {
      navigate(notification.link);
    }

    handleClose();
  };

  const handleTogglePin = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await togglePin(notificationId);
  };

  const handleDismiss = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await dismiss(notificationId);
  };

  const handleMarkAsRead = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await markAsRead(notificationId);
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
      case 'new_part':
      case 'part_completed':
        return <InventoryIcon {...iconProps} />;
      case 'new_user':
        return <PersonAddIcon {...iconProps} />;
      case 'system':
        return <InfoIcon {...iconProps} />;
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

  const getSeverityChip = (severity: string) => {
    const colors = {
      high: '#EF4444',
      medium: '#F59E0B',
      low: '#10B981',
    };

    return (
      <Chip
        label={severity.toUpperCase()}
        size="small"
        sx={{
          height: 20,
          fontSize: '0.7rem',
          fontWeight: 600,
          backgroundColor: alpha(colors[severity as keyof typeof colors] || colors.low, 0.1),
          color: colors[severity as keyof typeof colors] || colors.low,
          border: `1px solid ${alpha(colors[severity as keyof typeof colors] || colors.low, 0.3)}`,
        }}
      />
    );
  };

  const renderNotificationItem = (notification: Notification) => (
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
        position: 'relative',
      }}
    >
      <ListItemIcon sx={{ minWidth: 'unset !important', mr: 1.5 }}>
        {getIcon(notification.type, notification.severity)}
      </ListItemIcon>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ flexGrow: 1 }}>
            {notification.title}
          </Typography>
          {getSeverityChip(notification.severity)}
        </Stack>

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

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.disabled">
            {formatTime(notification.created_at)}
          </Typography>
          {notification.pinned && (
            <Chip
              icon={<PushPinIcon sx={{ fontSize: 12 }} />}
              label="Pinned"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                '& .MuiChip-icon': { ml: 0.5 },
              }}
            />
          )}
        </Stack>
      </Box>

      {/* Action buttons */}
      <Stack direction="row" spacing={0.5} sx={{ ml: 1 }}>
        {!notification.read && (
          <Tooltip title="Mark as read">
            <IconButton
              size="small"
              onClick={(e) => handleMarkAsRead(e, notification.id)}
              sx={{ width: 28, height: 28 }}
            >
              <CircleIcon sx={{ fontSize: 8, color: theme.palette.primary.main }} />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title={notification.pinned ? 'Unpin' : 'Pin'}>
          <IconButton
            size="small"
            onClick={(e) => handleTogglePin(e, notification.id)}
            sx={{ width: 28, height: 28 }}
          >
            {notification.pinned ? (
              <PushPinIcon sx={{ fontSize: 16 }} />
            ) : (
              <PushPinOutlinedIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title="Dismiss">
          <IconButton
            size="small"
            onClick={(e) => handleDismiss(e, notification.id)}
            sx={{ width: 28, height: 28 }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </MenuItem>
  );

  const displayNotifications = currentTab === 'pinned'
    ? pinnedNotifications
    : [...pinnedNotifications, ...unpinnedNotifications];

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
            minWidth: 420,
            maxWidth: 480,
            maxHeight: 600,
            borderRadius: 2,
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" fontWeight={600}>
              Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
            </Typography>
            {unreadCount > 0 && (
              <Tooltip title="Mark all as read">
                <IconButton size="small" onClick={markAllAsRead}>
                  <DoneAllIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          {/* Tabs */}
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => setCurrentTab(newValue)}
            sx={{ mt: 1, minHeight: 36 }}
          >
            <Tab
              label={`All (${notifications.length})`}
              value="all"
              sx={{ minHeight: 36, py: 0.5, textTransform: 'none' }}
            />
            <Tab
              label={`Pinned (${pinnedNotifications.length})`}
              value="pinned"
              sx={{ minHeight: 36, py: 0.5, textTransform: 'none' }}
            />
          </Tabs>
        </Box>

        {/* Notifications List */}
        <Box sx={{ maxHeight: 450, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading notifications...
              </Typography>
            </Box>
          ) : displayNotifications.length === 0 ? (
            <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                {currentTab === 'pinned' ? "No pinned notifications" : "You're all caught up!"}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {currentTab === 'pinned' ? "Pin important notifications to see them here" : "No new notifications"}
              </Typography>
            </Box>
          ) : (
            displayNotifications.map(renderNotificationItem)
          )}
        </Box>

        {/* Footer */}
        {displayNotifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ px: 2, py: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.disabled">
                Use the pin icon to keep important notifications at the top
              </Typography>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};
