import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Work as WorkIcon,
  Inventory as InventoryIcon,
  AssignmentTurnedIn as AssignmentIcon,
  ReportProblem as ReportProblemIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface QuickCreateMenuProps {
  color?: 'inherit' | 'primary' | 'secondary' | 'default';
}

export const QuickCreateMenu: React.FC<QuickCreateMenuProps> = ({ color = 'inherit' }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const menuItems = [
    {
      label: 'Job',
      icon: <WorkIcon fontSize="small" />,
      action: () => {
        navigate('/admin/jobs/new');
        handleClose();
      },
      shortcut: 'Cmd+N J',
    },
    {
      label: 'Part',
      icon: <InventoryIcon fontSize="small" />,
      action: () => {
        // TODO: Implement quick part creation modal
        navigate('/admin/parts');
        handleClose();
      },
      shortcut: 'Cmd+N P',
    },
    {
      label: 'Assignment',
      icon: <AssignmentIcon fontSize="small" />,
      action: () => {
        navigate('/admin/assignments');
        handleClose();
      },
      shortcut: '',
    },
    {
      label: 'Issue',
      icon: <ReportProblemIcon fontSize="small" />,
      action: () => {
        navigate('/admin/issues');
        handleClose();
      },
      shortcut: '',
    },
  ];

  return (
    <>
      <IconButton
        onClick={handleClick}
        color={color}
        sx={{
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
          },
        }}
        aria-label="Quick create"
        aria-controls={open ? 'quick-create-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <AddIcon />
      </IconButton>

      <Menu
        id="quick-create-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1.5,
            minWidth: 220,
            borderRadius: 2,
            '& .MuiMenuItem-root': {
              borderRadius: 1,
              mx: 0.5,
              my: 0.25,
            },
          },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            px: 2,
            py: 1,
            display: 'block',
            fontWeight: 600,
            color: 'text.secondary',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Create New
        </Typography>

        {menuItems.map((item) => (
          <MenuItem key={item.label} onClick={item.action} sx={{ gap: 1.5 }}>
            <ListItemIcon sx={{ minWidth: 'unset !important' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: 500,
                fontSize: '0.9rem',
              }}
            />
            {item.shortcut && (
              <Typography
                variant="caption"
                sx={{
                  ml: 'auto',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 0.5,
                  backgroundColor: alpha(theme.palette.text.primary, 0.06),
                  color: 'text.secondary',
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                }}
              >
                {item.shortcut}
              </Typography>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
