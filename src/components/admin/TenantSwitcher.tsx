import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  CircularProgress,
  Chip,
  alpha,
  useTheme,
  IconButton,
} from "@mui/material";
import {
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Tenant {
  id: string;
  name: string;
  company_name: string | null;
  plan: "free" | "pro" | "premium";
  status: "active" | "cancelled" | "suspended" | "trial";
  user_count: number;
  created_at: string;
}

interface TenantSwitcherProps {
  open: boolean;
  onClose: () => void;
}

export const TenantSwitcher: React.FC<TenantSwitcherProps> = ({
  open,
  onClose,
}) => {
  const theme = useTheme();
  const { profile, tenant, switchTenant } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (open && profile?.is_root_admin) {
      loadTenants();
    }
  }, [open, profile?.is_root_admin]);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_all_tenants");

      if (error) throw error;

      setTenants(data || []);
    } catch (error) {
      console.error("Error loading tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchTenant = async (tenantId: string) => {
    if (switching) return;

    setSwitching(true);
    try {
      await switchTenant(tenantId);
      onClose();
    } catch (error) {
      console.error("Error switching tenant:", error);
      setSwitching(false);
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "premium":
        return "#764ba2";
      case "pro":
        return "#8b5cf6";
      default:
        return "#64748b";
    }
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case "premium":
        return "Premium";
      case "pro":
        return "Pro";
      default:
        return "Free";
    }
  };

  if (!profile?.is_root_admin) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BusinessIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Switch Tenant
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Select a tenant to switch context. All data will be filtered to the
          selected tenant.
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 4,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {tenants.map((t) => {
              const isActive = t.id === tenant?.id;
              return (
                <ListItem key={t.id} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => handleSwitchTenant(t.id)}
                    disabled={switching}
                    sx={{
                      borderRadius: 1.5,
                      border: 1,
                      borderColor: isActive
                        ? theme.palette.primary.main
                        : "divider",
                      backgroundColor: isActive
                        ? alpha(theme.palette.primary.main, 0.05)
                        : "transparent",
                      "&:hover": {
                        backgroundColor: isActive
                          ? alpha(theme.palette.primary.main, 0.08)
                          : alpha(theme.palette.action.hover, 0.04),
                      },
                    }}
                  >
                    <ListItemIcon>
                      <BusinessIcon
                        sx={{
                          color: isActive
                            ? theme.palette.primary.main
                            : "text.secondary",
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Typography
                            variant="body1"
                            fontWeight={isActive ? 600 : 500}
                          >
                            {t.company_name || t.name}
                          </Typography>
                          {isActive && (
                            <CheckCircleIcon
                              fontSize="small"
                              sx={{ color: theme.palette.primary.main }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                          <Chip
                            label={getPlanLabel(t.plan)}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              backgroundColor: getPlanColor(t.plan),
                              color: "#fff",
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {t.user_count} user{t.user_count !== 1 ? "s" : ""}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t.status}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};
