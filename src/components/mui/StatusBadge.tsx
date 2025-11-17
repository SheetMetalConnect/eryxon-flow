import React from 'react';
import { Chip, ChipProps, alpha, useTheme } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  HourglassEmpty as HourglassIcon,
  Block as BlockIcon,
} from '@mui/icons-material';

export type StatusType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'pending'
  | 'active'
  | 'completed'
  | 'on-hold'
  | 'cancelled'
  | 'high'
  | 'medium'
  | 'low'
  | 'critical';

export interface StatusBadgeProps extends Omit<ChipProps, 'color'> {
  status: StatusType;
  showIcon?: boolean;
}

const getStatusConfig = (status: StatusType, theme: any) => {
  const configs: Record<StatusType, { color: string; bgColor: string; icon?: React.ReactNode }> = {
    success: {
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.12),
      icon: <CheckCircleIcon />,
    },
    completed: {
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.12),
      icon: <CheckCircleIcon />,
    },
    error: {
      color: theme.palette.error.main,
      bgColor: alpha(theme.palette.error.main, 0.12),
      icon: <ErrorIcon />,
    },
    critical: {
      color: theme.palette.error.main,
      bgColor: alpha(theme.palette.error.main, 0.15),
      icon: <ErrorIcon />,
    },
    warning: {
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.12),
      icon: <WarningIcon />,
    },
    high: {
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.12),
      icon: <WarningIcon />,
    },
    info: {
      color: theme.palette.info.main,
      bgColor: alpha(theme.palette.info.main, 0.12),
      icon: <InfoIcon />,
    },
    medium: {
      color: theme.palette.info.main,
      bgColor: alpha(theme.palette.info.main, 0.12),
      icon: <InfoIcon />,
    },
    pending: {
      color: theme.palette.grey[600],
      bgColor: alpha(theme.palette.grey[600], 0.12),
      icon: <HourglassIcon />,
    },
    active: {
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.12),
      icon: <HourglassIcon />,
    },
    'on-hold': {
      color: '#ff7c3e', // Orange - manufacturing on-hold state
      bgColor: alpha('#ff7c3e', 0.12),
      icon: <BlockIcon />,
    },
    cancelled: {
      color: theme.palette.grey[500],
      bgColor: alpha(theme.palette.grey[500], 0.12),
      icon: <BlockIcon />,
    },
    low: {
      color: theme.palette.grey[500],
      bgColor: alpha(theme.palette.grey[500], 0.12),
      icon: <InfoIcon />,
    },
  };

  return configs[status] || configs.info;
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  label,
  size = 'small',
  ...props
}) => {
  const theme = useTheme();
  const config = getStatusConfig(status, theme);

  return (
    <Chip
      label={label || status.replace('-', ' ').toUpperCase()}
      size={size}
      icon={showIcon ? (config.icon as any) : undefined}
      sx={{
        color: config.color,
        backgroundColor: config.bgColor,
        fontWeight: 600,
        textTransform: 'capitalize',
        borderRadius: 1.5,
        '& .MuiChip-icon': {
          color: config.color,
        },
        ...props.sx,
      }}
      {...props}
    />
  );
};

// Priority Badge
export interface PriorityBadgeProps extends Omit<ChipProps, 'color'> {
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, ...props }) => {
  return <StatusBadge status={priority} label={priority} showIcon {...props} />;
};

// Severity Badge
export interface SeverityBadgeProps extends Omit<ChipProps, 'color'> {
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, ...props }) => {
  return <StatusBadge status={severity} label={severity} showIcon {...props} />;
};
