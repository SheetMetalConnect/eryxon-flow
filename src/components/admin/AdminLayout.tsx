import React, { useState } from "react";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  alpha,
  useTheme,
  Container,
  Chip,
  Button,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ListAlt as ListAltIcon,
  Work as WorkIcon,
  Inventory as InventoryIcon,
  ReportProblem as ReportProblemIcon,
  AssignmentTurnedIn as AssignmentIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Upgrade as UpgradeIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
  MenuBook as MenuBookIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  ViewInAr as ViewInArIcon,
  Build as BuildIcon,
  VpnKey as VpnKeyIcon,
  Webhook as WebhookIcon,
  Archive as ArchiveIcon,
  AttachMoney as AttachMoneyIcon,
  Speed as SpeedIcon,
} from "@mui/icons-material";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeMode } from "@/theme/ThemeProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AppTour } from "@/components/onboarding";
import { useSubscription } from "@/hooks/useSubscription";
import { GlobalSearch } from "@/components/GlobalSearch";
import { QuickCreateMenu } from "@/components/QuickCreateMenu";
import { NotificationsCenter } from "@/components/NotificationsCenter";
import { useTranslation } from "react-i18next";

const DRAWER_WIDTH = 260;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const { subscription, getPlanDisplayName, canUpgrade } = useSubscription();
  const theme = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

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

  const isActive = (path: string) => location.pathname === path;

  // Keyboard shortcut for global search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navSections = [
    {
      title: t("navigation.sections.overview"),
      items: [
        {
          path: "/dashboard",
          label: t("navigation.dashboard"),
          icon: <DashboardIcon />,
        },
        {
          path: "/work-queue",
          label: t("navigation.workQueue"),
          icon: <ListAltIcon />,
        },
        {
          path: "/operator-view",
          label: "Operator View",
          icon: <SpeedIcon />,
        },
      ],
    },
    {
      title: t("navigation.sections.operations"),
      items: [
        {
          path: "/admin/assignments",
          label: t("navigation.assignments"),
          icon: <AssignmentIcon />,
        },
        {
          path: "/admin/issues",
          label: t("navigation.issues"),
          icon: <ReportProblemIcon />,
          badge: true,
        },
        {
          path: "/admin/activity",
          label: t("navigation.activityMonitor"),
          icon: <TimelineIcon />,
        },
      ],
    },
    {
      title: t("navigation.sections.data"),
      items: [
        {
          path: "/admin/jobs",
          label: t("navigation.jobs"),
          icon: <WorkIcon />,
        },
        {
          path: "/admin/parts",
          label: t("navigation.parts"),
          icon: <InventoryIcon />,
        },
        {
          path: "/admin/operations",
          label: t("navigation.operations"),
          icon: <CheckCircleIcon />,
        },
      ],
    },
    {
      title: t("navigation.configuration"),
      items: [
        {
          path: "/admin/users",
          label: t("navigation.users"),
          icon: <PeopleIcon />,
        },
        {
          path: "/admin/stages",
          label: t("navigation.stages"),
          icon: <ViewInArIcon />,
        },
        {
          path: "/admin/materials",
          label: t("materials.title"),
          icon: <InventoryIcon />,
        },
        {
          path: "/admin/resources",
          label: t("resources.title"),
          icon: <BuildIcon />,
        },
        {
          path: "/admin/config/steps-templates",
          label: t("Steps & Templates"),
          icon: <CheckCircleIcon />,
        },
        {
          path: "/admin/config/api-keys",
          label: t("navigation.apiKeys"),
          icon: <VpnKeyIcon />,
        },
        {
          path: "/admin/config/webhooks",
          label: t("navigation.webhooks"),
          icon: <WebhookIcon />,
        },
        {
          path: "/admin/data-export",
          label: t("dataExport.title"),
          icon: <ArchiveIcon />,
        },
      ],
    },
  ];

  const bottomNavItems = [
    {
      path: "/pricing",
      label: t("navigation.pricing"),
      icon: <AttachMoneyIcon />,
    },
    {
      path: "/api-docs",
      label: t("navigation.docsAndHelp"),
      icon: <MenuBookIcon />,
    },
    {
      path: "/admin/settings",
      label: t("navigation.settings"),
      icon: <SettingsIcon />,
    },
  ];

  const drawer = (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: "100%" }}
      data-tour="sidebar"
    >
      {/* Logo Section */}
      <Box
        sx={{
          p: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          background: "linear-gradient(135deg, #3a4656 0%, #0080ff 100%)",
          color: "#ffffff",
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 1.5,
            background: alpha("#ffffff", 0.2),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "1.25rem",
          }}
        >
          SM
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: "1rem" }}
          >
            {t("app.name")}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            {t("app.adminPortal")}
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Navigation Items */}
      <List sx={{ flexGrow: 1, px: 1.5, py: 2 }}>
        {navSections.map((section, sectionIndex) => (
          <Box key={section.title}>
            {sectionIndex > 0 && <Divider sx={{ my: 2 }} />}

            <Typography
              variant="caption"
              sx={{
                px: 2,
                py: 1,
                display: "block",
                fontWeight: 600,
                color: "text.secondary",
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {section.title}
            </Typography>

            {section.items.map((item) => (
              <ListItem
                key={item.path}
                disablePadding
                sx={{ mb: 0.5 }}
                data-tour={item.path === "/admin/jobs" ? "jobs-nav" : undefined}
              >
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={isActive(item.path)}
                  sx={{
                    borderRadius: 1.5,
                    py: 1.25,
                    "&.Mui-selected": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      color: theme.palette.primary.main,
                      "& .MuiListItemIcon-root": {
                        color: theme.palette.primary.main,
                      },
                      "&:hover": {
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.18,
                        ),
                      },
                    },
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.action.hover, 0.08),
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive(item.path) ? 600 : 500,
                      fontSize: "0.95rem",
                    }}
                  />
                  {/* TODO: Add badge count for issues */}
                </ListItemButton>
              </ListItem>
            ))}
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />

        {/* Bottom Navigation Items */}
        {bottomNavItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={isActive(item.path)}
              sx={{
                borderRadius: 1.5,
                py: 1.25,
                "&.Mui-selected": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                  "& .MuiListItemIcon-root": {
                    color: theme.palette.primary.main,
                  },
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.18),
                  },
                },
                "&:hover": {
                  backgroundColor: alpha(theme.palette.action.hover, 0.08),
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: isActive(item.path) ? 600 : 500,
                  fontSize: "0.95rem",
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          {/* Mobile Menu Button */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Search Button - Mobile */}
          <IconButton
            color="inherit"
            onClick={() => setSearchOpen(true)}
            sx={{ display: { md: "none" }, mr: 1 }}
          >
            <SearchIcon />
          </IconButton>

          {/* Page Title - Dynamic based on location */}
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ fontWeight: 600, flexGrow: 1 }}
          >
            {location.pathname === "/dashboard" && t("navigation.dashboard")}
            {location.pathname === "/work-queue" && t("navigation.workQueue")}
            {location.pathname === "/operator-view" && "Operator View"}
            {location.pathname.startsWith("/admin/jobs") &&
              t("navigation.jobsManagement")}
            {location.pathname.startsWith("/admin/parts") &&
              t("navigation.partsManagement")}
            {location.pathname.startsWith("/admin/operations") &&
              t("navigation.operations")}
            {location.pathname.startsWith("/admin/issues") &&
              t("navigation.issueQueue")}
            {location.pathname.startsWith("/admin/assignments") &&
              t("navigation.operatorAssignments")}
            {location.pathname.startsWith("/admin/activity") &&
              t("navigation.activityMonitor")}
            {location.pathname === "/admin/users" && t("navigation.users")}
            {location.pathname === "/admin/stages" && t("navigation.stages")}
            {location.pathname === "/admin/materials" && t("materials.title")}
            {location.pathname === "/admin/resources" && t("resources.title")}
            {location.pathname === "/admin/data-export" &&
              t("dataExport.title")}
            {location.pathname.startsWith("/admin/config") &&
              t("navigation.configuration")}
            {location.pathname.startsWith("/admin/settings") &&
              t("navigation.settings")}
            {location.pathname === "/api-docs" &&
              t("navigation.apiDocumentation")}
            {location.pathname === "/pricing" && t("navigation.pricing")}
            {location.pathname === "/my-plan" && t("navigation.myPlan")}
            {location.pathname === "/help" && t("navigation.help")}
          </Typography>

          {/* Right Side Actions */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Global Search - Desktop */}
            <IconButton
              color="inherit"
              onClick={() => setSearchOpen(true)}
              sx={{ display: { xs: "none", md: "inline-flex" } }}
              title="Search (Cmd+K)"
            >
              <SearchIcon />
            </IconButton>

            {/* Quick Create Menu */}
            <QuickCreateMenu color="inherit" />

            {/* Notifications Center */}
            <NotificationsCenter color="inherit" />

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Theme Toggle */}
            <IconButton onClick={toggleTheme} color="inherit">
              {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>

            {/* User Menu */}
            <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  backgroundColor: theme.palette.primary.main,
                  fontWeight: 600,
                  fontSize: "0.95rem",
                }}
              >
                {profile?.full_name?.charAt(0).toUpperCase() || "A"}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              PaperProps={{
                elevation: 3,
                sx: {
                  mt: 1.5,
                  minWidth: 260,
                  borderRadius: 2,
                },
              }}
            >
              {/* User Info Section */}
              <Box
                sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {profile?.full_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {profile?.email}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    mt: 0.5,
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: 0.5,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontSize: "0.65rem",
                      width: "fit-content",
                    }}
                  >
                    Admin
                  </Typography>
                </Box>
              </Box>

              {/* Current Plan Section */}
              {subscription && (
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 0.5 }}
                  >
                    Current Plan
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Chip
                      label={getPlanDisplayName(subscription.plan)}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        background:
                          subscription.plan === "premium"
                            ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                            : subscription.plan === "pro"
                              ? "#8b5cf6"
                              : "#64748b",
                        color: "#fff",
                      }}
                    />
                  </Box>
                  {canUpgrade && (
                    <Button
                      component={Link}
                      to="/my-plan"
                      onClick={handleMenuClose}
                      variant="outlined"
                      size="small"
                      fullWidth
                      startIcon={<UpgradeIcon />}
                      sx={{
                        mt: 1,
                        textTransform: "none",
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.main,
                        "&:hover": {
                          backgroundColor: alpha(
                            theme.palette.primary.main,
                            0.08,
                          ),
                          borderColor: theme.palette.primary.dark,
                        },
                      }}
                    >
                      Upgrade Plan
                    </Button>
                  )}
                </Box>
              )}

              {/* Menu Actions */}
              <MenuItem
                component={Link}
                to="/my-plan"
                onClick={handleMenuClose}
                sx={{ gap: 1.5, py: 1.5 }}
              >
                <AttachMoneyIcon fontSize="small" />
                My Plan
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleSignOut} sx={{ gap: 1.5, py: 1.5 }}>
                <LogoutIcon fontSize="small" />
                Sign Out
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar /> {/* Spacer for fixed AppBar */}
        <Container
          maxWidth="xl"
          sx={{
            py: { xs: 2, md: 4 },
            px: { xs: 2, md: 3 },
          }}
        >
          {children}
        </Container>
      </Box>

      {/* Onboarding Tour - only show if not completed */}
      {profile && !(profile as any).tour_completed && (
        <AppTour userRole="admin" />
      )}

      {/* Global Search Dialog */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </Box>
  );
};
