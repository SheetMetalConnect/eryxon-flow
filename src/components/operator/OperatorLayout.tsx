import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ListAlt as ListAltIcon,
  Schedule as ScheduleIcon,
  ReportProblem as ReportProblemIcon,
  Logout as LogoutIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/theme/ThemeProvider';
import CurrentlyTimingWidget from './CurrentlyTimingWidget';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AppTour } from '@/components/onboarding';

interface OperatorLayoutProps {
  children: React.ReactNode;
}

export const OperatorLayout: React.FC<OperatorLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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

  const navItems = [
    { path: '/work-queue', label: t('navigation.workQueue'), icon: <ListAltIcon /> },
    { path: '/my-activity', label: t('navigation.myActivity'), icon: <ScheduleIcon /> },
    { path: '/my-issues', label: t('navigation.myIssues'), icon: <ReportProblemIcon /> },
  ];

  const getCurrentNavValue = () => {
    const currentItem = navItems.find((item) => location.pathname === item.path);
    return currentItem?.path || '/work-queue';
  };

  const handleNavigationChange = (_event: React.SyntheticEvent, newValue: string) => {
    navigate(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top App Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar
          sx={{
            justifyContent: 'space-between',
            minHeight: { xs: 56, sm: 64 },
            px: { xs: 2, sm: 3 },
          }}
        >
          {/* Logo/Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                background: 'linear-gradient(135deg, #6658A3 0%, #47B5E2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem',
                color: '#ffffff',
              }}
            >
              SM
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {t('app.name')}
              </Typography>
            </Box>
          </Box>

          {/* Right Side Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Theme Toggle */}
            <IconButton onClick={toggleTheme} color="inherit">
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>

            {/* User Avatar and Menu */}
            <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: 'linear-gradient(135deg, #6658A3 0%, #47B5E2 100%)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                {profile?.full_name?.charAt(0).toUpperCase() || 'O'}
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
                  {profile?.full_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {profile?.email}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.5,
                    px: 1,
                    py: 0.25,
                    borderRadius: 0.5,
                    background: 'linear-gradient(135deg, #6658A3 0%, #47B5E2 100%)',
                    color: '#ffffff',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.65rem',
                    width: 'fit-content',
                  }}
                >
                  {t('app.operator')}
                </Typography>
              </Box>
              <MenuItem onClick={handleSignOut} sx={{ gap: 1.5, py: 1.5 }}>
                <LogoutIcon fontSize="small" />
                {t('auth.signOut')}
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Currently Timing Widget - Sticky below header */}
      <Box
        sx={{
          position: 'sticky',
          top: { xs: 56, sm: 64 },
          zIndex: theme.zIndex.appBar - 1,
          backgroundColor: theme.palette.background.default,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
          <CurrentlyTimingWidget />
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
          pb: { xs: 10, sm: 3 }, // Extra padding for mobile bottom nav
        }}
      >
        {children}
      </Box>

      {/* Bottom Navigation - Mobile Only */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: { xs: 'block', sm: 'none' },
          zIndex: theme.zIndex.appBar,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
        elevation={3}
        data-tour="bottom-nav"
      >
        <BottomNavigation
          value={getCurrentNavValue()}
          onChange={handleNavigationChange}
          showLabels
          sx={{
            height: 64,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              padding: '6px 12px',
              '&.Mui-selected': {
                color: theme.palette.primary.main,
              },
            },
          }}
        >
          {navItems.map((item) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              value={item.path}
              icon={item.icon}
            />
          ))}
        </BottomNavigation>
      </Paper>

      {/* Desktop Navigation Tabs - Hidden on mobile */}
      <Box
        sx={{
          display: { xs: 'none', sm: 'block' },
          position: 'sticky',
          top: { sm: 64 },
          zIndex: theme.zIndex.appBar - 2,
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            px: 3,
            py: 1,
          }}
        >
          {navItems.map((item) => (
            <Box
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2.5,
                py: 1.25,
                borderRadius: 1.5,
                cursor: 'pointer',
                backgroundColor:
                  location.pathname === item.path
                    ? alpha(theme.palette.primary.main, 0.12)
                    : 'transparent',
                color:
                  location.pathname === item.path
                    ? theme.palette.primary.main
                    : theme.palette.text.primary,
                fontWeight: location.pathname === item.path ? 600 : 500,
                fontSize: '0.95rem',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor:
                    location.pathname === item.path
                      ? alpha(theme.palette.primary.main, 0.18)
                      : alpha(theme.palette.action.hover, 0.08),
                },
              }}
            >
              {React.cloneElement(item.icon, { fontSize: 'small' })}
              {item.label}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Onboarding Tour - only show if not completed */}
      {profile && !profile.tour_completed && <AppTour userRole="operator" />}
    </Box>
  );
};
