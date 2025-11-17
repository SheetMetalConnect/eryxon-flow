import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  useScrollTrigger,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ListAlt as ListAltIcon,
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  ReportProblem as ReportProblemIcon,
  AssignmentTurnedIn as AssignmentIcon,
  Description as DescriptionIcon,
  Work as WorkIcon,
  Inventory as InventoryIcon,
  Logout as LogoutIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/theme/ThemeProvider';

interface AppHeaderProps {
  // Optional props can be added here
}

export const AppHeader: React.FC<AppHeaderProps> = () => {
  const { profile, signOut } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Detect scroll for shadow effect
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
  });

  const isActive = (path: string) => location.pathname === path;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = () => {
    handleMenuClose();
    signOut();
  };

  // Admin navigation items
  const adminNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/work-queue', label: 'Work Queue', icon: <ListAltIcon /> },
    { path: '/admin/jobs', label: 'Jobs', icon: <WorkIcon /> },
    { path: '/admin/parts', label: 'Parts', icon: <InventoryIcon /> },
    { path: '/admin/issues', label: 'Issues', icon: <ReportProblemIcon /> },
    { path: '/admin/assignments', label: 'Assignments', icon: <AssignmentIcon /> },
    { path: '/admin/config/api-keys', label: 'API', icon: <SettingsIcon /> },
    { path: '/api-docs', label: 'API Docs', icon: <DescriptionIcon /> },
  ];

  // Operator navigation items
  const operatorNavItems = [
    { path: '/work-queue', label: 'Work Queue', icon: <ListAltIcon /> },
    { path: '/my-activity', label: 'My Activity', icon: <ScheduleIcon /> },
    { path: '/my-issues', label: 'My Issues', icon: <ReportProblemIcon /> },
    { path: '/api-docs', label: 'API Docs', icon: <DescriptionIcon /> },
  ];

  const navItems = profile?.role === 'admin' ? adminNavItems : operatorNavItems;

  if (!profile) {
    return null;
  }

  return (
    <AppBar
      position="sticky"
      sx={{
        background: 'linear-gradient(90deg, #3a4656 0%, #0080ff 100%)',
        boxShadow: trigger ? 4 : 0,
        transition: 'box-shadow 0.3s ease',
      }}
      enableColorOnDark
    >
      <Toolbar sx={{ py: 1 }}>
        {/* Logo and Brand */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mr: 4,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              background: alpha('#ffffff', 0.2),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.25rem',
              color: '#ffffff',
            }}
          >
            SM
          </Box>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.5px',
            }}
          >
            Sheet Metal Connect
          </Typography>
        </Box>

        {/* Navigation Links */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 0.5 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              component={Link as any}
              to={item.path}
              startIcon={item.icon}
              sx={{
                color: '#ffffff',
                textTransform: 'none',
                fontWeight: 500,
                px: 2,
                py: 1,
                borderRadius: 1,
                backgroundColor: isActive(item.path)
                  ? alpha('#ffffff', 0.15)
                  : 'transparent',
                '&:hover': {
                  backgroundColor: alpha('#ffffff', 0.25),
                },
                '& .MuiButton-startIcon': {
                  mr: 0.75,
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* User Profile Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Theme Toggle */}
          <IconButton
            onClick={toggleTheme}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: alpha('#ffffff', 0.15),
              },
            }}
          >
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>

          {/* User Info and Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: '#ffffff', lineHeight: 1.2 }}
              >
                {profile.full_name}
              </Typography>
              <Chip
                label={profile.role}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                  backgroundColor: alpha('#ffffff', 0.2),
                  color: '#ffffff',
                  mt: 0.5,
                }}
              />
            </Box>

            <IconButton
              onClick={handleMenuOpen}
              sx={{
                p: 0.5,
                '&:hover': {
                  backgroundColor: alpha('#ffffff', 0.15),
                },
              }}
            >
              <Avatar
                sx={{
                  width: 38,
                  height: 38,
                  backgroundColor: alpha('#ffffff', 0.3),
                  color: '#ffffff',
                  fontWeight: 600,
                }}
              >
                {profile.full_name?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                elevation: 3,
                sx: {
                  mt: 1.5,
                  minWidth: 200,
                  borderRadius: 2,
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="body2" fontWeight={600}>
                  {profile.full_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {profile.email}
                </Typography>
              </Box>
              <MenuItem onClick={handleSignOut} sx={{ gap: 1.5, py: 1.5 }}>
                <LogoutIcon fontSize="small" />
                Sign Out
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};