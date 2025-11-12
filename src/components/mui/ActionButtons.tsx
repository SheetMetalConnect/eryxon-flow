import React from 'react';
import {
  Button,
  ButtonProps,
  IconButton,
  IconButtonProps,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
} from '@mui/icons-material';

// Primary Action Button
export interface PrimaryButtonProps extends ButtonProps {
  loading?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  loading = false,
  children,
  disabled,
  ...props
}) => {
  return (
    <Button
      variant="contained"
      color="primary"
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : props.startIcon}
      {...props}
    >
      {children}
    </Button>
  );
};

// Secondary Action Button
export interface SecondaryButtonProps extends ButtonProps {
  loading?: boolean;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  loading = false,
  children,
  disabled,
  ...props
}) => {
  return (
    <Button
      variant="contained"
      color="secondary"
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : props.startIcon}
      {...props}
    >
      {children}
    </Button>
  );
};

// Outlined Button
export const OutlinedButton: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <Button variant="outlined" {...props}>
      {children}
    </Button>
  );
};

// Text Button
export const TextButton: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <Button variant="text" {...props}>
      {children}
    </Button>
  );
};

// Common Action Buttons
export const AddButton: React.FC<Omit<PrimaryButtonProps, 'startIcon'>> = (props) => {
  return (
    <PrimaryButton startIcon={<AddIcon />} {...props}>
      {props.children || 'Add'}
    </PrimaryButton>
  );
};

export const EditButton: React.FC<Omit<ButtonProps, 'startIcon'>> = (props) => {
  return (
    <OutlinedButton startIcon={<EditIcon />} color="primary" {...props}>
      {props.children || 'Edit'}
    </OutlinedButton>
  );
};

export const DeleteButton: React.FC<Omit<ButtonProps, 'startIcon'>> = (props) => {
  return (
    <OutlinedButton startIcon={<DeleteIcon />} color="error" {...props}>
      {props.children || 'Delete'}
    </OutlinedButton>
  );
};

export const SaveButton: React.FC<Omit<PrimaryButtonProps, 'startIcon'>> = (props) => {
  return (
    <PrimaryButton startIcon={<SaveIcon />} {...props}>
      {props.children || 'Save'}
    </PrimaryButton>
  );
};

export const CancelButton: React.FC<Omit<ButtonProps, 'startIcon'>> = (props) => {
  return (
    <OutlinedButton startIcon={<CloseIcon />} {...props}>
      {props.children || 'Cancel'}
    </OutlinedButton>
  );
};

export const ConfirmButton: React.FC<Omit<PrimaryButtonProps, 'startIcon'>> = (props) => {
  return (
    <PrimaryButton startIcon={<CheckIcon />} {...props}>
      {props.children || 'Confirm'}
    </PrimaryButton>
  );
};

export const RefreshButton: React.FC<Omit<ButtonProps, 'startIcon'>> = (props) => {
  return (
    <OutlinedButton startIcon={<RefreshIcon />} {...props}>
      {props.children || 'Refresh'}
    </OutlinedButton>
  );
};

export const DownloadButton: React.FC<Omit<ButtonProps, 'startIcon'>> = (props) => {
  return (
    <OutlinedButton startIcon={<DownloadIcon />} {...props}>
      {props.children || 'Download'}
    </OutlinedButton>
  );
};

export const UploadButton: React.FC<Omit<ButtonProps, 'startIcon'>> = (props) => {
  return (
    <OutlinedButton startIcon={<UploadIcon />} {...props}>
      {props.children || 'Upload'}
    </OutlinedButton>
  );
};

export const SearchButton: React.FC<Omit<ButtonProps, 'startIcon'>> = (props) => {
  return (
    <OutlinedButton startIcon={<SearchIcon />} {...props}>
      {props.children || 'Search'}
    </OutlinedButton>
  );
};

export const FilterButton: React.FC<Omit<ButtonProps, 'startIcon'>> = (props) => {
  return (
    <OutlinedButton startIcon={<FilterIcon />} {...props}>
      {props.children || 'Filter'}
    </OutlinedButton>
  );
};

// Icon Action Buttons with Tooltips
export interface ActionIconButtonProps extends IconButtonProps {
  tooltip: string;
  loading?: boolean;
}

export const ActionIconButton: React.FC<ActionIconButtonProps> = ({
  tooltip,
  loading = false,
  children,
  disabled,
  ...props
}) => {
  return (
    <Tooltip title={tooltip}>
      <span>
        <IconButton disabled={disabled || loading} {...props}>
          {loading ? <CircularProgress size={20} /> : children}
        </IconButton>
      </span>
    </Tooltip>
  );
};

// Specific Icon Buttons
export const EditIconButton: React.FC<Omit<ActionIconButtonProps, 'tooltip' | 'children'>> = (
  props
) => {
  return (
    <ActionIconButton tooltip="Edit" color="primary" {...props}>
      <EditIcon fontSize="small" />
    </ActionIconButton>
  );
};

export const DeleteIconButton: React.FC<Omit<ActionIconButtonProps, 'tooltip' | 'children'>> = (
  props
) => {
  return (
    <ActionIconButton tooltip="Delete" color="error" {...props}>
      <DeleteIcon fontSize="small" />
    </ActionIconButton>
  );
};

export const PlayIconButton: React.FC<Omit<ActionIconButtonProps, 'tooltip' | 'children'>> = (
  props
) => {
  return (
    <ActionIconButton tooltip="Start" color="success" {...props}>
      <PlayIcon />
    </ActionIconButton>
  );
};

export const PauseIconButton: React.FC<Omit<ActionIconButtonProps, 'tooltip' | 'children'>> = (
  props
) => {
  return (
    <ActionIconButton tooltip="Pause" color="warning" {...props}>
      <PauseIcon />
    </ActionIconButton>
  );
};

export const StopIconButton: React.FC<Omit<ActionIconButtonProps, 'tooltip' | 'children'>> = (
  props
) => {
  return (
    <ActionIconButton tooltip="Stop" color="error" {...props}>
      <StopIcon />
    </ActionIconButton>
  );
};
