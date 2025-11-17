import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  FormControl,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Button,
  IconButton,
  alpha,
  useTheme,
  CircularProgress,
  Tooltip,
  Stack,
  Badge,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  GetApp as GetAppIcon,
  FiberManualRecord as FiberManualRecordIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  CloudDownload as CloudDownloadIcon,
  CloudUpload as CloudUploadIcon,
  Work as WorkIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckCircleIcon,
  People as PeopleIcon,
  ViewInAr as ViewInArIcon,
  Build as BuildIcon,
  Filter1 as FilterIcon,
} from '@mui/icons-material';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  user_email: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  description: string;
  changes: any;
  metadata: any;
  created_at: string;
}

interface ActivityStats {
  total_activities: number;
  unique_users: number;
  activities_by_action: any;
  activities_by_entity: any;
}

export const ActivityMonitor: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntityType, setFilterEntityType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [limit, setLimit] = useState(50);
  const theme = useTheme();
  const { profile } = useAuth();

  // Load activity data
  const loadData = useCallback(async () => {
    if (!profile) return;

    try {
      // Get activity logs with filters
      const { data: activityData, error: activityError } = await supabase.rpc('get_activity_logs', {
        p_limit: limit,
        p_offset: 0,
        p_action: filterAction === 'all' ? null : filterAction,
        p_entity_type: filterEntityType === 'all' ? null : filterEntityType,
        p_search: searchQuery || null,
      });

      if (activityError) {
        console.error('Error loading activities:', activityError);
      } else {
        setActivities(activityData || []);
      }

      // Get activity statistics
      const { data: statsData, error: statsError } = await supabase.rpc('get_activity_stats', {
        p_start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: new Date().toISOString(),
      });

      if (statsError) {
        console.error('Error loading stats:', statsError);
      } else if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error loading activity data:', error);
      setLoading(false);
    }
  }, [profile, filterAction, filterEntityType, searchQuery, limit]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadData();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Real-time subscription
  useEffect(() => {
    if (!profile) return;

    // Subscribe to activity log changes
    const channel = supabase
      .channel('activity_log_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_log',
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        (payload) => {
          console.log('Real-time activity update:', payload);
          // Reload data when changes occur
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, loadData]);

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <AddIcon fontSize="small" />;
      case 'update':
        return <EditIcon fontSize="small" />;
      case 'delete':
        return <DeleteIcon fontSize="small" />;
      case 'login':
        return <LoginIcon fontSize="small" />;
      case 'logout':
        return <LogoutIcon fontSize="small" />;
      case 'view':
        return <VisibilityIcon fontSize="small" />;
      case 'configure':
        return <SettingsIcon fontSize="small" />;
      case 'export':
        return <CloudDownloadIcon fontSize="small" />;
      case 'import':
        return <CloudUploadIcon fontSize="small" />;
      default:
        return <FiberManualRecordIcon fontSize="small" />;
    }
  };

  // Get action color
  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return '#10B981'; // Green
      case 'update':
        return '#3B82F6'; // Blue
      case 'delete':
        return '#EF4444'; // Red
      case 'login':
        return '#8B5CF6'; // Purple
      case 'logout':
        return '#6B7280'; // Gray
      case 'view':
        return '#06B6D4'; // Cyan
      case 'configure':
        return '#F59E0B'; // Orange
      case 'export':
      case 'import':
        return '#EC4899'; // Pink
      default:
        return '#9CA3AF'; // Light Gray
    }
  };

  // Get entity icon
  const getEntityIcon = (entityType: string | null) => {
    switch (entityType) {
      case 'job':
        return <WorkIcon fontSize="small" />;
      case 'part':
        return <InventoryIcon fontSize="small" />;
      case 'operation':
        return <CheckCircleIcon fontSize="small" />;
      case 'user':
        return <PeopleIcon fontSize="small" />;
      case 'stage':
        return <ViewInArIcon fontSize="small" />;
      case 'material':
      case 'resource':
        return <BuildIcon fontSize="small" />;
      default:
        return <TimelineIcon fontSize="small" />;
    }
  };

  // Get user initials
  const getUserInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  // Export activity log
  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity', 'Description'].join(','),
      ...activities.map((a) =>
        [
          new Date(a.created_at).toISOString(),
          a.user_name || a.user_email,
          a.action,
          a.entity_type || '-',
          a.entity_name || '-',
          `"${a.description || '-'}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get unique actions and entity types for filters
  const uniqueActions = Array.from(new Set(activities.map((a) => a.action).filter(Boolean)));
  const uniqueEntityTypes = Array.from(new Set(activities.map((a) => a.entity_type).filter(Boolean)));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <TimelineIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Activity Monitor
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time platform activity feed with comprehensive audit trail
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                    <TimelineIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.total_activities || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Activities (24h)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: alpha('#10B981', 0.1), color: '#10B981' }}>
                    <PeopleIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.unique_users || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Users (24h)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: alpha('#3B82F6', 0.1), color: '#3B82F6' }}>
                    <AddIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.activities_by_action?.create || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Created (24h)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: alpha('#F59E0B', 0.1), color: '#F59E0B' }}>
                    <EditIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.activities_by_action?.update || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Updated (24h)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters and Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <Select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
                <MenuItem value="all">All Actions</MenuItem>
                {uniqueActions.map((action) => (
                  <MenuItem key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <Select value={filterEntityType} onChange={(e) => setFilterEntityType(e.target.value)}>
                <MenuItem value="all">All Entities</MenuItem>
                {uniqueEntityTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <Select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                <MenuItem value={25}>Last 25</MenuItem>
                <MenuItem value={50}>Last 50</MenuItem>
                <MenuItem value={100}>Last 100</MenuItem>
                <MenuItem value={200}>Last 200</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <FormControlLabel
                control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
                label="Auto-refresh"
              />
              <IconButton onClick={loadData} color="primary" size="small">
                <RefreshIcon />
              </IconButton>
              <IconButton onClick={handleExport} color="primary" size="small">
                <GetAppIcon />
              </IconButton>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Activity Feed */}
      <Paper sx={{ p: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={600}>
            Recent Activity
            <Chip
              label={`${activities.length} events`}
              size="small"
              sx={{ ml: 2 }}
              color="primary"
              variant="outlined"
            />
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Last updated: {lastUpdate.toLocaleTimeString()}
            {autoRefresh && ' (auto-refreshing every 10s)'}
          </Typography>
        </Box>

        <List sx={{ p: 0 }}>
          {activities.length === 0 ? (
            <ListItem sx={{ py: 8 }}>
              <ListItemText
                primary={
                  <Typography variant="body1" color="text.secondary" align="center">
                    No activities found
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                    Try adjusting your filters or search query
                  </Typography>
                }
              />
            </ListItem>
          ) : (
            activities.map((activity, index) => (
              <React.Fragment key={activity.id}>
                <ListItem
                  sx={{
                    py: 2,
                    px: 3,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.action.hover, 0.04),
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        <Avatar
                          sx={{
                            width: 20,
                            height: 20,
                            bgcolor: getActionColor(activity.action),
                            border: `2px solid ${theme.palette.background.paper}`,
                          }}
                        >
                          {getActionIcon(activity.action)}
                        </Avatar>
                      }
                    >
                      <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                        {getUserInitials(activity.user_name, activity.user_email)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {activity.user_name || activity.user_email}
                        </Typography>
                        <Chip
                          label={activity.action}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            bgcolor: alpha(getActionColor(activity.action), 0.1),
                            color: getActionColor(activity.action),
                          }}
                        />
                        {activity.entity_type && (
                          <Chip
                            icon={getEntityIcon(activity.entity_type)}
                            label={activity.entity_type}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                            }}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                          {activity.description}
                        </Typography>
                        {activity.entity_name && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {activity.entity_type}: <strong>{activity.entity_name}</strong>
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < activities.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))
          )}
        </List>

        {/* Load More */}
        {activities.length >= limit && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Button onClick={() => setLimit(limit + 50)} variant="outlined">
              Load More
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
